<?php

namespace Tests\Feature;

use App\Models\Article;
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

        Sanctum::actingAs($user);
        $this->postJson('/api/articles', [
            'title' => 'Published now',
            'content' => $this->doc(),
            'published' => true,
        ])
            ->assertCreated()
            ->assertJsonPath('published', true);

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

    public function test_creating_a_published_article_without_a_title_is_rejected(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->postJson('/api/articles', ['content' => $this->doc(), 'published' => true])
            ->assertStatus(422)
            ->assertJsonValidationErrors('title');

        $this->assertDatabaseCount('articles', 0);
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
}
