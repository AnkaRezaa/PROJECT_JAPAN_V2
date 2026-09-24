<?php

namespace App\Services;

use App\Models\Kuis;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class KuisGrammarService
{
    public const STAGES = ['transformation', 'sentence_builder', 'context_choice'];

    public function sync(Kuis $quiz, array $payload): Kuis
    {
        abort_unless($quiz->isGrammar(), 422, 'Kuis ini bukan lesson Grammar.');

        return DB::transaction(function () use ($quiz, $payload) {
            $lesson = $payload['lesson'];
            $quiz->update([
                'time_limit' => $payload['time_limit'] ?? null,
                'passing_score' => $payload['passing_score'] ?? 70,
            ]);

            $quiz->grammarLesson()->updateOrCreate([], [
                'lesson_key' => $lesson['lesson_key'] ?? $this->lessonKey($quiz, $lesson['title']),
                'level' => $lesson['level'] ?? null,
                'pattern' => trim($lesson['pattern']),
                'title' => trim($lesson['title']),
                'meaning' => trim($lesson['meaning']),
                'formula' => trim($lesson['formula']),
                'explanation' => $this->nullableText($lesson['explanation'] ?? null),
                'examples' => array_values($lesson['examples'] ?? []),
                'settings' => $payload['settings'] ?? null,
            ]);

            $kept = [];
            $order = 0;

            foreach ($payload['stages'] as $stage) {
                foreach ($stage['questions'] as $question) {
                    $normalized = $this->normalizeQuestion($stage['id'], $question);
                    $attributes = Arr::except($normalized, ['context']);
                    $model = $quiz->questions()->updateOrCreate(
                        ['id' => $question['id'] ?? null],
                        [...$attributes, 'order' => $order++]
                    );
                    $kept[] = $model->id;
                }
            }

            $quiz->questions()->whereNotIn('id', $kept)->delete();

            return $quiz->fresh(['grammarLesson', 'questions']);
        });
    }

    public function assertPublishable(Kuis $quiz): void
    {
        $quiz->loadMissing(['grammarLesson', 'questions']);
        $errors = [];

        if (! $quiz->grammarLesson) {
            $errors[] = 'Materi Grammar belum lengkap.';
        }

        foreach (self::STAGES as $stage) {
            if ($quiz->questions->where('stage', $stage)->isEmpty()) {
                $errors[] = "Stage {$stage} belum memiliki soal.";
            }
        }

        if ($errors !== []) {
            throw ValidationException::withMessages(['status' => $errors]);
        }
    }

    public function payload(Kuis $quiz, bool $includeAnswers = false): array
    {
        $quiz->loadMissing(['grammarLesson', 'questions']);
        $lesson = $quiz->grammarLesson;

        return [
            'id' => $quiz->id,
            'category' => 'grammar',
            'lessonKey' => $lesson?->lesson_key,
            'status' => $quiz->status,
            'title' => $lesson?->title,
            'pattern' => $lesson?->pattern,
            'level' => $lesson?->level,
            'passingScore' => (int) ($quiz->passing_score ?? 70),
            'timeLimit' => $quiz->time_limit,
            'intro' => [
                'meaning' => $lesson?->meaning,
                'formula' => $lesson?->formula,
                'explanation' => $lesson?->explanation,
                'examples' => $lesson?->examples ?? [],
            ],
            'settings' => $lesson?->settings ?? null,
            'stages' => collect(self::STAGES)->map(function (string $stage) use ($quiz, $includeAnswers) {
                return [
                    'id' => $stage,
                    'label' => str($stage)->replace('_', ' ')->title()->toString(),
                    'questions' => $quiz->questions
                        ->where('stage', $stage)
                        ->map(fn ($question) => $this->questionPayload($question, $includeAnswers))
                        ->values(),
                ];
            })->values(),
        ];
    }

    public function normalizeQuestion(string $stage, array $question): array
    {
        if (! in_array($stage, self::STAGES, true) || (($question['type'] ?? $stage) !== $stage && ($question['type'] ?? '') !== 'multiple_choice')) {
            throw ValidationException::withMessages(['stages' => 'Tipe soal harus sesuai dengan stage Grammar.']);
        }

        $options = [
            'source_text' => $this->nullableText($question['source_text'] ?? $question['japanese'] ?? null),
            'source_reading' => $this->nullableText($question['source_reading'] ?? $question['reading'] ?? null),
            'translation' => $this->nullableText($question['translation'] ?? null),
            'context' => $this->nullableText($question['context'] ?? null),
        ];

        if ($stage === 'sentence_builder') {
            $tokens = array_values($question['tokens'] ?? []);
            $correctOrder = array_values($question['correctOrder'] ?? $question['correct_order'] ?? []);
            $tokenIds = collect($tokens)->pluck('id')->filter()->all();

            if (count($tokens) < 2 || $correctOrder === [] || array_diff($correctOrder, $tokenIds) !== []) {
                throw ValidationException::withMessages(['stages' => 'Token dan urutan benar Sentence Builder tidak valid.']);
            }

            $options['tokens'] = $tokens;
            $correctAnswer = json_encode($correctOrder, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
        } else {
            $choices = array_values(array_filter($question['choices'] ?? $question['options'] ?? [], fn ($value) => filled($value)));
            $correctAnswer = trim((string) ($question['correctAnswer'] ?? $question['correct_answer'] ?? ''));

            if (count($choices) < 2 || $correctAnswer === '' || ! in_array($correctAnswer, $choices, true)) {
                throw ValidationException::withMessages(['stages' => 'Pilihan dan jawaban benar Grammar tidak valid.']);
            }

            $options['choices'] = $choices;
        }

        $normalizedType = match ($stage) {
            'sentence_builder' => 'sentence_builder',
            'transformation' => 'transformation',
            default => 'multiple_choice',
        };

        return [
            'type' => $question['type'] ?? $normalizedType,
            'stage' => $stage,
            'question_text' => trim((string) ($question['prompt'] ?? '')),
            'question_reading' => $options['source_reading'],
            'correct_answer' => $correctAnswer,
            'correct_answer_reading' => null,
            'options' => array_filter($options, fn ($value) => $value !== null),
            'context' => $options['context'] ?? null,
            'option_readings' => null,
            'explanation' => $this->nullableText($question['explanation'] ?? $question['feedback'] ?? null),
            'explanation_reading' => null,
            'audio_url' => null,
            'points' => max(1, (int) ($question['points'] ?? 1)),
        ];
    }

    private function questionPayload($question, bool $includeAnswers): array
    {
        $options = $question->options ?? [];
        $payload = [
            'id' => $question->id,
            'type' => $question->stage,
            'prompt' => $question->question_text,
            'japanese' => Arr::get($options, 'source_text'),
            'reading' => Arr::get($options, 'source_reading'),
            'translation' => Arr::get($options, 'translation'),
            'context' => Arr::get($options, 'context'),
            'explanation' => $question->explanation,
            'points' => max(1, (int) $question->points),
        ];

        if ($question->stage === 'sentence_builder') {
            $payload['tokens'] = Arr::get($options, 'tokens', []);
            if ($includeAnswers) {
                $payload['correctOrder'] = json_decode($question->correct_answer, true) ?: [];
            }
        } else {
            $payload['choices'] = Arr::get($options, 'choices', []);
            if ($includeAnswers) {
                $payload['correctAnswer'] = $question->correct_answer;
            }
        }

        return $payload;
    }

    private function lessonKey(Kuis $quiz, string $title): string
    {
        return Str::slug($title).'-d'.$quiz->module_day_id.'-'.$quiz->id;
    }

    private function nullableText(mixed $value): ?string
    {
        $value = trim((string) $value);

        return $value !== '' ? $value : null;
    }
}
