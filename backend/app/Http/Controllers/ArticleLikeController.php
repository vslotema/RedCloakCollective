<?php

namespace App\Http\Controllers;

use App\Models\Article;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ArticleLikeController extends Controller
{
    public function show(Request $request, Article $article): JsonResponse
    {
        $viewer = $request->user('sanctum');

        return response()->json([
            'liked' => $viewer
                ? $viewer->likedArticles()->whereKey($article->id)->exists()
                : false,
            'likes_count' => $article->likers()->count(),
        ]);
    }

    public function like(Request $request, Article $article): JsonResponse
    {
        $request->user()->likedArticles()->syncWithoutDetaching([$article->id]);

        return response()->json([
            'liked' => true,
            'likes_count' => $article->likers()->count(),
        ]);
    }

    public function unlike(Request $request, Article $article): JsonResponse
    {
        $request->user()->likedArticles()->detach([$article->id]);

        return response()->json([
            'liked' => false,
            'likes_count' => $article->likers()->count(),
        ]);
    }
}
