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
     * Topics and people recommended from the stored onboarding answers, for the
     * "Personalize your feed" screen and the home recommendation panel. Purely
     * a suggestion — the caller decides what (if anything) to follow.
     */
    public function recommendations(Request $request, RecommendationService $recommendations)
    {
        $user = $request->user();
        $followedTopicIds = $user->followedTopics()->pluck('topics.id');

        return response()->json([
            'topics' => $recommendations->recommendedTopics($user)->map(fn ($topic) => [
                'id' => $topic->id,
                'name' => $topic->name,
                'slug' => $topic->slug,
                'following' => $followedTopicIds->contains($topic->id),
            ])->values(),
            'people' => $recommendations->recommendedPeople($user)->map(fn ($person) => [
                'id' => $person->id,
                'name' => $person->name,
                'username' => $person->username,
                'articles_count' => $person->matching_articles_count ?? 0,
                'followers_count' => $person->followers_count,
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
