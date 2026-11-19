<?php

namespace App\Services;

use App\Models\Kuis;
use App\Support\QuestionHighlight;
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
            $existingQuestions = $quiz->questions()->get(['id', 'question_text', 'options', 'option_readings'])->keyBy('id');

            foreach ($payload['stages'] as $stageIndex => $stage) {
                foreach ($stage['questions'] as $questionIndex => $question) {
                    $prompt = trim((string) ($question['prompt'] ?? ''));
                    $existing = $existingQuestions->get($question['id'] ?? 0);
                    $parse = $existing?->question_text !== $prompt;
                    $normalized = $this->normalizeQuestion($stage['id'], $question, "stages.{$stageIndex}.questions.{$questionIndex}.highlight_text", $parse);
                    if ($stage['id'] !== 'sentence_builder' && ! array_key_exists('choices_reading', $question)
                        && ($existing?->options['choices'] ?? null) === $normalized['options']['choices']) {
                        $normalized['option_readings'] = $existing->option_readings;
                    }
                    $attributes = Arr::except($normalized, ['context']);
                    $model = $quiz->questions()->updateOrCreate(
                        ['id' => $question['id'] ?? null],
                        [...$attributes, 'order' => $order++]
                    );
                    $kept[] = $model->id;
                }
            }

            $questionsToDelete = $quiz->questions()
                ->whereNotIn('id', $kept)
                ->get();

            foreach ($questionsToDelete as $qToDelete) {
                if ($qToDelete->attemptAnswers()->exists()) {
                    throw ValidationException::withMessages([
                        'stages' => "Soal grammar '{$qToDelete->question_text}' tidak dapat dihapus karena sudah memiliki riwayat pengerjaan murid. Silakan perbarui konten soal atau jadikan draf.",
                    ]);
                }
                $qToDelete->delete();
            }

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

    public function normalizeQuestion(string $stage, array $question, string $highlightField = 'highlight_text', bool $parseHighlight = true): array
    {
        if (! in_array($stage, self::STAGES, true) || (($question['type'] ?? $stage) !== $stage && ($question['type'] ?? '') !== 'multiple_choice')) {
            throw ValidationException::withMessages(['stages' => 'Tipe soal harus sesuai dengan stage Grammar.']);
        }

        $options = [
            'source_text' => $stage === 'transformation' ? $this->nullableText($question['source_text'] ?? $question['japanese'] ?? null) : null,
            'source_reading' => $stage === 'transformation' ? $this->nullableText($question['source_reading'] ?? $question['reading'] ?? null) : null,
            'translation' => $this->nullableText($question['translation'] ?? null),
            'context' => $this->nullableText($question['context'] ?? null),
        ];
        $optionReadings = null;

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
            $choices = [];
            $readings = [];
            foreach ($question['choices'] ?? $question['options'] ?? [] as $index => $value) {
                $choice = $this->nullableText($value);
                if ($choice === null) continue;
                $choices[] = $choice;
                $readings[] = $this->nullableText($question['choices_reading'][$index] ?? null);
            }
            $correctAnswer = trim((string) ($question['correctAnswer'] ?? $question['correct_answer'] ?? ''));

            if (count($choices) < 2 || $correctAnswer === '' || ! in_array($correctAnswer, $choices, true)) {
                throw ValidationException::withMessages(['stages' => 'Pilihan dan jawaban benar Grammar tidak valid.']);
            }

            $options['choices'] = $choices;
            $optionReadings = array_filter($readings, fn ($reading) => $reading !== null) !== [] ? $readings : null;
        }

        $normalizedType = match ($stage) {
            'sentence_builder' => 'sentence_builder',
            'transformation' => 'transformation',
            default => 'multiple_choice',
        };
        $highlight = QuestionHighlight::validated($question['highlight_text'] ?? null, trim((string) ($question['prompt'] ?? '')), $highlightField, $parseHighlight);

        return [
            'type' => $question['type'] ?? $normalizedType,
            'stage' => $stage,
            'question_text' => $highlight['text'],
            'highlight_text' => $highlight['target'],
            'question_reading' => $options['source_reading'],
            'correct_answer' => $correctAnswer,
            'correct_answer_reading' => null,
            'options' => array_filter($options, fn ($value) => $value !== null),
            'context' => $options['context'] ?? null,
            'option_readings' => $optionReadings,
            'explanation' => $this->nullableText($question['explanation'] ?? $question['feedback'] ?? null),
            'explanation_reading' => null,
            'audio_url' => null,
            'points' => max(1, (int) ($question['points'] ?? 1)),
        ];
    }

    private function questionPayload($question, bool $includeAnswers): array
    {
        $options = $question->options ?? [];
        $isTransformation = $question->stage === 'transformation';
        $payload = [
            'id' => $question->id,
            'type' => $question->stage,
            'prompt' => $question->question_text,
            'highlight_text' => $question->highlight_text,
            'japanese' => ($includeAnswers || $isTransformation) ? Arr::get($options, 'source_text') : null,
            'reading' => ($includeAnswers || $isTransformation) ? Arr::get($options, 'source_reading') : null,
            'translation' => Arr::get($options, 'translation'),
            'context' => Arr::get($options, 'context'),
            'explanation' => $includeAnswers ? $question->explanation : null,
            'points' => max(1, (int) $question->points),
        ];

        if ($question->stage === 'sentence_builder') {
            $payload['tokens'] = Arr::get($options, 'tokens', []);
            if ($includeAnswers) {
                $payload['correctOrder'] = json_decode($question->correct_answer, true) ?: [];
            }
        } else {
            $payload['choices'] = Arr::get($options, 'choices', []);
            $payload['choices_reading'] = $question->option_readings ?? [];
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
