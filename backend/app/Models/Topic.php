<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

#[Fillable(['name'])]
class Topic extends Model
{
    public function followers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'topic_follows', 'topic_id', 'user_id')
            ->withTimestamps();
    }
}
