<?php

namespace Database\Factories;

use App\Models\Article;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Article>
 */
class ArticleFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $title = fake()->sentence();

        return [
            'user_id' => User::factory(),
            'title' => $title,
            'slug' => Str::slug($title).'-'.Str::lower(Str::random(6)),
            'content' => [
                'type' => 'doc',
                'content' => [
                    [
                        'type' => 'paragraph',
                        'content' => [['type' => 'text', 'text' => fake()->paragraph()]],
                    ],
                ],
            ],
            'header_image_path' => null,
            'header_image_position' => null,
            'published_at' => now(),
        ];
    }

    /**
     * A draft — not visible on the public content surface.
     */
    public function unpublished(): static
    {
        return $this->state(fn (array $attributes) => [
            'published_at' => null,
        ]);
    }

    /**
     * Has a header image already "uploaded" (path only — no real file on disk
     * unless the test faked the storage and put one there).
     */
    public function withHeaderImage(string $path = 'article-headers/example.jpg'): static
    {
        return $this->state(fn (array $attributes) => [
            'header_image_path' => $path,
            'header_image_position' => ['x' => 50, 'y' => 50],
        ]);
    }
}
