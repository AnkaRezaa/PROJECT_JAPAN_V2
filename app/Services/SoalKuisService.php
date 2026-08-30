<?php

namespace App\Services;

use App\Models\Kosakata;
use App\Models\Kuis;
use App\Models\Soal;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SoalKuisService
{
    private ?array $strokeManifest = null;

    public function importHeaders(): array
    {
        return [
            'module_week', 'day_number', 'type',
            'question_text', 'question_reading',
            'correct_answer', 'correct_answer_reading',
            'options', 'option_readings',
            'explanation', 'explanation_reading',
            'audio_url', 'points',
        ];
    }

    public function syncQuestions(Kuis $quiz, array $validated): void
    {
        if (collect($validated['questions'])->contains('type', 'handwriting')) {
            throw ValidationException::withMessages([
                'questions' => 'Handwriting dikelola dari flashcard pada tab Handwriting, bukan sebagai soal kuis.',
            ]);
        }

        $questionIds = [];

        DB::transaction(function () use ($quiz, $validated, &$questionIds) {
            $quiz->update([
                'time_limit' => $validated['time_limit'] ?? null,
            ]);

            foreach ($validated['questions'] as $index => $data) {
                $normalized = $this->normalizePayload($data, $index);

                if ($normalized['error']) {
                    throw ValidationException::withMessages([
                        'questions' => $normalized['error'],
                    ]);
                }

                $question = $quiz->questions()->updateOrCreate(
                    ['id' => $data['id'] ?? null],
                    [
                        'type' => $normalized['type'],
                        'question_text' => $normalized['question_text'],
                        'question_reading' => $normalized['question_reading'],
                        'correct_answer' => $normalized['correct_answer'],
                        'correct_answer_reading' => $normalized['correct_answer_reading'],
                        'options' => $normalized['options'],
                        'option_readings' => $normalized['option_readings'],
                        'explanation' => $normalized['explanation'],
                        'explanation_reading' => $normalized['explanation_reading'],
                        'audio_url' => $normalized['audio_url'],
                        'order' => $index,
                        'points' => $normalized['points'],
                    ]
                );

                $questionIds[] = $question->id;
            }

            $quiz->questions()
                ->where('type', '!=', 'handwriting')
                ->whereNotIn('id', $questionIds)
                ->delete();
        });
    }

    public function importRows(Kuis $quiz, array $rows): int
    {
        foreach ($rows as $index => $row) {
            if ($scopeError = $this->importScopeError($quiz, $row, $index)) {
                throw ValidationException::withMessages(['import_file' => $scopeError]);
            }
        }

        $nextOrder = (int) $quiz->questions()->max('order') + 1;
        $created = 0;

        DB::transaction(function () use ($rows, $quiz, $nextOrder, &$created) {
            foreach ($rows as $index => $row) {
                $normalized = $this->normalizeImportRow($quiz, $row, $index);

                if ($normalized['error']) {
                    continue;
                }

                Soal::create([
                    'quiz_id' => $quiz->id,
                    'type' => $normalized['type'],
                    'question_text' => $normalized['question_text'],
                    'question_reading' => $normalized['question_reading'],
                    'correct_answer' => $normalized['correct_answer'],
                    'correct_answer_reading' => $normalized['correct_answer_reading'],
                    'options' => $normalized['options'],
                    'option_readings' => $normalized['option_readings'],
                    'explanation' => $normalized['explanation'],
                    'explanation_reading' => $normalized['explanation_reading'],
                    'audio_url' => $normalized['audio_url'],
                    'order' => $nextOrder + $index,
                    'points' => $normalized['points'],
                ]);

                $created++;
            }
        });

        return $created;
    }

    public function previewRows(Kuis $quiz, array $rows): array
    {
        $validRows = [];
        $errors = [];

        foreach ($rows as $index => $row) {
            $normalized = $this->normalizeImportRow($quiz, $row, $index);

            if ($normalized['error']) {
                $errors[] = [
                    'row' => $index + 2,
                    'message' => $normalized['error'],
                    'question_text' => $normalized['question_text'],
                ];

                continue;
            }

            $validRows[] = [
                'row' => $index + 2,
                'type' => $normalized['type'],
                'question_text' => $normalized['question_text'],
                'question_reading' => $normalized['question_reading'],
                'correct_answer' => $normalized['correct_answer'],
                'correct_answer_reading' => $normalized['correct_answer_reading'],
                'options' => $normalized['options'] ?? [],
                'option_readings' => $normalized['option_readings'] ?? [],
                'explanation' => $normalized['explanation'],
                'explanation_reading' => $normalized['explanation_reading'],
                'audio_url' => $normalized['audio_url'],
                'points' => $normalized['points'],
            ];
        }

        return [
            'total_rows' => count($rows),
            'valid_count' => count($validRows),
            'invalid_count' => count($errors),
            'valid_rows' => array_slice($validRows, 0, 10),
            'errors' => array_slice($errors, 0, 30),
            'has_more_valid_rows' => count($validRows) > 10,
            'has_more_errors' => count($errors) > 30,
        ];
    }

    public function generateFromVocabulary(Kuis $quiz, array $filters): int
    {
        $generated = $this->vocabularyQuestionPayloads($quiz, $filters);
        $nextOrder = (int) $quiz->questions()->max('order') + 1;
        $created = 0;

        DB::transaction(function () use ($quiz, $generated, $nextOrder, &$created) {
            foreach ($generated as $payload) {
                Soal::create([
                    'quiz_id' => $quiz->id,
                    'type' => $payload['type'] ?? 'multiple_choice',
                    'question_text' => $payload['question_text'],
                    'question_reading' => $payload['question_reading'] ?? null,
                    'correct_answer' => $payload['correct_answer'],
                    'correct_answer_reading' => $payload['correct_answer_reading'] ?? null,
                    'options' => $payload['options'],
                    'option_readings' => $payload['option_readings'] ?? null,
                    'explanation' => $payload['explanation'],
                    'explanation_reading' => $payload['explanation_reading'] ?? null,
                    'audio_url' => $payload['audio_url'],
                    'order' => $nextOrder + $created,
                    'points' => 1,
                ]);

                $created++;
            }
        });

        if ($created === 0) {
            throw ValidationException::withMessages([
                'generate' => 'Tidak ada konten valid yang bisa dijadikan soal.',
            ]);
        }

        return $created;
    }

    public function previewFromVocabulary(Kuis $quiz, array $filters): array
    {
        $generated = $this->vocabularyQuestionPayloads($quiz, $filters);

        return [
            'count' => count($generated),
            'vocabulary_ids' => collect($generated)->pluck('vocabulary_id')->values()->all(),
            'questions' => collect($generated)->map(fn (array $payload) => [
                'type' => $payload['type'] ?? 'multiple_choice',
                'question_text' => $payload['question_text'],
                'question_reading' => $payload['question_reading'] ?? null,
                'correct_answer' => $payload['correct_answer'],
                'correct_answer_reading' => $payload['correct_answer_reading'] ?? null,
                'options' => $payload['options'],
                'option_readings' => $payload['option_readings'] ?? [],
                'explanation' => $payload['explanation'],
                'explanation_reading' => $payload['explanation_reading'] ?? null,
            ])->values()->all(),
        ];
    }

    public function writingCharacters(string ...$values): array
    {
        $manifest = $this->strokeManifest();
        $characters = collect($values)
            ->flatMap(fn (string $value) => preg_split('//u', $value, -1, PREG_SPLIT_NO_EMPTY) ?: [])
            ->unique()
            ->filter(fn (string $character) => isset($manifest[$character]))
            ->map(fn (string $character) => [
                'character' => $character,
                ...$manifest[$character],
            ])
            ->values();

        return $characters->all();
    }

    private function vocabularyQuestionPayloads(Kuis $quiz, array $filters): array
    {
        $mode = $filters['mode'] ?? 'word_to_meaning';
        $count = min(50, max(1, (int) ($filters['count'] ?? 10)));
        $status = $filters['status'] ?? 'published';
        $contentType = $filters['content_type'] ?? 'all';
        $moduleId = $filters['module_id'] ?? $quiz->module_id;
        $selectedIds = collect($filters['vocabulary_ids'] ?? [])
            ->filter(fn ($id) => is_numeric($id))
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values();

        $query = Kosakata::query()
            ->whereNotNull('word')
            ->where('word', '!=', '')
            ->when($selectedIds->isNotEmpty(), fn ($query) => $query->whereIn('id', $selectedIds))
            ->when($contentType !== 'all', fn ($query) => $query->where('content_type', $contentType))
            ->when($moduleId, function ($query) use ($moduleId) {
                $query->where(function ($query) use ($moduleId) {
                    $query->where('module_id', $moduleId)
                        ->orWhereNull('module_id');
                });
            })
            ->when(! empty($filters['jlpt_level']) && $filters['jlpt_level'] !== 'all', fn ($query) => $query->where('jlpt_level', $filters['jlpt_level']))
            ->when(! empty($filters['category']) && $filters['category'] !== 'all', fn ($query) => $query->where('category', $filters['category']))
            ->when($status !== 'all', fn ($query) => $query->where('status', $status));

        if (in_array($mode, ['word_to_meaning', 'meaning_to_word'], true)) {
            $query->where(function ($query) {
                $query->whereNotNull('meaning_id')->where('meaning_id', '!=', '')
                    ->orWhere(fn ($query) => $query->whereNotNull('meaning_en')->where('meaning_en', '!=', ''));
            });
        }

        if ($mode === 'reading_to_word') {
            $query->whereNotNull('reading')->where('reading', '!=', '');
        }

        $pool = $selectedIds->isNotEmpty()
            ? $query->get()
            : $query->inRandomOrder()->limit(max(20, $count * 4))->get();

        if ($pool->count() < 2) {
            throw ValidationException::withMessages([
                'generate' => 'Bank Konten belum cukup untuk membuat soal. Minimal butuh 2 item valid.',
            ]);
        }

        return $pool
            ->take($count)
            ->map(function (Kosakata $vocabulary) use ($pool, $mode) {
                $payload = $this->questionPayloadFromVocabulary($vocabulary, $pool, $mode);

                return $payload ? [...$payload, 'vocabulary_id' => $vocabulary->id] : null;
            })
            ->filter()
            ->values()
            ->all();
    }

    public function templateRows(Kuis $quiz): array
    {
        $quiz->loadMissing(['module:id,week_number', 'day:id,day_number']);
        $week = $quiz->module?->week_number;
        $day = $quiz->day?->day_number;
        $rows = [
            ['multiple_choice', 'Apa arti dari kanji 火?', 'api', 'api|air|tanah|angin', '火 berarti api. Untuk multiple_choice, correct_answer harus sama persis dengan salah satu opsi.', ''],
            ['fill_blank', '彼は___に行きました。', '学校', 'がっこう', 'Gunakan ___ untuk bagian kosong. Kolom options dipakai sebagai hint opsional.', ''],
            ['listening', 'Ketik kata yang kamu dengar dari audio.', '天気予報', '', 'Untuk listening, audio_url wajib diisi.', 'https://example.com/audio.mp3'],
            ['handwriting', 'Tulis karakter sesuai urutan stroke.', '環', '', 'Practice only: tidak memengaruhi nilai, XP, atau unlock Day.', ''],
        ];

        return array_map(fn (array $row) => [$week, $day, ...$row, 1], $rows);
    }

    public function normalizeType(?string $type): string
    {
        $type = strtolower(trim((string) $type));

        return match ($type) {
            'fill_blank', 'fill-in-blank', 'fill in blank', 'typing' => 'fill_blank',
            'listening', 'listen' => 'listening',
            'handwriting', 'writing', 'menulis' => 'handwriting',
            default => 'multiple_choice',
        };
    }

    public function normalizePayload(array $data, int $index): array
    {
        $type = $this->normalizeType($data['type'] ?? 'multiple_choice');
        $questionText = trim((string) ($data['question_text'] ?? ''));
        $correctAnswer = trim((string) ($data['correct_answer'] ?? ''));
        $audioUrl = trim((string) ($data['audio_url'] ?? ''));
        $rawOptions = is_array($data['options'] ?? null) ? $data['options'] : [];
        $rawOptionReadings = is_array($data['option_readings'] ?? null) ? $data['option_readings'] : [];
        $options = array_values(array_unique(array_filter(array_map(
            fn ($option) => trim((string) $option),
            $rawOptions
        ), fn ($option) => $option !== '')));

        $number = $index + 1;
        $error = null;

        if ($type === 'multiple_choice') {
            if (count($options) < 2) {
                $error = "Soal {$number}: multiple choice wajib memiliki minimal 2 opsi.";
            } elseif (! in_array($correctAnswer, $options, true)) {
                $error = "Soal {$number}: jawaban benar wajib sama dengan salah satu opsi.";
            }
        }

        if ($type === 'listening' && $audioUrl === '') {
            $error = "Soal {$number}: listening wajib memiliki Audio URL.";
        }

        if ($type === 'handwriting') {
            $error = "Soal {$number}: handwriting berasal dari flashcard dan tidak boleh disimpan sebagai soal kuis.";
        }

        return [
            'error' => $error,
            'type' => $type,
            'question_text' => $questionText,
            'question_reading' => $this->nullableText($data['question_reading'] ?? null),
            'correct_answer' => $correctAnswer,
            'correct_answer_reading' => $this->nullableText($data['correct_answer_reading'] ?? null),
            'options' => match ($type) {
                'multiple_choice' => $options,
                'fill_blank' => array_slice($options, 0, 1),
                default => null,
            },
            'option_readings' => $type === 'multiple_choice'
                ? array_map(fn ($reading) => $this->nullableText($reading), array_slice($rawOptionReadings, 0, count($options)))
                : null,
            'explanation' => $data['explanation'] ?? null,
            'explanation_reading' => $this->nullableText($data['explanation_reading'] ?? null),
            'audio_url' => $audioUrl !== '' ? $audioUrl : null,
            'points' => min(1000, max(1, (int) ($data['points'] ?? 1))),
        ];
    }

    private function parseOptions(array $row): ?array
    {
        if (! empty($row['options'])) {
            $options = preg_split('/\s*\|\s*/', (string) $row['options']);
        } else {
            $options = [
                $row['option_a'] ?? $row['opsi_a'] ?? null,
                $row['option_b'] ?? $row['opsi_b'] ?? null,
                $row['option_c'] ?? $row['opsi_c'] ?? null,
                $row['option_d'] ?? $row['opsi_d'] ?? null,
            ];
        }

        $options = array_values(array_filter(array_map(
            fn ($option) => trim((string) $option),
            $options
        ), fn ($option) => $option !== ''));

        return count($options) > 0 ? $options : null;
    }

    private function parseOptionReadings(array $row): ?array
    {
        if (! empty($row['option_readings'])) {
            $readings = preg_split('/\s*\|\s*/', (string) $row['option_readings']);
        } else {
            $readings = [
                $row['option_a_reading'] ?? null,
                $row['option_b_reading'] ?? null,
                $row['option_c_reading'] ?? null,
                $row['option_d_reading'] ?? null,
            ];
        }

        $readings = array_map(fn ($reading) => $this->nullableText($reading), $readings);

        return collect($readings)->contains(fn ($reading) => $reading !== null) ? $readings : null;
    }

    private function normalizeImportRow(Kuis $quiz, array $row, int $index): array
    {
        $questionText = trim((string) ($row['question_text'] ?? $row['question'] ?? $row['soal'] ?? ''));
        $correctAnswer = trim((string) ($row['correct_answer'] ?? $row['answer'] ?? $row['jawaban_benar'] ?? ''));
        $type = $this->normalizeType($row['type'] ?? $row['tipe'] ?? $quiz->type);
        $options = $this->parseOptions($row);
        $optionReadings = $this->parseOptionReadings($row);
        $scopeError = $this->importScopeError($quiz, $row, $index);

        if ($scopeError) {
            return [
                'error' => $scopeError,
                'type' => $type,
                'question_text' => $questionText,
                'question_reading' => $row['question_reading'] ?? null,
                'correct_answer' => $correctAnswer,
                'correct_answer_reading' => $row['correct_answer_reading'] ?? null,
                'options' => $options,
                'option_readings' => $optionReadings,
                'explanation' => $row['explanation'] ?? $row['pembahasan'] ?? null,
                'explanation_reading' => $row['explanation_reading'] ?? null,
                'audio_url' => $row['audio_url'] ?? null,
                'points' => $row['points'] ?? 1,
            ];
        }

        if ($questionText === '' || $correctAnswer === '') {
            $missing = $questionText === '' ? 'question_text' : 'correct_answer';

            return [
                'error' => 'Baris '.($index + 2).": kolom {$missing} wajib diisi.",
                'type' => $type,
                'question_text' => $questionText,
                'question_reading' => $row['question_reading'] ?? null,
                'correct_answer' => $correctAnswer,
                'correct_answer_reading' => $row['correct_answer_reading'] ?? null,
                'options' => $options,
                'option_readings' => $optionReadings,
                'explanation' => $row['explanation'] ?? $row['pembahasan'] ?? null,
                'explanation_reading' => $row['explanation_reading'] ?? null,
                'audio_url' => $row['audio_url'] ?? null,
                'points' => $row['points'] ?? 1,
            ];
        }

        $normalized = $this->normalizePayload([
            'type' => $type,
            'question_text' => $questionText,
            'question_reading' => $row['question_reading'] ?? null,
            'correct_answer' => $correctAnswer,
            'correct_answer_reading' => $row['correct_answer_reading'] ?? null,
            'options' => $options,
            'option_readings' => $optionReadings,
            'explanation' => $row['explanation'] ?? $row['pembahasan'] ?? null,
            'explanation_reading' => $row['explanation_reading'] ?? null,
            'audio_url' => $row['audio_url'] ?? null,
            'points' => $row['points'] ?? 1,
        ], $index);

        if ($normalized['error']) {
            $normalized['error'] = str_replace('Soal '.($index + 1).':', 'Baris '.($index + 2).':', $normalized['error']);
        }

        return $normalized;
    }

    private function importScopeError(Kuis $quiz, array $row, int $index): ?string
    {
        $quiz->loadMissing(['module:id,week_number', 'day:id,day_number']);
        $week = $row['module_week'] ?? $row['week_number'] ?? null;
        $day = $row['day_number'] ?? $row['module_day'] ?? null;
        $rowNumber = $index + 2;

        if (filled($week) && (int) $week !== (int) $quiz->module?->week_number) {
            return "Baris {$rowNumber}: Week {$week} tidak sesuai dengan Week {$quiz->module?->week_number}.";
        }

        if (filled($day) && ! $quiz->day) {
            return "Baris {$rowNumber}: kuis mingguan tidak boleh memakai day_number.";
        }

        if (filled($day) && (int) $day !== (int) $quiz->day?->day_number) {
            return "Baris {$rowNumber}: Day {$day} tidak sesuai dengan Day {$quiz->day?->day_number}.";
        }

        return null;
    }

    private function questionPayloadFromVocabulary(Kosakata $vocabulary, $pool, string $mode): ?array
    {
        $meaning = trim((string) ($vocabulary->meaning_id ?: $vocabulary->meaning_en));
        $reading = trim((string) $vocabulary->reading);

        if ($mode === 'meaning_to_word') {
            if ($meaning === '') {
                return null;
            }

            $correct = $vocabulary->word;
            $options = $this->optionsFromVocabularyPool($pool, $correct, 'word');

            return [
                'question_text' => "Pilih kosakata Jepang untuk arti: {$meaning}",
                'correct_answer' => $correct,
                'correct_answer_reading' => $reading !== '' ? $reading : null,
                'options' => $options,
                'option_readings' => $this->readingsForWordOptions($options, $pool),
                'explanation' => $this->vocabularyExplanation($vocabulary),
                'audio_url' => $vocabulary->audio_url,
            ];
        }

        if ($mode === 'reading_to_word') {
            if ($reading === '') {
                return null;
            }

            $correct = $vocabulary->word;
            $options = $this->optionsFromVocabularyPool($pool, $correct, 'word');

            return [
                'question_text' => "Pilih kosakata untuk reading: {$reading}",
                'correct_answer' => $correct,
                'correct_answer_reading' => $reading,
                'options' => $options,
                'option_readings' => $this->readingsForWordOptions($options, $pool),
                'explanation' => $this->vocabularyExplanation($vocabulary),
                'audio_url' => $vocabulary->audio_url,
            ];
        }

        if ($meaning === '') {
            return null;
        }

        $label = $vocabulary->word.($reading !== '' ? " ({$reading})" : '');
        $options = $this->optionsFromVocabularyPool($pool, $meaning, 'meaning');

        return [
            'question_text' => "Apa arti dari {$label}?",
            'question_reading' => $reading !== '' ? $reading : null,
            'correct_answer' => $meaning,
            'options' => $options,
            'explanation' => $this->vocabularyExplanation($vocabulary),
            'audio_url' => $vocabulary->audio_url,
        ];
    }

    private function readingsForWordOptions(array $options, $pool): array
    {
        $readings = $pool->keyBy('word');

        return collect($options)
            ->map(fn (string $option) => $this->nullableText($readings->get($option)?->reading))
            ->all();
    }

    private function nullableText(mixed $value): ?string
    {
        $value = trim((string) $value);

        return $value !== '' ? $value : null;
    }

    private function optionsFromVocabularyPool($pool, string $correct, string $field): array
    {
        $values = $pool
            ->map(function (Kosakata $item) use ($field) {
                if ($field === 'meaning') {
                    return trim((string) ($item->meaning_id ?: $item->meaning_en));
                }

                return trim((string) $item->{$field});
            })
            ->filter(fn ($value) => $value !== '')
            ->unique()
            ->reject(fn ($value) => $value === $correct)
            ->shuffle()
            ->take(3)
            ->values()
            ->all();

        $options = array_values(array_unique(array_filter([$correct, ...$values])));
        shuffle($options);

        return $options;
    }

    private function vocabularyExplanation(Kosakata $vocabulary): string
    {
        $parts = array_filter([
            $vocabulary->word,
            $vocabulary->reading,
            $vocabulary->meaning_id ?: $vocabulary->meaning_en,
        ]);

        return implode(' / ', $parts);
    }

    private function strokeManifest(): array
    {
        if ($this->strokeManifest !== null) {
            return $this->strokeManifest;
        }

        $path = public_path('vendor/japanese-strokes/manifest.json');

        if (! is_file($path)) {
            return $this->strokeManifest = [];
        }

        $decoded = json_decode((string) file_get_contents($path), true);

        return $this->strokeManifest = is_array($decoded['characters'] ?? null)
            ? $decoded['characters']
            : [];
    }
}
