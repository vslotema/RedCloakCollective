<?php

namespace App\Console\Commands;

use App\Models\Topic;
use Illuminate\Console\Command;

/**
 * Author-created topics are created on the spot from the publish dialog's
 * free-text combobox (see ArticleController::resolveTopicIds()) and never
 * deleted when an edit detaches them — a typo like "sdfkasf" would otherwise
 * sit in the topics table (and the autocomplete) forever. This sweeps up
 * non-curated topics nobody links to anymore.
 */
class PruneOrphanedTopics extends Command
{
    protected $signature = 'topics:prune-orphaned {--hours=24 : Minimum age before an unlinked topic is eligible for deletion}';

    protected $description = 'Delete non-curated topics with no articles attached, after a grace period.';

    public function handle(): int
    {
        $deleted = Topic::query()
            ->where('curated', false)
            ->whereDoesntHave('articles')
            ->where('created_at', '<=', now()->subHours((int) $this->option('hours')))
            ->delete();

        $this->info("Pruned {$deleted} orphaned topic(s).");

        return self::SUCCESS;
    }
}
