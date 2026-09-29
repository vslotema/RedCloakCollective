<?php

namespace Tests\Feature;

use App\Models\Article;
use App\Models\User;
use App\Support\ReadingTime;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ArticleReadingTimeTest extends TestCase
{
    use RefreshDatabase;

    private function documentWithWords(int $wordCount): array
    {
        return [
            'type' => 'doc',
            'content' => [[
                'type' => 'paragraph',
                'content' => [['type' => 'text', 'text' => trim(str_repeat('word ', $wordCount))]],
            ]],
        ];
    }

    public function test_short_documents_take_at_least_one_minute(): void
    {
        $this->assertSame(1, ReadingTime::minutesFor(null));
        $this->assertSame(1, ReadingTime::minutesFor($this->documentWithWords(10)));
    }

    public function test_minutes_are_rounded_from_the_word_count(): void
    {
        $this->assertSame(3, ReadingTime::minutesFor($this->documentWithWords(ReadingTime::WORDS_PER_MINUTE * 3)));
    }

    public function test_formatted_pieces_of_one_word_count_as_one_word(): void
    {
        $document = [
            'type' => 'doc',
            'content' => [
                ['type' => 'paragraph', 'content' => [
                    ['type' => 'text', 'text' => 'bo'],
                    ['type' => 'text', 'text' => 'ld', 'marks' => [['type' => 'bold']]],
                ]],
                ['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'next']]],
            ],
        ];

        $this->assertSame(2, ReadingTime::wordCount($document));
    }

    public function test_reading_minutes_are_stored_when_content_is_saved(): void
    {
        $article = Article::factory()->for(User::factory(), 'author')->create([
            'content' => $this->documentWithWords(ReadingTime::WORDS_PER_MINUTE * 4),
        ]);

        $this->assertSame(4, $article->fresh()->reading_minutes);

        $article->update(['content' => $this->documentWithWords(ReadingTime::WORDS_PER_MINUTE * 2)]);

        $this->assertSame(2, $article->fresh()->reading_minutes);
    }

    public function test_public_article_payload_includes_reading_minutes(): void
    {
        $article = Article::factory()->for(User::factory(), 'author')->create([
            'content' => $this->documentWithWords(ReadingTime::WORDS_PER_MINUTE * 5),
        ]);

        $this->getJson("/api/articles/{$article->slug}")
            ->assertOk()
            ->assertJsonPath('reading_minutes', 5);
    }
}
