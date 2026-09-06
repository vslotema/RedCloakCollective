<?php

namespace Tests\Feature;

use App\Models\Topic;
use App\Models\User;
use Database\Seeders\TopicSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class OnboardingPersonalizeTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(TopicSeeder::class);
    }

    public function test_it_follows_only_the_chosen_topics_and_people(): void
    {
        $user = User::factory()->create(['topics_onboarded_at' => now()]);
        $chosenTopic = Topic::where('slug', 'feeding-nutrition')->first();
        $otherTopic = Topic::where('slug', 'autism')->first();
        $chosenPerson = User::factory()->create();
        $otherPerson = User::factory()->create();

        Sanctum::actingAs($user);
        $response = $this->postJson('/api/onboarding/personalize', [
            'topic_ids' => [$chosenTopic->id],
            'usernames' => [$chosenPerson->username],
        ]);

        $response->assertOk()->assertJsonPath('user.feedPersonalized', true);

        $this->assertDatabaseHas('topic_follows', ['user_id' => $user->id, 'topic_id' => $chosenTopic->id]);
        $this->assertDatabaseMissing('topic_follows', ['user_id' => $user->id, 'topic_id' => $otherTopic->id]);
        $this->assertDatabaseHas('follows', ['follower_id' => $user->id, 'followee_id' => $chosenPerson->id]);
        $this->assertDatabaseMissing('follows', ['follower_id' => $user->id, 'followee_id' => $otherPerson->id]);
        $this->assertNotNull($user->fresh()->feed_personalized_at);
    }

    public function test_skip_marks_the_feed_personalized_with_no_follows(): void
    {
        $user = User::factory()->create(['topics_onboarded_at' => now()]);

        Sanctum::actingAs($user);
        $this->postJson('/api/onboarding/personalize', ['topic_ids' => [], 'usernames' => []])
            ->assertOk()
            ->assertJsonPath('user.feedPersonalized', true)
            ->assertJsonPath('user.hasFollows', false);

        $this->assertNotNull($user->fresh()->feed_personalized_at);
        $this->assertDatabaseCount('topic_follows', 0);
        $this->assertDatabaseCount('follows', 0);
    }

    public function test_it_ignores_the_users_own_username(): void
    {
        $user = User::factory()->create(['topics_onboarded_at' => now()]);

        Sanctum::actingAs($user);
        $this->postJson('/api/onboarding/personalize', [
            'topic_ids' => [],
            'usernames' => [$user->username],
        ])->assertOk();

        $this->assertDatabaseMissing('follows', ['follower_id' => $user->id, 'followee_id' => $user->id]);
    }

    public function test_user_endpoint_reflects_personalized_state(): void
    {
        $user = User::factory()->create(['topics_onboarded_at' => now()]);
        $person = User::factory()->create();

        Sanctum::actingAs($user);
        $this->postJson('/api/onboarding/personalize', [
            'topic_ids' => [],
            'usernames' => [$person->username],
        ])->assertOk();

        $this->getJson('/api/user')
            ->assertOk()
            ->assertJsonPath('feedPersonalized', true)
            ->assertJsonPath('topicsOnboarded', true)
            ->assertJsonPath('hasFollows', true);
    }

    public function test_it_requires_authentication(): void
    {
        $this->postJson('/api/onboarding/personalize', ['topic_ids' => [], 'usernames' => []])
            ->assertUnauthorized();
    }
}
