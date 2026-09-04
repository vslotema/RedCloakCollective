<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\Article;
use Illuminate\Support\Facades\DB;

class ArticleController extends Controller
{
    public function index()
    {
        return Article::with('author:id,name,username')
            ->whereNotNull('published_at')
            ->where('published_at', '<=', now())
            ->orderByDesc('published_at')
            ->paginate(20);
    }

    public function show(Article $article)
    {
        abort_unless(
            $article->published_at && $article->published_at->lessThanOrEqualTo(now()),
            404
        );

        return $article->load('author:id,name,username');
    }
}
