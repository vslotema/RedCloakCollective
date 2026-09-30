<?php

namespace Tests\Feature;

use App\Models\Article;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ArticleLikeTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_user_can_like_an_article(): void
    {
        $user = User::factory()->create();
        $article = Article::factory()->create();

        Sanctum::actingAs($user);
        $this->putJson("/api/articles/{$article->id}/like")
            ->assertOk()
            ->assertExactJson(['liked' => true, 'likes_count' => 1]);

        $this->assertDatabaseHas('article_likes', ['user_id' => $user->id, 'article_id' => $article->id]);
    }

    public function test_liking_is_idempotent(): void
    {
        $article = Article::factory()->create();

        Sanctum::actingAs(User::factory()->create());
        $this->putJson("/api/articles/{$article->id}/like")->assertOk();
        $this->putJson("/api/articles/{$article->id}/like")
            ->assertOk()
            ->assertExactJson(['liked' => true, 'likes_count' => 1]);

        $this->assertDatabaseCount('article_likes', 1);
    }

    public function test_a_user_can_unlike_an_article(): void
    {
        $user = User::factory()->create();
        $article = Article::factory()->create();
        $article->likers()->attach([$user->id, User::factory()->create()->id]);

        Sanctum::actingAs($user);
        $this->deleteJson("/api/articles/{$article->id}/like")
            ->assertOk()
            ->assertExactJson(['liked' => false, 'likes_count' => 1]);

        $this->assertDatabaseMissing('article_likes', ['user_id' => $user->id, 'article_id' => $article->id]);
    }

    public function test_guests_cannot_like_or_unlike_articles(): void
    {
        $article = Article::factory()->create();

        $this->putJson("/api/articles/{$article->id}/like")->assertUnauthorized();
        $this->deleteJson("/api/articles/{$article->id}/like")->assertUnauthorized();
    }

    public function test_like_status_reports_whether_the_viewer_liked_the_article(): void
    {
        $user = User::factory()->create();
        $article = Article::factory()->create();
        $article->likers()->attach(User::factory()->create());

        Sanctum::actingAs($user);
        $this->getJson("/api/articles/{$article->id}/like")
            ->assertOk()
            ->assertExactJson(['liked' => false, 'likes_count' => 1]);

        $article->likers()->attach($user);
        $this->getJson("/api/articles/{$article->id}/like")
            ->assertOk()
            ->assertExactJson(['liked' => true, 'likes_count' => 2]);
    }

    public function test_guests_can_read_the_like_status(): void
    {
        $article = Article::factory()->create();
        $article->likers()->attach(User::factory()->create());

        $this->getJson("/api/articles/{$article->id}/like")
            ->assertOk()
            ->assertExactJson(['liked' => false, 'likes_count' => 1]);
    }
}
