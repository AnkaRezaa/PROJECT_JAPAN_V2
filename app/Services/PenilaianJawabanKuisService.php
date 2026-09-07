<?php

namespace App\Services;

use App\Models\Soal;

class PenilaianJawabanKuisService
{
    public function benar(Soal $question, ?string $answer = null, array $payload = []): bool
    {
        return $this->benarUntukData(
            (string) $question->type,
            (string) $question->correct_answer,
            (array) ($question->options ?? []),
            $answer,
            $payload,
        );
    }

    public function benarUntukData(
        string $type,
        string $correctAnswer,
        array $options,
        ?string $answer = null,
        array $payload = []
    ): bool {
        if ($type === 'handwriting' || (bool) data_get($options, 'practice_only', false)) {
            $completed = (int) ($payload['completed_strokes'] ?? 0);
            $total = (int) ($payload['total_strokes'] ?? 0);
            $expected = (int) data_get($options, 'stroke_count', $total);

            return $expected > 0
                && $completed >= $expected
                && ! (bool) ($payload['revealed'] ?? false);
        }

        if ($type === 'sentence_builder') {
            $expected = json_decode($correctAnswer, true);
            $submitted = $payload['ordered_token_ids'] ?? [];

            return is_array($expected)
                && is_array($submitted)
                && array_values($submitted) === array_values($expected);
        }

        return $this->jawabanSama((string) $answer, $correctAnswer);
    }

    public function soalLatihan(Soal $question): bool
    {
        return $question->type === 'handwriting'
            || (bool) data_get($question->options, 'practice_only', false);
    }

    public function jawabanSama(string $answer, string $correctAnswer): bool
    {
        return $this->normalisasi($answer) === $this->normalisasi($correctAnswer);
    }

    public function handwritingDikuasai(array $payload, ?Soal $question = null): bool
    {
        $completed = (int) ($payload['completed_strokes'] ?? 0);
        $total = (int) ($payload['total_strokes'] ?? 0);
        $expected = (int) data_get($question?->options, 'stroke_count', $total);

        return $expected > 0
            && $completed >= $expected
            && ! (bool) ($payload['revealed'] ?? false);
    }

    private function normalisasi(string $value): string
    {
        return mb_strtolower(trim(preg_replace('/\s+/u', ' ', $value)));
    }
}
