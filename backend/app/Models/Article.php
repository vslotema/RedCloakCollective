<?php

namespace App\Models;

use Database\Factories\ArticleFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Facades\Storage;

#[Fillable(['title', 'slug', 'content', 'published_at', 'header_image_path', 'header_image_position'])]
#[Hidden(['header_image_path'])]
class Article extends Model
{
    /** @use HasFactory<ArticleFactory> */
    use HasFactory;

    /**
     * Derived fields the frontend reads off every article payload — a full URL
     * for the header image, and the published/draft state (backed by the
     * nullable published_at timestamp).
     *
     * @var list<string>
     */
    protected $appends = ['header_image_url', 'published'];

    protected function casts(): array
    {
        return [
            'published_at' => 'datetime',
            'content' => 'array',
            'header_image_position' => 'array',
        ];
    }

    protected function headerImageUrl(): Attribute
    {
        return Attribute::get(fn (): ?string => $this->header_image_path
            ? Storage::disk('public')->url($this->header_image_path)
            : null);
    }

    protected function published(): Attribute
    {
        return Attribute::get(fn (): bool => $this->published_at !== null
            && $this->published_at->lessThanOrEqualTo(now()));
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function lists(): BelongsToMany
    {
        return $this->belongsToMany(ReadingList::class, 'list_items', 'article_id', 'list_id')
            ->withTimestamps();
    }

    public function topics(): BelongsToMany
    {
        return $this->belongsToMany(Topic::class, 'article_topic')
            ->withTimestamps();
    }
}
