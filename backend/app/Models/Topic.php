<?php

namespace App\Models;

use Database\Factories\TopicFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

#[Fillable(['name', 'slug', 'curated'])]
class Topic extends Model
{
    /** @use HasFactory<TopicFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return ['curated' => 'boolean'];
    }

    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    /**
     * Turn a display name into a stable slug used to dedupe topics (existing or
     * author-created) so "Feeding tips" and "feeding tips" collapse to one row.
     */
    public static function slugFor(string $name): string
    {
        return \Illuminate\Support\Str::slug($name);
    }

    public function followers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'topic_follows', 'topic_id', 'user_id')
            ->withTimestamps();
    }

    public function articles(): BelongsToMany
    {
        return $this->belongsToMany(Article::class, 'article_topic')
            ->withTimestamps();
    }
}
