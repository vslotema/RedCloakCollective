<?php

namespace App\Http\Controllers;

use App\Models\Article;
use App\Models\Topic;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * The authenticated author-facing CRUD surface for articles — create, load for
 * editing, update, publish/unpublish and delete. The public, published-only
 * read side lives in Public\ArticleController.
 *
 * The body (`content`) is stored and returned as TipTap / ProseMirror JSON,
 * matching the Nuxt editor store's `doc`. "Published" is derived from the
 * nullable `published_at` timestamp; the API takes a `published` boolean.
 *
 * Drafts may be title-less (the editor creates one on the first autosave, before
 * anything is typed); a title is only required to publish.
 */
class ArticleController extends Controller
{
    /**
     * The current user's articles — drafts and published — newest edits first.
     * Summary fields only; `published` and `header_image_url` are appended.
     */
    public function index(Request $request)
    {
        return $request->user()->articles()
            ->with('topics:id,name,slug')
            ->latest('updated_at')
            ->get(['id', 'title', 'slug', 'excerpt', 'published_at', 'header_image_path', 'created_at', 'updated_at']);
    }

    /**
     * Load one of the current user's articles (draft or not) for editing.
     */
    public function show(Article $article)
    {
        Gate::authorize('view', $article);

        return $article->load('author:id,name,username', 'topics:id,name,slug');
    }

    public function store(Request $request)
    {
        $data = $request->validate($this->rules());

        $article = DB::transaction(function () use ($request, $data) {
            $article = $request->user()->articles()->create([
                'title' => $data['title'] ?? '',
                'slug' => $this->uniqueSlug($data['title'] ?? ''),
                'excerpt' => $data['excerpt'] ?? null,
                'content' => $data['content'],
                'header_image_position' => $data['header_image_position'] ?? null,
            ]);

            if (isset($data['topic_ids']) || isset($data['new_topics'])) {
                $article->topics()->sync($this->resolveTopicIds($data));
            }

            $this->applyPublishState($article, $data);
            $article->save();

            return $article;
        });

        return response()->json(
            $article->load('author:id,name,username', 'topics:id,name,slug'),
            201,
        );
    }

    public function update(Request $request, Article $article)
    {
        Gate::authorize('update', $article);

        $data = $request->validate($this->rules(partial: true));

        DB::transaction(function () use ($article, $data) {
            if (array_key_exists('title', $data)) {
                $article->title = $data['title'] ?? '';
            }
            if (array_key_exists('excerpt', $data)) {
                $article->excerpt = $data['excerpt'];
            }
            if (array_key_exists('content', $data)) {
                $article->content = $data['content'];
            }
            if (array_key_exists('header_image_position', $data)) {
                $article->header_image_position = $data['header_image_position'];
            }
            if (array_key_exists('topic_ids', $data) || array_key_exists('new_topics', $data)) {
                $article->topics()->sync($this->resolveTopicIds($data));
            }

            $this->applyPublishState($article, $data);
            $article->save();
        });

        return $article->load('author:id,name,username', 'topics:id,name,slug');
    }

    public function destroy(Article $article)
    {
        Gate::authorize('delete', $article);

        if ($article->header_image_path) {
            Storage::disk('public')->delete($article->header_image_path);
        }

        $article->delete();

        return response()->noContent();
    }

    /**
     * Replace the article's header (cover) image. Multipart, field `image`.
     */
    public function uploadHeaderImage(Request $request, Article $article)
    {
        Gate::authorize('update', $article);

        $request->validate(['image' => $this->imageRules()]);

        $previous = $article->header_image_path;
        $path = $request->file('image')->store('article-headers', 'public');

        $article->update(['header_image_path' => $path]);

        if ($previous && $previous !== $path) {
            Storage::disk('public')->delete($previous);
        }

        return $article->load('author:id,name,username');
    }

    /**
     * Remove the header image (file + column).
     */
    public function destroyHeaderImage(Article $article)
    {
        Gate::authorize('update', $article);

        if ($article->header_image_path) {
            Storage::disk('public')->delete($article->header_image_path);
            $article->update(['header_image_path' => null]);
        }

        return $article->load('author:id,name,username');
    }

    /**
     * Upload an inline body image. Multipart, field `image`. Returns just the
     * URL — the editor drops it into the doc JSON as an image node's `src`, so
     * there's no DB row to keep.
     */
    public function uploadBodyImage(Request $request, Article $article)
    {
        Gate::authorize('update', $article);

        $request->validate(['image' => $this->imageRules()]);

        $path = $request->file('image')->store('article-body', 'public');

        return response()->json(['url' => Storage::disk('public')->url($path)], 201);
    }

    /**
     * Validation for an uploaded image (header or inline body). SVG is left out
     * deliberately — it can carry script. 5 MB ceiling.
     *
     * @return array<int, string>
     */
    private function imageRules(): array
    {
        return ['required', 'image', 'mimes:jpeg,png,webp,gif,avif', 'max:5120'];
    }

    /** Max topics an article may carry. */
    private const MAX_TOPICS = 5;

    /**
     * @return array<string, array<int, string>>
     */
    private function rules(bool $partial = false): array
    {
        $titlePresence = $partial ? 'sometimes' : 'nullable';

        return [
            'title' => [$titlePresence, 'nullable', 'string', 'max:255'],
            'excerpt' => ['sometimes', 'nullable', 'string', 'max:280'],
            'content' => [$partial ? 'sometimes' : 'required', 'array'],
            'published' => ['sometimes', 'boolean'],
            // ISO datetime; a past value publishes immediately (clamped below).
            'publish_at' => ['sometimes', 'nullable', 'date'],
            'topic_ids' => ['sometimes', 'array', 'max:'.self::MAX_TOPICS],
            'topic_ids.*' => ['integer', 'exists:topics,id'],
            'new_topics' => ['sometimes', 'array', 'max:'.self::MAX_TOPICS],
            'new_topics.*' => ['string', 'min:2', 'max:50'],
            'header_image_position' => ['sometimes', 'nullable', 'array'],
            'header_image_position.x' => ['numeric', 'between:0,100'],
            'header_image_position.y' => ['numeric', 'between:0,100'],
        ];
    }

    /**
     * Merge selected topic ids with any author-created names (deduped by slug,
     * created with curated=false) and cap the total. Returns ids for sync().
     *
     * @param  array<string, mixed>  $data
     * @return array<int, int>
     */
    private function resolveTopicIds(array $data): array
    {
        $ids = collect($data['topic_ids'] ?? []);

        foreach ($data['new_topics'] ?? [] as $name) {
            $name = trim($name);
            if ($name === '') {
                continue;
            }
            $topic = Topic::firstOrCreate(
                ['slug' => Topic::slugFor($name)],
                ['name' => $name, 'curated' => false],
            );
            $ids->push($topic->id);
        }

        return $ids->unique()->take(self::MAX_TOPICS)->values()->all();
    }

    /**
     * Apply a publish / schedule / unpublish request to the (unsaved) article.
     * `publish_at` takes precedence over the `published` boolean.
     *
     * @param  array<string, mixed>  $data
     */
    private function applyPublishState(Article $article, array $data): void
    {
        if (array_key_exists('publish_at', $data)) {
            if ($data['publish_at'] === null) {
                $article->published_at = null;

                return;
            }

            $this->assertPublishable($article);
            $when = Carbon::parse($data['publish_at']);
            $article->published_at = $when->isPast() ? now() : $when;

            return;
        }

        if (! array_key_exists('published', $data)) {
            return;
        }

        if ($data['published']) {
            $this->assertPublishable($article);
            // Publishing stamps the time once; re-publishing keeps it.
            $article->published_at = $article->published_at ?? now();
        } else {
            // Unpublish also cancels a pending schedule.
            $article->published_at = null;
        }
    }

    /**
     * Guard the publish / schedule transition: a titled article with at least
     * one topic. Topics are already synced by the time this runs.
     */
    private function assertPublishable(Article $article): void
    {
        if (trim((string) $article->title) === '') {
            throw ValidationException::withMessages([
                'title' => 'Add a title before publishing.',
            ]);
        }

        if ($article->topics()->count() < 1) {
            throw ValidationException::withMessages([
                'topic_ids' => 'Add at least one topic before publishing.',
            ]);
        }
    }

    private function uniqueSlug(string $title): string
    {
        $base = Str::slug($title) ?: 'article';

        do {
            $slug = $base.'-'.Str::lower(Str::random(6));
        } while (Article::where('slug', $slug)->exists());

        return $slug;
    }
}
