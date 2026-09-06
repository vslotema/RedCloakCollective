<?php

namespace Tests\Feature;

use App\Models\Article;
use App\Models\Topic;
use App\Models\User;
use Database\Seeders\TopicSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class OnboardingRecommendationsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(TopicSeeder::class);
    }

    private function userWithAnswers(array $answers): User
    {
        return User::factory()->create([
            'onboarding_answers' => $answers,
            'topics_onboarded_at' => now(),
        ]);
    }

    public function test_topics_are_derived_from_content_interest_answers(): void
    {
        $user = $this->userWithAnswers(['content_interests' => ['feeding_swallowing_nutrition']]);

        Sanctum::actingAs($user);
        $response = $this->getJson('/api/onboarding/recommendations');

        $response->assertOk();
        $slugs = $response->json('topics.*.slug');

        // The primary topic comes first, then related topics broaden the set.
        $this->assertSame('feeding-nutrition', $slugs[0]);
        $this->assertContains('therapy-rehabilitation', $slugs);
        $this->assertGreaterThan(1, count($slugs));
    }

    public function test_topic_recommendations_are_capped(): void
    {
        $user = $this->userWithAnswers([
            'content_interests' => [
                'everyday_caregiving', 'mobility_positioning_transfers', 'wheelchairs_adaptive_equipment',
                'communication_assistive_tech', 'feeding_swallowing_nutrition', 'therapy_rehabilitation',
            ],
            'conditions' => ['cerebral_palsy', 'autism', 'rett_syndrome', 'sensory_disability'],
        ]);

        Sanctum::actingAs($user);
        $slugs = $this->getJson('/api/onboarding/recommendations')->json('topics.*.slug');

        $this->assertLessThanOrEqual(15, count($slugs));
        $this->assertSame($slugs, array_values(array_unique($slugs)));
    }

    public function test_topics_are_derived_from_condition_answers(): void
    {
        $user = $this->userWithAnswers(['conditions' => ['cerebral_palsy']]);

        Sanctum::actingAs($user);
        $slugs = $this->getJson('/api/onboarding/recommendations')->json('topics.*.slug');

        $this->assertContains('cerebral-palsy', $slugs);
    }

    public function test_meaningless_answers_fall_back_to_default_topics(): void
    {
        $user = $this->userWithAnswers([
            'content_interests' => ['not_sure_yet', 'other'],
            'conditions' => ['prefer_not_to_say'],
        ]);

        Sanctum::actingAs($user);
        $slugs = $this->getJson('/api/onboarding/recommendations')->json('topics.*.slug');

        $this->assertEqualsCanonicalizing(
            ['everyday-caregiving', 'personal-stories', 'how-to-guides', 'community-relationships'],
            $slugs,
        );
    }

    public function test_recommended_people_are_authors_publishing_in_recommended_topics(): void
    {
        $topic = Topic::where('slug', 'feeding-nutrition')->first();
        $user = $this->userWithAnswers(['content_interests' => ['feeding_swallowing_nutrition']]);

        $match = User::factory()->create();
        Article::factory()->for($match, 'author')->create()->topics()->attach($topic);

        $draftOnly = User::factory()->create();
        Article::factory()->unpublished()->for($draftOnly, 'author')->create()->topics()->attach($topic);

        $untagged = User::factory()->create();
        Article::factory()->for($untagged, 'author')->create();

        $alreadyFollowed = User::factory()->create();
        Article::factory()->for($alreadyFollowed, 'author')->create()->topics()->attach($topic);
        $user->following()->attach($alreadyFollowed);

        Article::factory()->for($user, 'author')->create()->topics()->attach($topic);

        Sanctum::actingAs($user);
        $usernames = $this->getJson('/api/onboarding/recommendations')->json('people.*.username');

        $this->assertContains($match->username, $usernames);
        $this->assertNotContains($draftOnly->username, $usernames);
        $this->assertNotContains($untagged->username, $usernames);
        $this->assertNotContains($alreadyFollowed->username, $usernames);
        $this->assertNotContains($user->username, $usernames);
    }

    public function test_recommended_people_fall_back_to_popular_authors_when_nothing_matches(): void
    {
        $user = $this->userWithAnswers(['content_interests' => ['feeding_swallowing_nutrition']]);

        $popular = User::factory()->create();
        Article::factory()->for($popular, 'author')->create();
        User::factory()->count(2)->create()->each(fn ($f) => $popular->followers()->attach($f));

        $quiet = User::factory()->create();
        Article::factory()->for($quiet, 'author')->create();

        Sanctum::actingAs($user);
        $usernames = $this->getJson('/api/onboarding/recommendations')->json('people.*.username');

        $this->assertSame([$popular->username, $quiet->username], $usernames);
    }
}
