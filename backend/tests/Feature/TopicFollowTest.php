<?php

namespace Tests\Feature;

use App\Models\Topic;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TopicFollowTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_user_can_follow_a_topic_by_slug(): void
    {
        $user = User::factory()->create();
        $topic = Topic::factory()->create(['slug' => 'feeding-nutrition']);

        Sanctum::actingAs($user);
        $this->postJson('/api/topics/feeding-nutrition/follow')
            ->assertOk()
            ->assertExactJson(['following' => true]);

        $this->assertDatabaseHas('topic_follows', ['user_id' => $user->id, 'topic_id' => $topic->id]);
    }

    public function test_following_is_idempotent(): void
    {
        $user = User::factory()->create();
        Topic::factory()->create(['slug' => 'autism']);

        Sanctum::actingAs($user);
        $this->postJson('/api/topics/autism/follow')->assertOk();
        $this->postJson('/api/topics/autism/follow')->assertOk();

        $this->assertDatabaseCount('topic_follows', 1);
    }

    public function test_a_user_can_unfollow_a_topic(): void
    {
        $user = User::factory()->create();
        $topic = Topic::factory()->create(['slug' => 'autism']);
        $user->followedTopics()->attach($topic);

        Sanctum::actingAs($user);
        $this->deleteJson('/api/topics/autism/follow')
            ->assertOk()
            ->assertExactJson(['following' => false]);

        $this->assertDatabaseMissing('topic_follows', ['user_id' => $user->id, 'topic_id' => $topic->id]);
    }

    public function test_guests_cannot_follow_topics(): void
    {
        Topic::factory()->create(['slug' => 'autism']);

        $this->postJson('/api/topics/autism/follow')->assertUnauthorized();
    }

    public function test_it_lists_the_users_followed_topics(): void
    {
        $user = User::factory()->create();
        $followed = Topic::factory()->create(['name' => 'Autism', 'slug' => 'autism']);
        Topic::factory()->create(['name' => 'Feeding', 'slug' => 'feeding-nutrition']);
        $user->followedTopics()->attach($followed);

        Sanctum::actingAs($user);
        $this->getJson('/api/topics/following')
            ->assertOk()
            ->assertExactJson([['id' => $followed->id, 'name' => 'Autism', 'slug' => 'autism']]);
    }
}
