<?php

namespace App\Http\Controllers;

use App\Models\Topic;
use Illuminate\Http\Request;

class TopicController extends Controller
{
    /**
     * The full topic list for the publish dialog's picker — curated ones first,
     * then author-created, each block alphabetical. Optional `?q=` prefix/substr
     * filter on the name.
     */
    public function index(Request $request)
    {
        $q = trim((string) $request->query('q', ''));

        return Topic::query()
            ->when($q !== '', fn ($query) => $query->where('name', 'like', '%'.$q.'%'))
            ->orderByDesc('curated')
            ->orderBy('name')
            ->get(['id', 'name', 'slug', 'curated']);
    }
}
