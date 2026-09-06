<?php

namespace App\Services;

use App\Models\Topic;
use App\Models\User;
use App\Support\OnboardingTopicMap;
use Illuminate\Database\Eloquent\Collection;

class RecommendationService
{
    /**
     * Broadly useful topics to fall back to when the answers carry no signal
     * (all skipped, "not sure", opt-outs).
     *
     * @var list<string>
     */
    private const FALLBACK_TOPIC_SLUGS = [
        'everyday-caregiving',
        'personal-stories',
        'how-to-guides',
        'community-relationships',
    ];

    /** Upper bound on recommended topics so a maximal questionnaire doesn't flood the screen. */
    private const MAX_TOPICS = 15;

    /**
     * Topics derived from the user's onboarding answers (a temporary discovery
     * signal — nothing is followed here). Ordered by relevance: each answer's
     * primary topic first, then the related topics it pulls in.
     *
     * @return Collection<int, Topic>
     */
    public function recommendedTopics(User $user): Collection
    {
        $slugs = OnboardingTopicMap::slugsFor($user->onboarding_answers);

        if ($slugs === []) {
            $slugs = self::FALLBACK_TOPIC_SLUGS;
        }

        $slugs = array_slice($slugs, 0, self::MAX_TOPICS);
        $order = array_flip($slugs);

        return Topic::whereIn('slug', $slugs)
            ->get()
            ->sortBy(fn (Topic $topic) => $order[$topic->slug] ?? PHP_INT_MAX)
            ->values();
    }

    /**
     * People worth following: authors of published articles tagged with one of
     * the user's recommended topics, ranked by how much matching content they've
     * published and then by follower count. Falls back to the most-followed
     * authors of any published content when nothing matches.
     *
     * Excludes the user themselves and anyone they already follow.
     *
     * @return Collection<int, User>
     */
    public function recommendedPeople(User $user, int $limit = 8): Collection
    {
        $topicIds = $this->recommendedTopics($user)->pluck('id');
        $exclude = $user->following()->pluck('followee_id')->push($user->id);

        $matchingArticles = fn ($query) => $query
            ->whereNotNull('published_at')
            ->where('published_at', '<=', now())
            ->whereHas('topics', fn ($topics) => $topics->whereIn('topics.id', $topicIds));

        $people = User::query()
            ->whereNotIn('id', $exclude)
            ->whereHas('articles', $matchingArticles)
            ->withCount([
                'articles as matching_articles_count' => $matchingArticles,
                'followers',
            ])
            ->orderByDesc('matching_articles_count')
            ->orderByDesc('followers_count')
            ->limit($limit)
            ->get();

        if ($people->isEmpty()) {
            $people = User::query()
                ->whereNotIn('id', $exclude)
                ->whereHas('articles', fn ($query) => $query
                    ->whereNotNull('published_at')
                    ->where('published_at', '<=', now()))
                ->withCount('followers')
                ->orderByDesc('followers_count')
                ->limit($limit)
                ->get();
        }

        return $people;
    }
}
