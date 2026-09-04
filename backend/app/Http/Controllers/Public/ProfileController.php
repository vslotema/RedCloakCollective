<?php

namespace App\Http\Controllers\Public;

use App\Enums\ListVisibility;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;

class ProfileController extends Controller
{
    public function show(Request $request, User $user)
    {
        $viewer = $request->user();

        return response()->json([
            'id' => $user->id,
            'name' => $user->name,
            'username' => $user->username,
            'articles_count' => $user->articles()->whereNotNull('published_at')->count(),
            'lists_count' => $user->lists()->where('visibility', ListVisibility::Public)->count(),
            'followers_count' => $user->followers()->count(),
            'viewer_is_following' => $viewer
                ? $viewer->following()->where('followee_id', $user->id)->exists()
                : false,
        ]);
    }
}
