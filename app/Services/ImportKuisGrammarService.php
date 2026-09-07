<?php

namespace App\Services;

use App\Models\Kuis;
use App\Models\ProgramPembelajaran;
use Illuminate\Support\Facades\DB;

class ImportKuisGrammarService
{
    public function __construct(private readonly KuisGrammarService $grammar) {}

    public function preview(ProgramPembelajaran $program, array $sheets): array
    {
        $materials = collect($sheets['materi'] ?? []);
        $exampleRows = collect($sheets['contoh'] ?? [])->values();
        $questionRows = collect($sheets['soal'] ?? [])->values();
        $examples = $exampleRows->groupBy('lesson_key');
        $questions = $questionRows->groupBy('lesson_key');
        $lessons = [];
        $errors = [];

        if (! isset($sheets['materi'], $sheets['contoh'], $sheets['soal'])) {
            $errors[] = $this->error('Workbook', 1, 'sheet', 'Sheet Materi, Contoh, dan Soal wajib tersedia.');
        }

        foreach ($exampleRows as $index => $row) {
            foreach (['lesson_key', 'japanese', 'translation'] as $column) {
                if (! filled($row[$column] ?? null)) {
                    $errors[] = $this->error('Contoh', $index + 2, $column, 'Kolom wajib diisi.');
                }
            }
        }

        foreach ($questionRows as $index => $row) {
            $rowNumber = $index + 2;
            $stage = trim((string) ($row['stage'] ?? ''));
            $items = $this->pipeValues($row['options_or_tokens'] ?? '');
            $correct = $this->pipeValues($row['correct_answer_or_order'] ?? '');

            foreach (['lesson_key', 'stage', 'prompt', 'options_or_tokens', 'correct_answer_or_order'] as $column) {
                if (! filled($row[$column] ?? null)) {
                    $errors[] = $this->error('Soal', $rowNumber, $column, 'Kolom wajib diisi.');
                }
            }
            if ($stage !== '' && ! in_array($stage, KuisGrammarService::STAGES, true)) {
                $errors[] = $this->error('Soal', $rowNumber, 'stage', 'Stage harus transformation, sentence_builder, atau context_choice.');
            }
            if (count($items) < 2) {
                $errors[] = $this->error('Soal', $rowNumber, 'options_or_tokens', 'Minimal dua pilihan atau token diperlukan.');
            }
            if ($correct === []) {
                $errors[] = $this->error('Soal', $rowNumber, 'correct_answer_or_order', 'Jawaban benar wajib diisi.');
            }
            if ($stage !== 'sentence_builder' && count($correct) > 1) {
                $errors[] = $this->error('Soal', $rowNumber, 'correct_answer_or_order', 'Soal pilihan hanya boleh memiliki satu jawaban benar.');
            }
            if ($correct !== [] && ! $this->isMultisetSubset($correct, $items)) {
                $errors[] = $this->error('Soal', $rowNumber, 'correct_answer_or_order', 'Jawaban benar harus tersedia pada pilihan atau token.');
            }
            if (filled($row['points'] ?? null) && (! is_numeric($row['points']) || (int) $row['points'] < 1)) {
                $errors[] = $this->error('Soal', $rowNumber, 'points', 'Points harus berupa angka minimal 1.');
            }
        }

        foreach ($materials as $index => $row) {
            $rowNumber = $index + 2;
            $key = trim((string) ($row['lesson_key'] ?? ''));
            foreach (['lesson_key', 'module_week', 'day_number', 'pattern', 'title', 'meaning', 'formula'] as $column) {
                if (! filled($row[$column] ?? null)) {
                    $errors[] = $this->error('Materi', $rowNumber, $column, 'Kolom wajib diisi.');
                }
            }
            if ($key === '') {
                continue;
            }
            if (! preg_match('/^[a-z0-9][a-z0-9-]*$/', $key)) {
                $errors[] = $this->error('Materi', $rowNumber, 'lesson_key', 'Gunakan huruf kecil, angka, dan tanda hubung saja.');
            }
            if (isset($lessons[$key])) {
                $errors[] = $this->error('Materi', $rowNumber, 'lesson_key', 'lesson_key duplikat pada sheet Materi.');

                continue;
            }

            $module = $program->modules()->where('week_number', (int) ($row['module_week'] ?? 0))->first();
            $day = $module?->days()->where('day_number', (int) ($row['day_number'] ?? 0))->first();
            if (! $module || ! $day) {
                $errors[] = $this->error('Materi', $rowNumber, 'module_week', 'Kombinasi Week dan Day tidak ditemukan pada kelas ini.');

                continue;
            }

            $lessonExamples = $examples->get($key, collect())->values()->map(fn ($example) => [
                'japanese' => trim((string) ($example['japanese'] ?? '')),
                'reading' => trim((string) ($example['reading'] ?? '')) ?: null,
                'translation' => trim((string) ($example['translation'] ?? '')),
            ])->all();
            if ($lessonExamples === []) {
                $errors[] = $this->error('Contoh', 1, 'lesson_key', "Tidak ada contoh untuk {$key}.");
            }

            $stages = collect(KuisGrammarService::STAGES)->map(fn ($stage) => [
                'id' => $stage,
                'questions' => $questions->get($key, collect())
                    ->filter(fn ($question) => ($question['stage'] ?? null) === $stage)
                    ->values()
                    ->map(fn ($question, $questionIndex) => $this->questionPayload($stage, $question, $questionIndex))
                    ->all(),
            ])->all();

            foreach ($stages as $stage) {
                if ($stage['questions'] === []) {
                    $errors[] = $this->error('Soal', 1, 'stage', "Stage {$stage['id']} untuk {$key} belum memiliki soal.");
                }
            }

            $lessons[$key] = [
                'module_id' => $module->id,
                'module_day_id' => $day->id,
                'time_limit' => null,
                'passing_score' => 70,
                'lesson' => [
                    'lesson_key' => $key,
                    'level' => trim((string) ($row['level'] ?? '')) ?: null,
                    'pattern' => trim((string) ($row['pattern'] ?? '')),
                    'title' => trim((string) ($row['title'] ?? '')),
                    'meaning' => trim((string) ($row['meaning'] ?? '')),
                    'formula' => trim((string) ($row['formula'] ?? '')),
                    'explanation' => trim((string) ($row['explanation'] ?? '')) ?: null,
                    'examples' => $lessonExamples,
                ],
                'stages' => $stages,
            ];
        }

        $knownKeys = array_keys($lessons);
        foreach (['contoh' => $examples, 'soal' => $questions] as $sheet => $groups) {
            foreach ($groups->keys()->diff($knownKeys) as $orphanKey) {
                $errors[] = $this->error(ucfirst($sheet), 1, 'lesson_key', "{$orphanKey} tidak ditemukan pada sheet Materi.");
            }
        }

        return [
            'valid' => $errors === [],
            'lesson_count' => count($lessons),
            'example_count' => collect($lessons)->sum(fn ($lesson) => count($lesson['lesson']['examples'])),
            'question_count' => collect($lessons)->sum(fn ($lesson) => collect($lesson['stages'])->sum(fn ($stage) => count($stage['questions']))),
            'lessons' => array_values($lessons),
            'errors' => array_slice($errors, 0, 100),
        ];
    }

    public function commit(ProgramPembelajaran $program, array $preview): int
    {
        abort_unless($preview['valid'], 422, 'Workbook Grammar belum valid.');

        return DB::transaction(function () use ($program, $preview) {
            $count = 0;
            foreach ($preview['lessons'] as $payload) {
                $existing = Kuis::query()
                    ->where('type', 'grammar')
                    ->whereHas('grammarLesson', fn ($query) => $query->where('lesson_key', $payload['lesson']['lesson_key']))
                    ->first();

                if ($existing && (int) $existing->module?->program_pembelajaran_id !== (int) $program->id) {
                    abort(422, 'lesson_key sudah digunakan oleh kelas lain.');
                }

                $quiz = $existing ?: Kuis::create([
                    'module_id' => $payload['module_id'],
                    'module_day_id' => $payload['module_day_id'],
                    'type' => 'grammar',
                    'passing_score' => 70,
                    'status' => 'draft',
                ]);
                $quiz->update([
                    'module_id' => $payload['module_id'],
                    'module_day_id' => $payload['module_day_id'],
                    'exam_order' => null,
                    'status' => 'draft',
                ]);
                $this->grammar->sync($quiz, $payload);
                $count++;
            }

            return $count;
        });
    }

    private function questionPayload(string $stage, array $row, int $index): array
    {
        $items = $this->pipeValues($row['options_or_tokens'] ?? '');
        $correct = $this->pipeValues($row['correct_answer_or_order'] ?? '');
        $payload = [
            'type' => $stage,
            'prompt' => trim((string) ($row['prompt'] ?? '')),
            'japanese' => trim((string) ($row['source_text'] ?? '')) ?: null,
            'context' => trim((string) ($row['context'] ?? '')) ?: null,
            'explanation' => trim((string) ($row['feedback'] ?? '')) ?: null,
            'points' => max(1, (int) ($row['points'] ?? 1)),
        ];

        if ($stage !== 'sentence_builder') {
            return $payload + ['choices' => $items, 'correctAnswer' => $correct[0] ?? ''];
        }

        $remainingCorrect = array_count_values($correct);
        $tokens = collect($items)->map(function ($text, $tokenIndex) use (&$remainingCorrect, $index) {
            $isAnswerToken = ($remainingCorrect[$text] ?? 0) > 0;
            if ($isAnswerToken) {
                $remainingCorrect[$text]--;
            }

            return [
                'id' => 'q'.($index + 1).'t'.($tokenIndex + 1),
                'text' => $text,
                'distractor' => ! $isAnswerToken,
            ];
        })->all();
        $idsByText = collect($tokens)->groupBy('text')->map(fn ($matches) => $matches->pluck('id')->values()->all())->all();
        $correctOrder = [];
        foreach ($correct as $text) {
            $matches = $idsByText[$text] ?? [];
            $correctOrder[] = array_shift($matches) ?? '';
            $idsByText[$text] = $matches;
        }

        return $payload + [
            'tokens' => $tokens,
            'correctOrder' => $correctOrder,
        ];
    }

    private function pipeValues(mixed $value): array
    {
        return array_values(array_filter(array_map('trim', explode('|', (string) $value)), fn ($item) => $item !== ''));
    }

    private function isMultisetSubset(array $subset, array $set): bool
    {
        $available = array_count_values($set);

        foreach ($subset as $value) {
            if (($available[$value] ?? 0) < 1) {
                return false;
            }
            $available[$value]--;
        }

        return true;
    }

    private function error(string $sheet, int $row, string $column, string $message): array
    {
        return compact('sheet', 'row', 'column', 'message');
    }
}
