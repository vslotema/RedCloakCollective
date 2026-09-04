<?php

namespace App\Http\Controllers\Public;

use App\Enums\ListVisibility;
use App\Http\Controllers\Controller;
use App\Models\Article;
use App\Models\ReadingList;
use App\Models\User;

class SitemapController extends Controller
{
    /**
     * Flat list of public, crawlable URLs for the Nuxt app's sitemap module.
     * Only content that's actually public belongs here — private/followers-only
     * lists are deliberately excluded.
     */
    public function index()
    {
        $articles = Article::whereNotNull('published_at')
            ->where('published_at', '<=', now())
            ->get(['slug', 'published_at'])
            ->map(fn (Article $article) => [
                'loc' => "/articles/{$article->slug}",
                'lastmod' => $article->published_at,
            ]);

        $lists = ReadingList::where('visibility', ListVisibility::Public)
            ->get(['id', 'updated_at'])
            ->map(fn (ReadingList $list) => [
                'loc' => "/equipment/{$list->id}",
                'lastmod' => $list->updated_at,
            ]);

        $profiles = User::whereNotNull('username')
            ->get(['username', 'updated_at'])
            ->map(fn (User $user) => [
                'loc' => "/u/{$user->username}",
                'lastmod' => $user->updated_at,
            ]);

        return response()->json(
            $articles->concat($lists)->concat($profiles)->values()
        );
    }
}
