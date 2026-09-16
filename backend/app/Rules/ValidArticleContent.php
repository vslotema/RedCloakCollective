<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Structural guard for the TipTap / ProseMirror `content` JSON. The node and
 * mark whitelists mirror the dispatch table in
 * public-web/lib/article-render.ts — keep the two in step; an unlisted node
 * type here means an editor feature can no longer save, not just render oddly.
 */
class ValidArticleContent implements ValidationRule
{
    /** Generous ceiling for a long article — images are uploaded separately and referenced by URL. */
    private const MAX_BYTES = 200_000;

    /** Bounds recursion so a small-but-deeply-nested payload can't blow the call stack. */
    private const MAX_DEPTH = 64;

    private const NODE_TYPES = [
        'doc', 'paragraph', 'text', 'heading', 'hardBreak', 'horizontalRule',
        'bulletList', 'orderedList', 'listItem', 'blockquote', 'codeBlock',
        'image', 'linkCard', 'videoEmbed',
    ];

    private const MARK_TYPES = ['bold', 'italic', 'strike', 'underline', 'code', 'link'];

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_array($value)) {
            $fail('The :attribute must be a document.');

            return;
        }

        $encoded = json_encode($value);
        if ($encoded === false || strlen($encoded) > self::MAX_BYTES) {
            $fail('The :attribute is too large.');

            return;
        }

        if (($value['type'] ?? null) !== 'doc') {
            $fail('The :attribute must be a TipTap document.');

            return;
        }

        if ($problem = $this->firstInvalidNode($value)) {
            $fail("The :attribute contains an unsupported {$problem}.");
        }
    }

    /**
     * @param  array<string, mixed>  $node
     */
    private function firstInvalidNode(array $node, int $depth = 0): ?string
    {
        if ($depth > self::MAX_DEPTH) {
            return 'nesting depth';
        }

        $type = $node['type'] ?? null;
        if (! is_string($type) || ! in_array($type, self::NODE_TYPES, true)) {
            return 'node type "'.(is_string($type) ? $type : gettype($type)).'"';
        }

        foreach ($node['marks'] ?? [] as $mark) {
            $markType = is_array($mark) ? ($mark['type'] ?? null) : null;
            if (! is_string($markType) || ! in_array($markType, self::MARK_TYPES, true)) {
                return 'mark type "'.(is_string($markType) ? $markType : gettype($markType)).'"';
            }
        }

        foreach ($node['content'] ?? [] as $child) {
            if (! is_array($child)) {
                return 'node';
            }

            if ($problem = $this->firstInvalidNode($child, $depth + 1)) {
                return $problem;
            }
        }

        return null;
    }
}
