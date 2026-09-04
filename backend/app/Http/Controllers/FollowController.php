<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;

class FollowController extends Controller
{
    public function store(Request $request, User $user)
    {
        abort_if($request->user()->id === $user->id, 422, "You can't follow yourself.");

        $request->user()->following()->syncWithoutDetaching([$user->id]);

        return response()->json(['following' => true]);
    }

    public function destroy(Request $request, User $user)
    {
        $request->user()->following()->detach($user->id);

        return response()->json(['following' => false]);
    }
}
