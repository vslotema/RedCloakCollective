<?php

namespace App\Policies;

use App\Enums\ListVisibility;
use App\Models\ReadingList;
use App\Models\User;

class ReadingListPolicy
{
    /**
     * Whether the given viewer (possibly a guest) may see this list's content.
     */
    public function view(?User $user, ReadingList $list): bool
    {
        return match ($list->visibility) {
            ListVisibility::Public => true,
            ListVisibility::Private => $user?->id === $list->user_id,
            ListVisibility::Followers => $user?->id === $list->user_id
                || ($user && $list->owner->followers()->where('follower_id', $user->id)->exists()),
        };
    }
}
