<?php

namespace Tests\Feature;

use App\Models\Article;
use App\Models\Topic;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ArticleManagementTest extends TestCase
{
    use RefreshDatabase;

    private function doc(string $text = 'Hello world'): array
    {
        return [
            'type' => 'doc',
            'content' => [
                ['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => $text]]],
            ],
        ];
    }

    public function test_a_user_can_create_a_draft(): void
    {
        $user = User::factory()->create();

        Sanctum::actingAs($user);
        $response = $this->postJson('/api/articles', [
            'title' => 'My first story',
            'content' => $this->doc(),
        ]);

        $response->assertCreated()
            ->assertJsonPath('title', 'My first story')
            ->assertJsonPath('published', false)
            ->assertJsonPath('published_at', null)
            ->assertJsonPath('content.type', 'doc')
            ->assertJsonPath('author.id', $user->id);

        $this->assertDatabaseHas('articles', [
            'user_id' => $user->id,
            'title' => 'My first story',
            'published_at' => null,
        ]);
        $this->assertNotEmpty($response->json('slug'));
    }

    public function test_a_user_can_create_an_already_published_article(): void
    {
        $user = User::factory()->create();

        $topic = Topic::factory()->create();

        Sanctum::actingAs($user);
        $this->postJson('/api/articles', [
            'title' => 'Published now',
            'content' => $this->doc(),
            'published' => true,
            'topic_ids' => [$topic->id],
        ])
            ->assertCreated()
            ->assertJsonPath('published', true)
            ->assertJsonPath('topics.0.id', $topic->id);

        $this->assertNotNull(Article::firstWhere('title', 'Published now')->published_at);
    }

    public function test_creating_an_article_requires_content(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->postJson('/api/articles', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors('content')
            ->assertJsonMissingValidationErrors('title');
    }

    public function test_a_user_can_create_a_title_less_draft(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->postJson('/api/articles', ['content' => $this->doc()])
            ->assertCreated()
            ->assertJsonPath('title', '')
            ->assertJsonPath('published', false);
    }

    public function test_a_title_less_draft_cannot_be_published(): void
    {
        $user = User::factory()->create();
        $article = Article::factory()->unpublished()->for($user, 'author')->create(['title' => '']);
        $article->topics()->attach(Topic::factory()->create());

        Sanctum::actingAs($user);
        $this->patchJson("/api/articles/{$article->id}", ['published' => true])
            ->assertStatus(422)
            ->assertJsonValidationErrors('title');

        $this->assertNull($article->fresh()->published_at);

        // A title unlocks publishing.
        $this->patchJson("/api/articles/{$article->id}", ['title' => 'Now titled', 'published' => true])
            ->assertOk()
            ->assertJsonPath('published', true);
    }

    public function test_publishing_requires_at_least_one_topic(): void
    {
        $user = User::factory()->create();
        $article = Article::factory()->unpublished()->for($user, 'author')->create(['title' => 'Ready']);

        Sanctum::actingAs($user);
        $this->patchJson("/api/articles/{$article->id}", ['published' => true])
            ->assertStatus(422)
            ->assertJsonValidationErrors('topic_ids');

        $this->assertNull($article->fresh()->published_at);

        $topic = Topic::factory()->create();
        $this->patchJson("/api/articles/{$article->id}", [
            'published' => true,
            'topic_ids' => [$topic->id],
        ])->assertOk()->assertJsonPath('published', true);
    }

    public function test_creating_a_published_article_without_a_title_is_rejected(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->postJson('/api/articles', ['content' => $this->doc(), 'published' => true])
            ->assertStatus(422)
            ->assertJsonValidationErrors('title');

        $this->assertDatabaseCount('articles', 0);
    }

    // --- create path: topics, excerpt, position, scheduling & validation ------

    public function test_create_syncs_topics_and_creates_author_topics(): void
    {
        $user = User::factory()->create();
        $existing = Topic::factory()->create(['name' => 'Assistive technology']);

        Sanctum::actingAs($user);
        $response = $this->postJson('/api/articles', [
            'content' => $this->doc(),
            'topic_ids' => [$existing->id],
            'new_topics' => ['Feeding tips', 'feeding tips'],
        ])->assertCreated()->assertJsonCount(2, 'topics');

        // "Feeding tips" / "feeding tips" collapse to one row by slug.
        $this->assertDatabaseHas('topics', ['slug' => 'feeding-tips', 'curated' => false]);
        $this->assertSame(1, Topic::where('slug', 'feeding-tips')->count());

        $article = Article::findOrFail($response->json('id'));
        $this->assertEqualsCanonicalizing(
            [$existing->id, Topic::where('slug', 'feeding-tips')->value('id')],
            $article->topics->pluck('id')->all(),
        );
    }

    public function test_create_rejects_more_than_five_topics(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $topics = Topic::factory()->count(6)->create();

        $this->postJson('/api/articles', [
            'content' => $this->doc(),
            'topic_ids' => $topics->pluck('id')->all(),
        ])->assertStatus(422)->assertJsonValidationErrors('topic_ids');
    }

    public function test_create_rejects_an_unknown_topic_id(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->postJson('/api/articles', [
            'content' => $this->doc(),
            'topic_ids' => [99999],
        ])->assertStatus(422)->assertJsonValidationErrors('topic_ids.0');
    }

    public function test_create_persists_an_excerpt(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->postJson('/api/articles', [
            'content' => $this->doc(),
            'excerpt' => 'A short preview subtitle.',
        ])->assertCreated()->assertJsonPath('excerpt', 'A short preview subtitle.');
    }

    public function test_create_rejects_an_over_long_excerpt(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->postJson('/api/articles', [
            'content' => $this->doc(),
            'excerpt' => str_repeat('a', 281),
        ])->assertStatus(422)->assertJsonValidationErrors('excerpt');
    }

    public function test_create_persists_a_header_image_position(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->postJson('/api/articles', [
            'content' => $this->doc(),
            'header_image_position' => ['x' => 20, 'y' => 70],
        ])
            ->assertCreated()
            ->assertJsonPath('header_image_position.x', 20)
            ->assertJsonPath('header_image_position.y', 70);
    }

    public function test_header_image_position_is_bounded_on_create_and_update(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $this->postJson('/api/articles', [
            'content' => $this->doc(),
            'header_image_position' => ['x' => 150, 'y' => 50],
        ])->assertStatus(422)->assertJsonValidationErrors('header_image_position.x');

        $article = Article::factory()->for($user, 'author')->create();
        $this->patchJson("/api/articles/{$article->id}", [
            'header_image_position' => ['x' => 50, 'y' => -1],
        ])->assertStatus(422)->assertJsonValidationErrors('header_image_position.y');
    }

    public function test_a_user_can_schedule_an_article_at_creation_time(): void
    {
        $user = User::factory()->create();
        $topic = Topic::factory()->create();
        $when = now()->addDays(2)->startOfSecond();

        Sanctum::actingAs($user);
        $response = $this->postJson('/api/articles', [
            'title' => 'Later',
            'content' => $this->doc(),
            'topic_ids' => [$topic->id],
            'publish_at' => $when->toIso8601String(),
        ])
            ->assertCreated()
            ->assertJsonPath('published', false)
            ->assertJsonPath('state', 'scheduled');

        $this->assertEquals(
            $when->toIso8601String(),
            Article::findOrFail($response->json('id'))->published_at->toIso8601String(),
        );
    }

    public function test_create_rejects_a_non_array_content(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->postJson('/api/articles', ['content' => 'just a string'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('content');
    }

    public function test_create_rejects_an_over_long_title_and_a_too_short_new_topic(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->postJson('/api/articles', [
            'content' => $this->doc(),
            'title' => str_repeat('a', 256),
        ])->assertStatus(422)->assertJsonValidationErrors('title');

        $this->postJson('/api/articles', [
            'content' => $this->doc(),
            'new_topics' => ['a'],
        ])->assertStatus(422)->assertJsonValidationErrors('new_topics.0');
    }

    public function test_each_draft_gets_a_distinct_slug_even_with_the_same_title(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $first = $this->postJson('/api/articles', [
            'title' => 'Same Title',
            'content' => $this->doc(),
        ])->assertCreated()->json('slug');

        $second = $this->postJson('/api/articles', [
            'title' => 'Same Title',
            'content' => $this->doc(),
        ])->assertCreated()->json('slug');

        $this->assertNotSame($first, $second);
        $this->assertStringStartsWith('same-title-', $first);
        $this->assertStringStartsWith('same-title-', $second);
    }

    public function test_a_title_less_draft_still_gets_a_slug(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $slug = $this->postJson('/api/articles', ['content' => $this->doc()])
            ->assertCreated()
            ->json('slug');

        $this->assertNotEmpty($slug);
        $this->assertStringStartsWith('article-', $slug);
    }

    public function test_an_article_can_be_updated_with_the_put_verb(): void
    {
        $user = User::factory()->create();
        $article = Article::factory()->for($user, 'author')->create();

        Sanctum::actingAs($user);
        $this->putJson("/api/articles/{$article->id}", ['title' => 'Via PUT'])
            ->assertOk()
            ->assertJsonPath('title', 'Via PUT');
    }

    public function test_a_user_can_load_their_own_draft_for_editing(): void
    {
        $user = User::factory()->create();
        $article = Article::factory()->unpublished()->for($user, 'author')->create();

        Sanctum::actingAs($user);
        $this->getJson("/api/me/articles/{$article->id}")
            ->assertOk()
            ->assertJsonPath('id', $article->id)
            ->assertJsonPath('published', false)
            ->assertJsonPath('content.type', 'doc');
    }

    public function test_a_user_cannot_load_someone_elses_article(): void
    {
        $article = Article::factory()->for(User::factory(), 'author')->create();

        Sanctum::actingAs(User::factory()->create());
        $this->getJson("/api/me/articles/{$article->id}")->assertForbidden();
    }

    public function test_me_articles_lists_own_drafts_and_published_only(): void
    {
        $user = User::factory()->create();
        Article::factory()->for($user, 'author')->create(['title' => 'Mine published']);
        Article::factory()->unpublished()->for($user, 'author')->create(['title' => 'Mine draft']);
        Article::factory()->for(User::factory(), 'author')->create(['title' => 'Someone else']);

        Sanctum::actingAs($user);
        $response = $this->getJson('/api/me/articles')->assertOk();

        $titles = collect($response->json())->pluck('title');
        $this->assertTrue($titles->contains('Mine published'));
        $this->assertTrue($titles->contains('Mine draft'));
        $this->assertFalse($titles->contains('Someone else'));
    }

    public function test_a_user_can_update_their_article(): void
    {
        $user = User::factory()->create();
        $article = Article::factory()->for($user, 'author')->create();

        Sanctum::actingAs($user);
        $this->patchJson("/api/articles/{$article->id}", [
            'title' => 'Renamed',
            'content' => $this->doc('Updated body'),
            'header_image_position' => ['x' => 20, 'y' => 80],
        ])
            ->assertOk()
            ->assertJsonPath('title', 'Renamed')
            ->assertJsonPath('header_image_position.x', 20);

        $this->assertSame('Updated body', $article->fresh()->content['content'][0]['content'][0]['text']);
    }

    public function test_publish_and_unpublish_toggle(): void
    {
        $user = User::factory()->create();
        $article = Article::factory()->unpublished()->for($user, 'author')->create();
        $article->topics()->attach(Topic::factory()->create());

        Sanctum::actingAs($user);

        $this->patchJson("/api/articles/{$article->id}", ['published' => true])
            ->assertOk()
            ->assertJsonPath('published', true);
        $this->assertNotNull($article->fresh()->published_at);

        $this->patchJson("/api/articles/{$article->id}", ['published' => false])
            ->assertOk()
            ->assertJsonPath('published', false);
        $this->assertNull($article->fresh()->published_at);
    }

    public function test_a_user_cannot_update_or_delete_someone_elses_article(): void
    {
        $article = Article::factory()->for(User::factory(), 'author')->create();

        Sanctum::actingAs(User::factory()->create());
        $this->patchJson("/api/articles/{$article->id}", ['title' => 'hijack'])->assertForbidden();
        $this->deleteJson("/api/articles/{$article->id}")->assertForbidden();

        $this->assertDatabaseHas('articles', ['id' => $article->id, 'title' => $article->title]);
    }

    public function test_a_user_can_delete_their_article_and_its_header_image(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $path = UploadedFile::fake()->image('h.jpg')->store('article-headers', 'public');
        $article = Article::factory()->for($user, 'author')->withHeaderImage($path)->create();

        Sanctum::actingAs($user);
        $this->deleteJson("/api/articles/{$article->id}")->assertNoContent();

        $this->assertDatabaseMissing('articles', ['id' => $article->id]);
        Storage::disk('public')->assertMissing($path);
    }

    public function test_guests_cannot_touch_the_authored_endpoints(): void
    {
        $article = Article::factory()->create();

        $this->getJson('/api/me/articles')->assertUnauthorized();
        $this->postJson('/api/articles', [])->assertUnauthorized();
        $this->patchJson("/api/articles/{$article->id}", [])->assertUnauthorized();
        $this->deleteJson("/api/articles/{$article->id}")->assertUnauthorized();
    }

    public function test_a_user_can_upload_and_replace_a_header_image(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $article = Article::factory()->for($user, 'author')->create();

        Sanctum::actingAs($user);

        $first = $this->post("/api/articles/{$article->id}/header-image", [
            'image' => UploadedFile::fake()->image('cover.jpg', 1200, 630),
        ])->assertOk();

        $firstPath = $article->fresh()->header_image_path;
        $this->assertNotNull($firstPath);
        Storage::disk('public')->assertExists($firstPath);
        $this->assertStringContainsString('/storage/'.$firstPath, $first->json('header_image_url'));

        $this->post("/api/articles/{$article->id}/header-image", [
            'image' => UploadedFile::fake()->image('new.png'),
        ])->assertOk();

        Storage::disk('public')->assertMissing($firstPath);
        Storage::disk('public')->assertExists($article->fresh()->header_image_path);
    }

    public function test_header_image_upload_rejects_non_images(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $article = Article::factory()->for($user, 'author')->create();

        Sanctum::actingAs($user);
        $this->post("/api/articles/{$article->id}/header-image", [
            'image' => UploadedFile::fake()->create('notes.pdf', 100, 'application/pdf'),
        ])->assertStatus(422)->assertJsonValidationErrors('image');
    }

    public function test_published_article_shows_on_the_public_surface_with_its_header(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $path = UploadedFile::fake()->image('h.jpg')->store('article-headers', 'public');
        $article = Article::factory()->for($user, 'author')->withHeaderImage($path)->create();

        $this->getJson("/api/articles/{$article->slug}")
            ->assertOk()
            ->assertJsonPath('published', true)
            ->assertJsonPath('content.type', 'doc')
            ->assertJsonPath('header_image_position.x', 50)
            ->assertJsonMissingPath('header_image_path');

        Article::factory()->unpublished()->for($user, 'author')->create(['slug' => 'hidden-draft']);
        $this->getJson('/api/articles/hidden-draft')->assertNotFound();
    }

    public function test_a_user_can_remove_the_header_image(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $path = UploadedFile::fake()->image('h.jpg')->store('article-headers', 'public');
        $article = Article::factory()->for($user, 'author')->withHeaderImage($path)->create();

        Sanctum::actingAs($user);
        $this->deleteJson("/api/articles/{$article->id}/header-image")
            ->assertOk()
            ->assertJsonPath('header_image_url', null);

        $this->assertNull($article->fresh()->header_image_path);
        Storage::disk('public')->assertMissing($path);
    }

    public function test_removing_a_header_image_requires_ownership(): void
    {
        $article = Article::factory()->for(User::factory(), 'author')->withHeaderImage()->create();

        Sanctum::actingAs(User::factory()->create());
        $this->deleteJson("/api/articles/{$article->id}/header-image")->assertForbidden();
    }

    public function test_a_user_can_upload_an_inline_body_image(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $article = Article::factory()->for($user, 'author')->create();

        Sanctum::actingAs($user);
        $response = $this->post("/api/articles/{$article->id}/images", [
            'image' => UploadedFile::fake()->image('inline.jpg'),
        ])->assertCreated();

        $url = $response->json('url');
        $this->assertStringContainsString('/storage/article-body/', $url);

        $stored = str($url)->after('/storage/')->value();
        Storage::disk('public')->assertExists($stored);
    }

    public function test_inline_body_image_upload_requires_ownership(): void
    {
        Storage::fake('public');
        $article = Article::factory()->for(User::factory(), 'author')->create();

        Sanctum::actingAs(User::factory()->create());
        $this->post("/api/articles/{$article->id}/images", [
            'image' => UploadedFile::fake()->image('inline.jpg'),
        ])->assertForbidden();
    }

    public function test_inline_body_image_upload_rejects_non_images(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $article = Article::factory()->for($user, 'author')->create();

        Sanctum::actingAs($user);
        $this->post("/api/articles/{$article->id}/images", [
            'image' => UploadedFile::fake()->create('notes.pdf', 100, 'application/pdf'),
        ])->assertStatus(422)->assertJsonValidationErrors('image');
    }

    public function test_guests_cannot_use_the_image_endpoints(): void
    {
        $article = Article::factory()->create();

        $this->deleteJson("/api/articles/{$article->id}/header-image")->assertUnauthorized();
        $this->postJson("/api/articles/{$article->id}/images")->assertUnauthorized();
    }

    // --- topics, excerpt & scheduling ------------------------------------------

    public function test_update_syncs_topics_and_creates_author_topics(): void
    {
        $user = User::factory()->create();
        $article = Article::factory()->unpublished()->for($user, 'author')->create();
        $existing = Topic::factory()->create(['name' => 'Assistive technology']);

        Sanctum::actingAs($user);
        $this->patchJson("/api/articles/{$article->id}", [
            'topic_ids' => [$existing->id],
            'new_topics' => ['Feeding tips', 'feeding tips'],
        ])->assertOk()->assertJsonCount(2, 'topics');

        $this->assertDatabaseHas('topics', ['slug' => 'feeding-tips', 'curated' => false]);
        // "Feeding tips" / "feeding tips" collapse to one row by slug.
        $this->assertSame(1, Topic::where('slug', 'feeding-tips')->count());
        $this->assertEqualsCanonicalizing(
            [$existing->id, Topic::where('slug', 'feeding-tips')->value('id')],
            $article->fresh()->topics->pluck('id')->all(),
        );
    }

    public function test_an_article_may_carry_at_most_five_topics(): void
    {
        $user = User::factory()->create();
        $article = Article::factory()->for($user, 'author')->create();
        $topics = Topic::factory()->count(6)->create();

        Sanctum::actingAs($user);
        $this->patchJson("/api/articles/{$article->id}", [
            'topic_ids' => $topics->pluck('id')->all(),
        ])->assertStatus(422)->assertJsonValidationErrors('topic_ids');
    }

    public function test_a_user_can_set_a_preview_excerpt(): void
    {
        $user = User::factory()->create();
        $article = Article::factory()->for($user, 'author')->create();

        Sanctum::actingAs($user);
        $this->patchJson("/api/articles/{$article->id}", [
            'excerpt' => 'A short preview subtitle.',
        ])->assertOk()->assertJsonPath('excerpt', 'A short preview subtitle.');
    }

    public function test_a_user_can_schedule_an_article_for_the_future(): void
    {
        $user = User::factory()->create();
        $article = Article::factory()->unpublished()->for($user, 'author')->create(['title' => 'Later']);
        $article->topics()->attach(Topic::factory()->create());
        $when = now()->addDays(2)->startOfSecond();

        Sanctum::actingAs($user);
        $this->patchJson("/api/articles/{$article->id}", [
            'publish_at' => $when->toIso8601String(),
        ])->assertOk()
            ->assertJsonPath('published', false)
            ->assertJsonPath('state', 'scheduled');

        $this->assertEquals(
            $when->toIso8601String(),
            $article->fresh()->published_at->toIso8601String(),
        );

        // Not visible on the public surface yet.
        $this->getJson("/api/articles/{$article->slug}")->assertNotFound();
    }

    public function test_a_scheduled_article_goes_live_when_its_time_passes(): void
    {
        $article = Article::factory()->for(User::factory(), 'author')
            ->create(['published_at' => now()->addHour()]);

        $this->getJson("/api/articles/{$article->slug}")->assertNotFound();

        $this->travel(2)->hours();

        $this->getJson("/api/articles/{$article->slug}")->assertOk();
    }

    public function test_scheduling_a_past_time_publishes_immediately(): void
    {
        $user = User::factory()->create();
        $article = Article::factory()->unpublished()->for($user, 'author')->create(['title' => 'Now']);
        $article->topics()->attach(Topic::factory()->create());

        Sanctum::actingAs($user);
        $this->patchJson("/api/articles/{$article->id}", [
            'publish_at' => now()->subDay()->toIso8601String(),
        ])->assertOk()->assertJsonPath('published', true);
    }

    public function test_topics_index_lists_curated_first(): void
    {
        Topic::factory()->create(['name' => 'Zebra care', 'curated' => true]);
        Topic::factory()->userCreated()->create(['name' => 'Aardvark tips']);

        Sanctum::actingAs(User::factory()->create());
        $this->getJson('/api/topics')
            ->assertOk()
            ->assertJsonPath('0.name', 'Zebra care')
            ->assertJsonPath('1.name', 'Aardvark tips');
    }
}
