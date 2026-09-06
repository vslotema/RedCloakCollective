<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class OnboardingController extends Controller
{
    /**
     * Save (or update) the topic-preferences questionnaire answers and mark
     * it complete — called both on finishing and on skipping, so the
     * questionnaire never shows again either way. `answers` is intentionally
     * a free-form object: it's a fixed, small, frontend-owned question set,
     * not something the backend needs to validate field-by-field.
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

        return response()->json(['user' => $user]);
    }
}
