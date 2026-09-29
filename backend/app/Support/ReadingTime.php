<?php

namespace App\Support;

class ReadingTime
{
    public const WORDS_PER_MINUTE = 230;

    /**
     * Whole minutes needed to read a TipTap document, never less than one.
     *
     * @param  array<string, mixed>|null  $document
     */
    public static function minutesFor(?array $document): int
    {
        return max(1, (int) round(self::wordCount($document) / self::WORDS_PER_MINUTE));
    }

    /**
     * @param  array<string, mixed>|null  $document
     */
    public static function wordCount(?array $document): int
    {
        return count(preg_split('/\s+/u', trim(self::plainText($document ?? [])), -1, PREG_SPLIT_NO_EMPTY));
    }

    /**
     * @param  array<string, mixed>  $node
     */
    private static function plainText(array $node): string
    {
        $text = ($node['type'] ?? null) === 'text' ? (string) ($node['text'] ?? '') : '';

        foreach ($node['content'] ?? [] as $child) {
            if (is_array($child)) {
                $isInlineText = ($child['type'] ?? null) === 'text';
                $text .= ($isInlineText ? '' : ' ').self::plainText($child);
            }
        }

        return $text;
    }
}
