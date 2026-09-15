<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\RecommendationService;
use Illuminate\Http\Request;

class OnboardingController extends Controller
{
    /**
     * Save (or update) the topic-preferences questionnaire answers and mark
     * it complete — called both on finishing and on skipping, so the
     * questionnaire never shows again either way. `answers` is intentionally
     * a free-form object: it's a fixed, small, frontend-owned question set,
     * not something the backend needs to validate field-by-field.
     *
     * This does NOT follow anything. The answers are a discovery signal; the
     * user picks what to follow on the "Personalize your feed" screen next.
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'answers' => ['nullable', 'array'],
        ]);

        $user = $request->user();
        $user->forceFill([
            'onboarding_answers' => $data['answers'] ?? null,
            'topics_onboarded_at' => now(),
        ])->save();

        return response()->json(['user' => $user->withDashboardFlags()]);
    }

    /**
     * Topics and creators recommended from the stored onboarding answers, for the
     * "Personalize your feed" screen and the home recommendation panel. Purely
     * a suggestion — the caller decides what (if anything) to follow.
     *
     * `topics_limit` / `creators_limit` let a caller ask for a smaller slice —
     * the home recommendation panel requests at most 7 topics and 3 creators so
     * it doesn't flood the sidebar, while the full "Personalize your feed"
     * screen omits them and gets the uncapped set.
     */
    public function recommendations(Request $request, RecommendationService $recommendations)
    {
        $data = $request->validate([
            'topics_limit' => ['nullable', 'integer', 'min:1'],
            'creators_limit' => ['nullable', 'integer', 'min:1'],
        ]);

        $user = $request->user();
        $followedTopicIds = $user->followedTopics()->pluck('topics.id');

        return response()->json([
            'topics' => $recommendations->recommendedTopics($user, $data['topics_limit'] ?? null)->map(fn ($topic) => [
                'id' => $topic->id,
                'name' => $topic->name,
                'slug' => $topic->slug,
                'following' => $followedTopicIds->contains($topic->id),
            ])->values(),
            'creators' => $recommendations->recommendedCreators($user, $data['creators_limit'] ?? 8)->map(fn ($creator) => [
                'id' => $creator->id,
                'name' => $creator->name,
                'username' => $creator->username,
                'articles_count' => $creator->matching_articles_count ?? 0,
                'followers_count' => $creator->followers_count,
            ])->values(),
        ]);
    }

    /**
     * Persist the user's explicit follow choices from the "Personalize your
     * feed" screen and mark the feed personalised. Empty arrays are valid —
     * that's the "skip" path (personalised, nothing followed).
     */
    public function personalize(Request $request)
    {
        $data = $request->validate([
            'topic_ids' => ['array'],
            'topic_ids.*' => ['integer', 'exists:topics,id'],
            'usernames' => ['array'],
            'usernames.*' => ['string', 'exists:users,username'],
        ]);

        $user = $request->user();

        if (! empty($data['topic_ids'])) {
            $user->followedTopics()->syncWithoutDetaching($data['topic_ids']);
        }

        if (! empty($data['usernames'])) {
            $ids = User::whereIn('username', $data['usernames'])
                ->whereKeyNot($user->id)
                ->pluck('id');

            $user->following()->syncWithoutDetaching($ids);
        }

        $user->forceFill(['feed_personalized_at' => now()])->save();

        return response()->json(['user' => $user->withDashboardFlags()]);
    }
}
