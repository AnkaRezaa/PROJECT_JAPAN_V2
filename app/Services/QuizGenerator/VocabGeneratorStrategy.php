<?php

namespace App\Services\QuizGenerator;

use App\Contracts\QuizGeneratorStrategyInterface;
use App\Services\SoalKuisService;
use Illuminate\Validation\ValidationException;

final class VocabGeneratorStrategy implements QuizGeneratorStrategyInterface
{
    public function __construct(private readonly SoalKuisService $questions) {}

    public function generateDraft(array $payload, array $settings): array
    {
        $quiz = $payload['_quiz'];
        $filters = [...($payload['input'] ?? []), ...$settings, 'module_id' => $quiz->module_id,
            'jlpt_level' => $payload['level'], 'status' => $payload['input']['status'] ?? 'published'];
        $preview = $this->questions->previewFromVocabulary($quiz, $filters);
        $questions = [];
        foreach ($preview['questions'] as $index => $question) {
            $questions[] = QuizGeneratorDraft::question([
                'prompt' => $question['question_text'], 'reading' => $question['question_reading'],
                ...QuizGeneratorDraft::choices($question['options'], $question['correct_answer'], $question['option_readings']),
                'explanation' => $question['explanation'], 'explanation_reading' => $question['explanation_reading'] ?? null,
                'audio_url' => $question['audio_url'] ?? null, 'source' => ['type' => 'vocabulary', 'id' => $preview['vocabulary_ids'][$index]],
            ]);
        }

        return QuizGeneratorDraft::pack('vocab', $payload['level'], [], $questions);
    }

    public function regenerateSingleQuestion(string $id, array $context): array
    {
        $draft = $this->generateDraft($context['payload'], [...$context['settings'], 'count' => 1,
            'exclude_vocabulary_ids' => collect($context['existing_questions'])->pluck('source.id')->filter()->all()]);
        if (! $draft['questions']) {
            throw ValidationException::withMessages(['question_id' => 'Tidak ada kosakata alternatif untuk filter ini.']);
        }

        return [...$draft['questions'][0], 'id' => $id];
    }
}
