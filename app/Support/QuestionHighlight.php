<?php

namespace App\Support;

use Illuminate\Validation\ValidationException;

final class QuestionHighlight
{
    public static function error(mixed $target, string $text): ?string
    {
        if ($target === null || (is_string($target) && trim($target) === '')) {
            return null;
        }
        if (! is_string($target) || mb_strlen($target) > 500) {
            return 'Kata/frasa yang disorot harus berupa teks maksimal 500 karakter.';
        }
        if (! str_contains($text, trim($target))) {
            return 'Kata/frasa yang disorot harus ditemukan persis dalam kalimat soal.';
        }

        return null;
    }

    public static function validated(mixed $target, string $text, string $field = 'highlight_text'): ?string
    {
        if ($error = self::error($target, $text)) {
            throw ValidationException::withMessages([$field => $error]);
        }

        $value = $target === null ? '' : trim($target);

        return $value === '' ? null : $value;
    }
}
