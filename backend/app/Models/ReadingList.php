<?php

namespace App\Models;

use App\Enums\ListVisibility;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

#[Fillable(['name', 'visibility'])]
class ReadingList extends Model
{
    protected $table = 'lists';

    protected function casts(): array
    {
        return [
            'visibility' => ListVisibility::class,
        ];
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function articles(): BelongsToMany
    {
        return $this->belongsToMany(Article::class, 'list_items', 'list_id', 'article_id')
            ->withTimestamps();
    }

    public function followers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'list_follows', 'list_id', 'user_id')
            ->withTimestamps();
    }
}
