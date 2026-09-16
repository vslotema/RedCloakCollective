<?php

namespace App\Http\Controllers;

use App\Models\Topic;
use Illuminate\Http\Request;

class TopicController extends Controller
{
    /** Keeps the picker fast and the response bounded as the table grows. */
    private const MAX_RESULTS = 50;

    /**
     * The topic list for the publish dialog's picker — curated ones first,
     * then author-created, each block alphabetical. Optional `?q=` prefix
     * filter on the name (a prefix match stays sargable against the unique
     * index on `name` as the table grows with author-created topics).
     */
    public function index(Request $request)
    {
        $q = trim((string) $request->query('q', ''));

        return Topic::query()
            ->when($q !== '', fn ($query) => $query->where('name', 'like', $q.'%'))
            ->orderByDesc('curated')
            ->orderBy('name')
            ->limit(self::MAX_RESULTS)
            ->get(['id', 'name', 'slug', 'curated']);
    }
}
