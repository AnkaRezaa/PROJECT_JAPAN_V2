<?php

namespace App\Support;

use Illuminate\Validation\ValidationException;

final class QuestionHighlight
{
    public static function error(mixed $target, string $text): ?string
    {
        return self::resolve($target, $text)['error'];
    }

    public static function validated(mixed $target, string $text, string $field = 'highlight_text', bool $parse = true): array
    {
        $highlight = self::resolve($target, $text, $parse);
        if ($highlight['error']) {
            throw ValidationException::withMessages([$field => $highlight['error']]);
        }

        return $highlight;
    }

    /** @return array{text: string, target: ?string, error: ?string} */
    public static function resolve(mixed $target, string $text, bool $parse = true): array
    {
        $result = ['text' => $text, 'target' => null, 'error' => null];
        if ($target !== null && ! is_string($target)) {
            return [...$result, 'error' => 'Isi kata/frasa yang disorot dengan teks.'];
        }

        $value = trim($target ?? '');
        $markers = $parse ? self::markers($text) : [];
        if ($value === '') {
            $candidates = array_unique(array_column(array_filter($markers, fn ($marker) =>
                preg_match('/[\p{Han}\p{Hiragana}\p{Katakana}]/u', $marker['text'])
            ), 'text'));
            if (count($candidates) > 1) {
                return [...$result, 'error' => 'Ada beberapa penanda. Pilih satu kata/frasa yang disorot.'];
            }
            $value = $candidates[0] ?? '';
        }

        if (mb_strlen($value) > 500) {
            return [...$result, 'error' => 'Kata/frasa yang disorot maksimal 500 karakter.'];
        }
        if ($value !== '' && ! str_contains($text, $value)) {
            return [...$result, 'error' => 'Kata/frasa yang disorot harus ditemukan persis dalam kalimat soal.'];
        }

        // Strip only selected markers. Keep escaped delimiters so resaving is idempotent.
        foreach (array_reverse($markers) as $marker) {
            if ($marker['text'] === $value) {
                $text = substr_replace($text, $value, $marker['start'], $marker['length']);
            }
        }

        return ['text' => $text, 'target' => $value === '' ? null : $value, 'error' => null];
    }

    private static function markers(string $text): array
    {
        // Older generated questions use this final parenthesis for pronunciation.
        if (preg_match('/^Apa arti dari .+\s[（(][\p{Hiragana}\p{Katakana}ー・\s]+[）)]\?$/u', $text)) {
            return [];
        }

        preg_match_all('/\\\\[()（）]|[()（）]/u', $text, $tokens, PREG_OFFSET_CAPTURE);
        $markers = [];
        $depth = 0;
        $nested = false;
        $start = 0;
        $opening = '';

        foreach ($tokens[0] as [$token, $offset]) {
            if ($token === '(' || $token === '（') {
                if ($depth++ === 0) {
                    [$opening, $start, $nested] = [$token, $offset, false];
                } else {
                    $nested = true;
                }
            } elseif (($token === ')' || $token === '）') && $depth > 0 && --$depth === 0 && ! $nested) {
                if (($opening === '(' ? ')' : '）') !== $token) {
                    continue;
                }

                $contentStart = $start + strlen($opening);
                $value = trim(substr($text, $contentStart, $offset - $contentStart));
                if ($value !== '') {
                    $markers[] = ['text' => $value, 'start' => $start, 'length' => $offset + strlen($token) - $start];
                }
            }
        }

        return $markers;
    }
}
