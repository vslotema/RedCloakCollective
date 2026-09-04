<?php

namespace App\Http\Controllers\Public;

use App\Enums\ListVisibility;
use App\Http\Controllers\Controller;
use App\Models\ReadingList;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

/**
 * Serves the "equipment lists" product feature, backed by the ReadingList
 * Eloquent model (table: lists).
 */
class EquipmentListController extends Controller
{
    public function index()
    {
        return ReadingList::with('owner:id,name,username')
            ->where('visibility', ListVisibility::Public)
            ->latest()
            ->paginate(20);
    }

    public function show(Request $request, ReadingList $list)
    {
        $viewer = $request->user();

        if (Gate::forUser($viewer)->denies('view', $list)) {
            abort_if($list->visibility === ListVisibility::Private, 404);

            return response()->json([
                'visibility' => $list->visibility,
                'owner' => [
                    'id' => $list->owner->id,
                    'name' => $list->owner->name,
                    'username' => $list->owner->username,
                ],
            ], 403)->header('Cache-Control', 'private, no-store');
        }

        $response = response()->json($list->load(['owner:id,name,username', 'articles']));

        if ($list->visibility !== ListVisibility::Public) {
            $response->header('Cache-Control', 'private, no-store');
        }

        return $response;
    }
}
