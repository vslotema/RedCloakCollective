<?php

namespace App\Http\Controllers;

use App\Models\Article;
use Illuminate\Http\Request;
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
            ->latest('updated_at')
            ->get(['id', 'title', 'slug', 'published_at', 'header_image_path', 'created_at', 'updated_at']);
    }

    /**
     * Load one of the current user's articles (draft or not) for editing.
     */
    public function show(Article $article)
    {
        Gate::authorize('view', $article);

        return $article->load('author:id,name,username');
    }

    public function store(Request $request)
    {
        $data = $request->validate($this->rules());

        $title = $data['title'] ?? '';
        $published = $data['published'] ?? false;

        if ($published) {
            $this->assertPublishable($title);
        }

        $article = $request->user()->articles()->create([
            'title' => $title,
            'slug' => $this->uniqueSlug($title),
            'content' => $data['content'],
            'header_image_position' => $data['header_image_position'] ?? null,
            'published_at' => $published ? now() : null,
        ]);

        return response()->json($article->load('author:id,name,username'), 201);
    }

    public function update(Request $request, Article $article)
    {
        Gate::authorize('update', $article);

        $data = $request->validate($this->rules(partial: true));

        if (array_key_exists('title', $data)) {
            $article->title = $data['title'] ?? '';
        }
        if (array_key_exists('content', $data)) {
            $article->content = $data['content'];
        }
        if (array_key_exists('header_image_position', $data)) {
            $article->header_image_position = $data['header_image_position'];
        }
        if (array_key_exists('published', $data)) {
            if ($data['published']) {
                $this->assertPublishable($article->title);
            }

            // Publishing stamps the time once; unpublishing clears it. The slug
            // stays put so shared links keep working.
            $article->published_at = $data['published']
                ? ($article->published_at ?? now())
                : null;
        }

        $article->save();

        return $article->load('author:id,name,username');
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

        $request->validate([
            'image' => ['required', 'image', 'mimes:jpeg,png,webp', 'max:5120'],
        ]);

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

        $request->validate([
            'image' => ['required', 'image', 'mimes:jpeg,png,webp', 'max:5120'],
        ]);

        $path = $request->file('image')->store('article-body', 'public');

        return response()->json(['url' => Storage::disk('public')->url($path)], 201);
    }

    /**
     * @return array<string, array<int, string>>
     */
    private function rules(bool $partial = false): array
    {
        $titlePresence = $partial ? 'sometimes' : 'nullable';

        return [
            'title' => [$titlePresence, 'nullable', 'string', 'max:255'],
            'content' => [$partial ? 'sometimes' : 'required', 'array'],
            'published' => ['sometimes', 'boolean'],
            'header_image_position' => ['sometimes', 'nullable', 'array'],
            'header_image_position.x' => ['numeric', 'between:0,100'],
            'header_image_position.y' => ['numeric', 'between:0,100'],
        ];
    }

    private function assertPublishable(string $title): void
    {
        if (trim($title) === '') {
            throw ValidationException::withMessages([
                'title' => 'Add a title before publishing.',
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
