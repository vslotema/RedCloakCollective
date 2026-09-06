<?php

namespace App\Http\Controllers;

use App\Models\Topic;
use Illuminate\Http\Request;

class TopicFollowController extends Controller
{
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
