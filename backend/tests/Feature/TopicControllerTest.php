<?php

namespace Tests\Feature;

use App\Models\Topic;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TopicControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_topics_are_curated_first_then_alphabetical(): void
    {
        Topic::factory()->create(['name' => 'Zebra care', 'curated' => true]);
        Topic::factory()->userCreated()->create(['name' => 'Aardvark tips']);
        Topic::factory()->create(['name' => 'Aardvark care', 'curated' => true]);

        Sanctum::actingAs(User::factory()->create());
        $names = $this->getJson('/api/topics')->assertOk()->json('*.name');

        $this->assertSame(['Aardvark care', 'Zebra care', 'Aardvark tips'], $names);
    }

    public function test_q_matches_a_name_prefix_only(): void
    {
        Topic::factory()->create(['name' => 'Feeding tips']);
        Topic::factory()->create(['name' => 'Mobility feeding aids']);

        Sanctum::actingAs(User::factory()->create());
        $names = $this->getJson('/api/topics?q=Feed')->assertOk()->json('*.name');

        $this->assertSame(['Feeding tips'], $names);
    }

    public function test_results_are_capped(): void
    {
        Topic::factory()->count(60)->create();

        Sanctum::actingAs(User::factory()->create());
        $this->getJson('/api/topics')->assertOk()->assertJsonCount(50);
    }

    public function test_guests_cannot_list_topics(): void
    {
        $this->getJson('/api/topics')->assertUnauthorized();
    }
}
