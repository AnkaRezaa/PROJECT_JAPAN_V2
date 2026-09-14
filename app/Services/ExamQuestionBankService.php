<?php

namespace App\Services;

use App\Models\ExamBankQuestion;
use App\Models\ExamQuestionBank;
use App\Models\ExamQuestionWrapper;
use App\Models\ExamSection;
use App\Models\ExamVersionQuestion;
use App\Models\Pengguna;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExamQuestionBankService
{
    public function __construct(
        private readonly ImportSpreadsheetService $spreadsheets,
        private readonly TemplateExcelService $templates,
    ) {}

    public function createBank(array $data, Pengguna $actor): ExamQuestionBank
    {
        $slug = Str::slug($data['title'] ?? 'bank-soal');
        $originalSlug = $slug;
        $counter = 1;
        while (ExamQuestionBank::where('slug', $slug)->exists()) {
            $slug = "{$originalSlug}-".$counter++;
        }

        return ExamQuestionBank::create([
            'level_id' => $data['level_id'],
            'title' => trim($data['title']),
            'slug' => $slug,
            'source' => trim($data['source'] ?? '') ?: null,
            'description' => trim($data['description'] ?? '') ?: null,
            'status' => $data['status'] ?? 'published',
            'created_by' => $actor->id,
            'updated_by' => $actor->id,
        ]);
    }

    public function updateBank(ExamQuestionBank $bank, array $data, Pengguna $actor): ExamQuestionBank
    {
        $bank->update([
            'level_id' => $data['level_id'] ?? $bank->level_id,
            'title' => trim($data['title'] ?? $bank->title),
            'source' => trim($data['source'] ?? $bank->source) ?: null,
            'description' => trim($data['description'] ?? $bank->description) ?: null,
            'status' => $data['status'] ?? $bank->status,
            'updated_by' => $actor->id,
        ]);

        return $bank->refresh();
    }

    public function deleteBank(ExamQuestionBank $bank): void
    {
        $bank->delete();
    }

    public function createWrapper(ExamQuestionBank $bank, array $data): ExamQuestionWrapper
    {
        $sortOrder = (int) ($data['sort_order'] ?? ($bank->wrappers()->max('sort_order') + 1));

        return $bank->wrappers()->create([
            'wrapper_code' => trim($data['wrapper_code'] ?? '') ?: null,
            'title' => trim($data['title'] ?? 'Wacana Baru'),
            'category' => $data['category'] ?? 'reading',
            'mondai_number' => trim($data['mondai_number'] ?? '') ?: null,
            'stimulus_text' => trim($data['stimulus_text'] ?? '') ?: null,
            'stimulus_reading' => trim($data['stimulus_reading'] ?? '') ?: null,
            'audio_url' => trim($data['audio_url'] ?? '') ?: null,
            'sort_order' => $sortOrder,
        ]);
    }

    public function updateWrapper(ExamQuestionWrapper $wrapper, array $data): ExamQuestionWrapper
    {
        $wrapper->update([
            'wrapper_code' => trim($data['wrapper_code'] ?? $wrapper->wrapper_code) ?: null,
            'title' => trim($data['title'] ?? $wrapper->title),
            'category' => $data['category'] ?? $wrapper->category,
            'mondai_number' => trim($data['mondai_number'] ?? $wrapper->mondai_number) ?: null,
            'stimulus_text' => isset($data['stimulus_text']) ? (trim($data['stimulus_text']) ?: null) : $wrapper->stimulus_text,
            'stimulus_reading' => isset($data['stimulus_reading']) ? (trim($data['stimulus_reading']) ?: null) : $wrapper->stimulus_reading,
            'audio_url' => isset($data['audio_url']) ? (trim($data['audio_url']) ?: null) : $wrapper->audio_url,
            'sort_order' => isset($data['sort_order']) ? (int) $data['sort_order'] : $wrapper->sort_order,
        ]);

        return $wrapper->refresh();
    }

    public function deleteWrapper(ExamQuestionWrapper $wrapper): void
    {
        $wrapper->delete();
    }

    public function createQuestion(ExamQuestionBank $bank, array $data): ExamBankQuestion
    {
        $wrapperId = ! empty($data['exam_question_wrapper_id']) ? (int) $data['exam_question_wrapper_id'] : null;
        $sortOrder = (int) ($data['sort_order'] ?? ($bank->questions()->where('exam_question_wrapper_id', $wrapperId)->max('sort_order') + 1));

        $payload = [
            'exam_question_bank_id' => $bank->id,
            'exam_question_wrapper_id' => $wrapperId,
            'code' => trim($data['code'] ?? '') ?: null,
            'type' => $data['type'] ?? 'multiple_choice',
            'sort_order' => $sortOrder,
            'points' => max(1, (int) ($data['points'] ?? 1)),
            'question_text' => trim($data['question_text'] ?? ''),
            'question_reading' => trim($data['question_reading'] ?? '') ?: null,
            'options' => $this->normalizeOptions($data['options'] ?? null),
            'option_readings' => $this->normalizeOptions($data['option_readings'] ?? null),
            'correct_answer' => trim($data['correct_answer'] ?? ''),
            'correct_answer_reading' => trim($data['correct_answer_reading'] ?? '') ?: null,
            'explanation' => trim($data['explanation'] ?? '') ?: null,
            'explanation_reading' => trim($data['explanation_reading'] ?? '') ?: null,
            'audio_url' => trim($data['audio_url'] ?? '') ?: null,
        ];

        $payload['content_hash'] = hash('sha256', json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

        return ExamBankQuestion::create($payload);
    }

    public function updateQuestion(ExamBankQuestion $question, array $data): ExamBankQuestion
    {
        $payload = [
            'exam_question_wrapper_id' => array_key_exists('exam_question_wrapper_id', $data)
                ? (! empty($data['exam_question_wrapper_id']) ? (int) $data['exam_question_wrapper_id'] : null)
                : $question->exam_question_wrapper_id,
            'code' => array_key_exists('code', $data) ? (trim($data['code']) ?: null) : $question->code,
            'type' => $data['type'] ?? $question->type,
            'sort_order' => isset($data['sort_order']) ? (int) $data['sort_order'] : $question->sort_order,
            'points' => isset($data['points']) ? max(1, (int) $data['points']) : $question->points,
            'question_text' => isset($data['question_text']) ? trim($data['question_text']) : $question->question_text,
            'question_reading' => array_key_exists('question_reading', $data) ? (trim($data['question_reading']) ?: null) : $question->question_reading,
            'options' => array_key_exists('options', $data) ? $this->normalizeOptions($data['options']) : $question->options,
            'option_readings' => array_key_exists('option_readings', $data) ? $this->normalizeOptions($data['option_readings']) : $question->option_readings,
            'correct_answer' => isset($data['correct_answer']) ? trim($data['correct_answer']) : $question->correct_answer,
            'correct_answer_reading' => array_key_exists('correct_answer_reading', $data) ? (trim($data['correct_answer_reading']) ?: null) : $question->correct_answer_reading,
            'explanation' => array_key_exists('explanation', $data) ? (trim($data['explanation']) ?: null) : $question->explanation,
            'explanation_reading' => array_key_exists('explanation_reading', $data) ? (trim($data['explanation_reading']) ?: null) : $question->explanation_reading,
            'audio_url' => array_key_exists('audio_url', $data) ? (trim($data['audio_url']) ?: null) : $question->audio_url,
        ];

        $payload['content_hash'] = hash('sha256', json_encode(array_merge($question->toArray(), $payload), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

        $question->update($payload);

        return $question->refresh();
    }

    public function deleteQuestion(ExamBankQuestion $question): void
    {
        $question->delete();
    }

    public function preview(ExamQuestionBank $bank, UploadedFile $file): array
    {
        $extension = strtolower($file->getClientOriginalExtension());
        if (! in_array($extension, ['xlsx', 'csv'], true)) {
            return [
                'valid' => false,
                'errors' => ['Format berkas tidak didukung. Harap gunakan berkas .xlsx atau .csv.'],
                'summary' => ['wrappers' => 0, 'questions' => 0],
                'data' => [],
            ];
        }

        $rawRows = $this->spreadsheets->rows($file->getRealPath(), $extension);
        if (empty($rawRows)) {
            return [
                'valid' => false,
                'errors' => ['Berkas kosong atau tidak memiliki baris data yang valid.'],
                'summary' => ['wrappers' => 0, 'questions' => 0],
                'data' => [],
            ];
        }

        $errors = [];
        $wrappersMap = [];
        $parsedQuestions = [];

        foreach ($rawRows as $index => $row) {
            $rowNumber = $index + 2;
            $rowNormalized = array_change_key_case($row, CASE_LOWER);

            $wrapperCode = trim((string) ($rowNormalized['wrapper_code'] ?? $rowNormalized['kode_wrapper'] ?? ''));
            $wrapperTitle = trim((string) ($rowNormalized['wrapper_title'] ?? $rowNormalized['judul_wrapper'] ?? ''));
            $category = strtolower(trim((string) ($rowNormalized['category'] ?? $rowNormalized['kategori'] ?? 'reading')));
            $mondai = trim((string) ($rowNormalized['mondai'] ?? $rowNormalized['mondai_number'] ?? ''));
            $stimulusText = trim((string) ($rowNormalized['stimulus_text'] ?? $rowNormalized['wacana'] ?? $rowNormalized['bacaan'] ?? ''));
            $stimulusReading = trim((string) ($rowNormalized['stimulus_reading'] ?? $rowNormalized['bacaan_furigana'] ?? ''));
            $wrapperAudio = trim((string) ($rowNormalized['wrapper_audio'] ?? $rowNormalized['audio_wacana'] ?? ''));

            $questionCode = trim((string) ($rowNormalized['code'] ?? $rowNormalized['kode'] ?? $rowNormalized['kode_soal'] ?? ''));
            $questionType = strtolower(trim((string) ($rowNormalized['type'] ?? $rowNormalized['tipe'] ?? 'multiple_choice')));
            $questionText = trim((string) ($rowNormalized['question_text'] ?? $rowNormalized['pertanyaan'] ?? $rowNormalized['soal'] ?? ''));
            $questionReading = trim((string) ($rowNormalized['question_reading'] ?? $rowNormalized['bacaan_pertanyaan'] ?? ''));
            $options = $this->extractOptions($rowNormalized);
            $correctAnswer = trim((string) ($rowNormalized['correct_answer'] ?? $rowNormalized['jawaban_benar'] ?? $rowNormalized['kunci'] ?? ''));
            $explanation = trim((string) ($rowNormalized['explanation'] ?? $rowNormalized['pembahasan'] ?? ''));
            $questionAudio = trim((string) ($rowNormalized['audio_url'] ?? $rowNormalized['audio_soal'] ?? ''));
            $points = max(1, (int) ($rowNormalized['points'] ?? $rowNormalized['bobot'] ?? 1));

            // Auto-Grouping Adapter: Jika wacana diisi tapi wrapper_code kosong, buat wrapper otomatis dari hash wacana
            if ($wrapperCode === '' && ($stimulusText !== '' || $wrapperAudio !== '')) {
                $wrapperCode = 'AUTO-WRAP-'.substr(md5($stimulusText ?: $wrapperAudio), 0, 8);
                if ($wrapperTitle === '') {
                    $wrapperTitle = 'Wacana '.($mondai ?: 'Otomatis');
                }
            }

            if ($wrapperCode !== '') {
                if (! isset($wrappersMap[$wrapperCode])) {
                    $wrappersMap[$wrapperCode] = [
                        'wrapper_code' => $wrapperCode,
                        'title' => $wrapperTitle ?: "Wacana {$wrapperCode}",
                        'category' => in_array($category, ['vocabulary', 'grammar', 'reading', 'listening'], true) ? $category : 'reading',
                        'mondai_number' => $mondai ?: null,
                        'stimulus_text' => $stimulusText ?: null,
                        'stimulus_reading' => $stimulusReading ?: null,
                        'audio_url' => $wrapperAudio ?: null,
                    ];
                } else {
                    if ($stimulusText !== '' && empty($wrappersMap[$wrapperCode]['stimulus_text'])) {
                        $wrappersMap[$wrapperCode]['stimulus_text'] = $stimulusText;
                    }
                    if ($wrapperAudio !== '' && empty($wrappersMap[$wrapperCode]['audio_url'])) {
                        $wrappersMap[$wrapperCode]['audio_url'] = $wrapperAudio;
                    }
                }
            }

            if ($questionText === '') {
                $errors[] = "Baris {$rowNumber}: Kolom pertanyaan/question_text wajib diisi.";
            }

            if ($correctAnswer === '') {
                $errors[] = "Baris {$rowNumber}: Kolom jawaban_benar/correct_answer wajib diisi.";
            }

            if (! in_array($questionType, ['multiple_choice', 'listening', 'fill_blank', 'sentence_builder'], true)) {
                $errors[] = "Baris {$rowNumber}: Tipe soal '{$questionType}' tidak didukung.";
            }

            if ($questionType === 'multiple_choice' && count($options) < 2) {
                $errors[] = "Baris {$rowNumber}: Pilihan ganda minimal memiliki 2 opsi (opsi_a, opsi_b atau pipa A|B|C|D).";
            }

            // Normalisasi kunci jawaban jika admin menulis 'A', 'B', 'C', 'D'
            if ($questionType === 'multiple_choice' && count($options) >= 2) {
                $letterKey = strtoupper($correctAnswer);
                $indexMap = ['A' => 0, 'B' => 1, 'C' => 2, 'D' => 3];
                if (isset($indexMap[$letterKey]) && isset($options[$indexMap[$letterKey]])) {
                    $correctAnswer = $options[$indexMap[$letterKey]];
                }
            }

            $parsedQuestions[] = [
                'row_number' => $rowNumber,
                'wrapper_code' => $wrapperCode ?: null,
                'code' => $questionCode ?: null,
                'type' => $questionType,
                'points' => $points,
                'question_text' => $questionText,
                'question_reading' => $questionReading ?: null,
                'options' => $options,
                'correct_answer' => $correctAnswer,
                'explanation' => $explanation ?: null,
                'audio_url' => $questionAudio ?: null,
            ];
        }

        return [
            'valid' => $errors === [],
            'errors' => array_values(array_unique($errors)),
            'summary' => [
                'wrappers' => count($wrappersMap),
                'questions' => count($parsedQuestions),
            ],
            'data' => [
                'wrappers' => array_values($wrappersMap),
                'questions' => $parsedQuestions,
            ],
        ];
    }

    public function commit(ExamQuestionBank $bank, UploadedFile $file): array
    {
        $preview = $this->preview($bank, $file);
        if (! $preview['valid']) {
            throw ValidationException::withMessages(['file' => $preview['errors']]);
        }

        return DB::transaction(function () use ($bank, $preview) {
            $createdWrappers = 0;
            $createdQuestions = 0;
            $wrapperModelMap = [];

            $baseWrapperSort = (int) $bank->wrappers()->max('sort_order');
            foreach ($preview['data']['wrappers'] as $index => $wData) {
                $wrapper = $bank->wrappers()->where('wrapper_code', $wData['wrapper_code'])->first();
                if (! $wrapper) {
                    $wrapper = $bank->wrappers()->create([
                        ...$wData,
                        'sort_order' => $baseWrapperSort + $index + 1,
                    ]);
                    $createdWrappers++;
                } else {
                    $wrapper->update(array_filter([
                        'title' => $wData['title'] ?: $wrapper->title,
                        'category' => $wData['category'] ?: $wrapper->category,
                        'mondai_number' => $wData['mondai_number'] ?: $wrapper->mondai_number,
                        'stimulus_text' => $wData['stimulus_text'] ?: $wrapper->stimulus_text,
                        'stimulus_reading' => $wData['stimulus_reading'] ?: $wrapper->stimulus_reading,
                        'audio_url' => $wData['audio_url'] ?: $wrapper->audio_url,
                    ]));
                }
                $wrapperModelMap[$wData['wrapper_code']] = $wrapper->id;
            }

            $baseQuestionSort = (int) $bank->questions()->max('sort_order');
            foreach ($preview['data']['questions'] as $qIndex => $qData) {
                $wrapperId = ! empty($qData['wrapper_code']) ? ($wrapperModelMap[$qData['wrapper_code']] ?? null) : null;
                $payload = [
                    'exam_question_bank_id' => $bank->id,
                    'exam_question_wrapper_id' => $wrapperId,
                    'code' => $qData['code'],
                    'type' => $qData['type'],
                    'sort_order' => $baseQuestionSort + $qIndex + 1,
                    'points' => $qData['points'],
                    'question_text' => $qData['question_text'],
                    'question_reading' => $qData['question_reading'],
                    'options' => $qData['options'] ?: null,
                    'correct_answer' => $qData['correct_answer'],
                    'explanation' => $qData['explanation'],
                    'audio_url' => $qData['audio_url'],
                ];
                $payload['content_hash'] = hash('sha256', json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

                ExamBankQuestion::create($payload);
                $createdQuestions++;
            }

            return [
                'wrappers_count' => $createdWrappers,
                'questions_count' => $createdQuestions,
            ];
        });
    }

    public function template(string $format): BinaryFileResponse|StreamedResponse
    {
        $headers = [
            'wrapper_code', 'wrapper_title', 'category', 'mondai', 'stimulus_text', 'wrapper_audio',
            'code', 'type', 'question_text', 'opsi_a', 'opsi_b', 'opsi_c', 'opsi_d', 'correct_answer', 'explanation', 'bobot', 'audio_url',
        ];

        $rows = [
            [
                'WRAP-N3-D01', 'Dokkai Mondai 4 - Bacaan Menengah', 'reading', 'Mondai 4',
                '日本語の勉強はとても面白いですが、漢字を覚えるのは難しいです。毎日、新しい言葉を学んでいます。', '',
                'N3-D04-01', 'multiple_choice', '本文の内容と合っているものはどれですか。',
                '漢字は難しくない', '日本語の勉強はつまらない', '毎日新しい言葉を学ぶ', '日本で働きたくない',
                'C', 'Sesuai paragraf pertama kalimat kedua.', 1, '',
            ],
            [
                'WRAP-N3-D01', 'Dokkai Mondai 4 - Bacaan Menengah', 'reading', 'Mondai 4',
                '', '',
                'N3-D04-02', 'multiple_choice', '筆者が難しいと感じていることは何ですか。',
                '文法を覚えること', '漢字を覚えること', '話すこと', '聞くこと',
                'B', 'Tertulis jelas: 漢字を覚えるのは難しいです。', 1, '',
            ],
            [
                '', '', 'vocabulary', 'Mondai 1', '', '',
                'N3-V01-01', 'multiple_choice', '「受付」の読み方は？',
                'うけつけ', 'うけづけ', 'じゅけつけ', 'うけつき',
                'A', 'Jawaban benar adalah うけつけ (receptionist/desk).', 1, '',
            ],
        ];

        $format = strtolower($format);
        $filename = 'template-bank-soal-jlpt.'.$format;

        if ($format === 'csv') {
            return $this->templates->csvResponse($headers, $rows, $filename);
        }

        $path = $this->templates->xlsxPath($headers, $rows, 'Bank Soal', 'exam_bank_template_');

        return response()->download($path, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ])->deleteFileAfterSend(true);
    }

    public function pullToExamSection(ExamSection $section, array $bankQuestionIds): int
    {
        $questions = ExamBankQuestion::with('wrapper')->whereIn('id', $bankQuestionIds)->get();
        if ($questions->isEmpty()) {
            return 0;
        }

        return DB::transaction(function () use ($section, $questions) {
            $baseSort = (int) $section->questions()->max('sort_order');
            $pulled = 0;

            foreach ($questions as $index => $bq) {
                $questionReading = $bq->question_reading;
                if ($bq->wrapper && $bq->wrapper->stimulus_text) {
                    $stimulusHeader = "【{$bq->wrapper->title}】\n{$bq->wrapper->stimulus_text}\n\n";
                    if (! Str::contains((string) $questionReading, $bq->wrapper->stimulus_text)) {
                        $questionReading = $stimulusHeader.($questionReading ?: '');
                    }
                }

                $audio = $bq->audio_url ?: ($bq->wrapper?->audio_url);

                $payload = [
                    'exam_section_id' => $section->id,
                    'source_question_id' => null,
                    'code' => $bq->code,
                    'type' => $bq->type,
                    'sort_order' => $baseSort + $index + 1,
                    'points' => $bq->points,
                    'question_text' => $bq->question_text,
                    'question_reading' => $questionReading,
                    'options' => $bq->options,
                    'option_readings' => $bq->option_readings,
                    'correct_answer' => $bq->correct_answer,
                    'correct_answer_reading' => $bq->correct_answer_reading,
                    'explanation' => $bq->explanation,
                    'explanation_reading' => $bq->explanation_reading,
                    'audio_path' => $audio,
                ];
                $payload['content_hash'] = hash('sha256', json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

                ExamVersionQuestion::create($payload);
                $pulled++;
            }

            $section->update(['raw_max_points' => $section->questions()->sum('points')]);

            return $pulled;
        });
    }

    private function normalizeOptions(mixed $value): ?array
    {
        if (is_array($value)) {
            return array_values(array_filter(array_map('trim', $value)));
        }
        if (is_string($value) && trim($value) !== '') {
            $json = json_decode($value, true);
            if (is_array($json)) {
                return array_values(array_filter(array_map('trim', $json)));
            }

            return array_values(array_filter(array_map('trim', explode('|', $value))));
        }

        return null;
    }

    private function extractOptions(array $row): array
    {
        $options = [];
        foreach (['opsi_a', 'opsi_b', 'opsi_c', 'opsi_d', 'option_a', 'option_b', 'option_c', 'option_d'] as $col) {
            if (isset($row[$col]) && trim((string) $row[$col]) !== '') {
                $options[] = trim((string) $row[$col]);
            }
        }
        if (! empty($options)) {
            return $options;
        }

        $raw = $row['options'] ?? $row['opsi'] ?? '';

        return $this->normalizeOptions($raw) ?: [];
    }
}
