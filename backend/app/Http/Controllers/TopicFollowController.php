<?php

namespace App\Http\Controllers;

use App\Models\Topic;
use Illuminate\Http\Request;

class TopicFollowController extends Controller
{
    /**
     * The topics the current user follows — used to render the followed-topics
     * filter row on the home feed.
     */
    public function index(Request $request)
    {
        return response()->json(
            $request->user()->followedTopics()
                ->orderBy('name')
                ->get()
                ->map(fn ($topic) => [
                    'id' => $topic->id,
                    'name' => $topic->name,
                    'slug' => $topic->slug,
                ])
                ->values()
        );
    }

    public function store(Request $request, Topic $topic)
    {
        $request->user()->followedTopics()->syncWithoutDetaching([$topic->id]);

        return response()->json(['following' => true]);
    }

    public function destroy(Request $request, Topic $topic)
    {
        $request->user()->followedTopics()->detach($topic->id);

        return response()->json(['following' => false]);
    }
}
