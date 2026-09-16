<?php

namespace Tests\Feature;

use App\Models\Article;
use App\Models\Topic;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PruneOrphanedTopicsTest extends TestCase
{
    use RefreshDatabase;

    public function test_deletes_an_old_unlinked_non_curated_topic(): void
    {
        $topic = Topic::factory()->userCreated()->create(['created_at' => now()->subDays(2)]);

        $this->artisan('topics:prune-orphaned')->assertSuccessful();

        $this->assertDatabaseMissing('topics', ['id' => $topic->id]);
    }

    public function test_keeps_a_curated_topic_with_no_articles(): void
    {
        $topic = Topic::factory()->create(['curated' => true, 'created_at' => now()->subDays(2)]);

        $this->artisan('topics:prune-orphaned');

        $this->assertDatabaseHas('topics', ['id' => $topic->id]);
    }

    public function test_keeps_a_non_curated_topic_still_attached_to_an_article(): void
    {
        $topic = Topic::factory()->userCreated()->create(['created_at' => now()->subDays(2)]);
        $topic->articles()->attach(Article::factory()->create());

        $this->artisan('topics:prune-orphaned');

        $this->assertDatabaseHas('topics', ['id' => $topic->id]);
    }

    public function test_keeps_a_non_curated_unlinked_topic_younger_than_the_grace_period(): void
    {
        $topic = Topic::factory()->userCreated()->create(['created_at' => now()->subHours(1)]);

        $this->artisan('topics:prune-orphaned');

        $this->assertDatabaseHas('topics', ['id' => $topic->id]);
    }

    public function test_hours_option_overrides_the_default_grace_period(): void
    {
        $topic = Topic::factory()->userCreated()->create(['created_at' => now()->subHours(1)]);

        $this->artisan('topics:prune-orphaned', ['--hours' => 0])->assertSuccessful();

        $this->assertDatabaseMissing('topics', ['id' => $topic->id]);
    }
}
