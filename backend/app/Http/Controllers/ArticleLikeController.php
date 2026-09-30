<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Models\Article;


class ArticleLikeController extends Controller
{
    public function like(Request $request, Article $article): JsonResponse
    {
        $request->user->likedArticles()->syncWithoutDetaching([$article->id]);
        
        return response()->json([
            'liked' => true,
            'likes_count' => $article->likers()->count(),
        ]);
    }

    public function unlike(Request $request, Article $article) {
         $request->user->likedArticles()->detach([$article->id]);
        
        return response()->json([
            'liked' => false,
            'likes_count' => $article->likers()->count(),
        ]);
    }
}
