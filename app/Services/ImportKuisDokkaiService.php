<?php

namespace App\Services;

use App\Models\HariModul;
use App\Models\Kuis;
use Illuminate\Support\Facades\DB;

class ImportKuisDokkaiService
{
    public function __construct(
        private readonly KuisDokkaiService $dokkaiService
    ) {}

    /**
     * Header standar yang diharapkan (1-sheet).
     */
    public const EXPECTED_HEADERS = [
        'judul_wacana',
        'level',
        'teks_bacaan',
        'pertanyaan',
        'opsi_a',
        'opsi_b',
        'opsi_c',
        'opsi_d',
        'kunci',
        'pembahasan',
    ];

    /**
     * Memvalidasi dan memetakan baris spreadsheet 1-sheet menjadi struktur wacana & soal Dokkai.
     */
    public function preview(HariModul $day, array $rows): array
    {
        if (empty($rows)) {
            return [
                'valid' => false,
                'errors' => [
                    ['row' => 1, 'column' => 'File', 'message' => 'File spreadsheet kosong atau tidak berisi data baris.'],
                ],
                'passages' => [],
                'total_passages' => 0,
                'total_questions' => 0,
            ];
        }

        $errors = [];
        $passages = [];
        $currentPassageKey = null;

        foreach ($rows as $index => $rawRow) {
            $rowNumber = $index + 2; // Baris 1 adalah header di spreadsheet
            $row = $this->normalizeRowKeys($rawRow);

            $judul = trim((string) ($row['judul_wacana'] ?? ''));
            $teksBacaan = trim((string) ($row['teks_bacaan'] ?? ''));
            $level = preg_replace('/^JLPT\s*/i', '', strtoupper(trim((string) ($row['level'] ?? ''))));
            $pertanyaan = trim((string) ($row['pertanyaan'] ?? ''));
            $opsiA = trim((string) ($row['opsi_a'] ?? ''));
            $opsiB = trim((string) ($row['opsi_b'] ?? ''));
            $opsiC = trim((string) ($row['opsi_c'] ?? ''));
            $opsiD = trim((string) ($row['opsi_d'] ?? ''));
            $kunci = strtoupper(trim((string) ($row['kunci'] ?? '')));
            $pembahasan = trim((string) ($row['pembahasan'] ?? ''));

            // Abaikan baris jika benar-benar kosong
            if ($judul === '' && $teksBacaan === '' && $pertanyaan === '' && $opsiA === '') {
                continue;
            }

            // Jika ada judul wacana baru, inisialisasi wacana baru
            if ($judul !== '') {
                $currentPassageKey = $judul;

                // Split teks bacaan menjadi paragraf
                $paragraphs = $this->splitParagraphs($teksBacaan);

                $passages[$currentPassageKey] = [
                    'passage' => [
                        'title' => $judul,
                        'sub_title' => null,
                        'theme_category' => 'Budaya & Tradisi',
                        'jlpt_level' => in_array($level, ['N1', 'N2', 'N3', 'N4', 'N5'], true) ? $level : 'N3',
                        'estimated_reading_time' => max(1, (int) ceil(mb_strlen($teksBacaan) / 250)),
                        'xp_reward' => 80,
                        'audio_url' => null,
                    ],
                    'time_limit' => 300,
                    'passing_score' => 70,
                    'paragraphs' => $paragraphs,
                    'vocabularies' => [],
                    'questions' => [],
                ];

                if (empty($paragraphs)) {
                    $errors[] = [
                        'row' => $rowNumber,
                        'column' => 'teks_bacaan',
                        'message' => "Teks bacaan wacana '{$judul}' wajib diisi.",
                    ];
                }
            }

            // Pastikan baris soal memiliki induk wacana
            if ($currentPassageKey === null || ! isset($passages[$currentPassageKey])) {
                $errors[] = [
                    'row' => $rowNumber,
                    'column' => 'judul_wacana',
                    'message' => 'Baris soal tidak memiliki induk wacana. Kolom judul_wacana wajib diisi pada baris pertama wacana.',
                ];
                continue;
            }

            // Validasi butir soal
            if ($pertanyaan === '') {
                $errors[] = [
                    'row' => $rowNumber,
                    'column' => 'pertanyaan',
                    'message' => 'Pertanyaan soal pemahaman tidak boleh kosong.',
                ];
                continue;
            }

            // Susun opsi A, B, C, D
            $rawOptions = [
                'A' => $opsiA,
                'B' => $opsiB,
                'C' => $opsiC,
                'D' => $opsiD,
            ];

            $filledOptions = array_filter($rawOptions, fn ($opt) => $opt !== '');
            if (count($filledOptions) < 2) {
                $errors[] = [
                    'row' => $rowNumber,
                    'column' => 'opsi_a',
                    'message' => 'Soal minimal harus memiliki 2 pilihan jawaban (opsi_a dan opsi_b).',
                ];
            }

            // Validasi kunci jawaban
            if ($kunci === '' || ! in_array($kunci, ['A', 'B', 'C', 'D'], true) || ! isset($filledOptions[$kunci])) {
                $errors[] = [
                    'row' => $rowNumber,
                    'column' => 'kunci',
                    'message' => "Kunci jawaban harus berupa huruf A, B, C, atau D yang memiliki teks pilihan (diberikan: '{$kunci}').",
                ];
            }

            $optionsPayload = [];
            $optId = 1;
            foreach ($rawOptions as $label => $text) {
                if ($text !== '') {
                    $optionsPayload[] = [
                        'id' => $optId++,
                        'option_label' => $label,
                        'option_text' => $text,
                        'option_translation' => null,
                        'is_correct' => $label === $kunci,
                    ];
                }
            }

            $qNumber = count($passages[$currentPassageKey]['questions']) + 1;
            $passages[$currentPassageKey]['questions'][] = [
                'question_number' => $qNumber,
                'question_text' => $pertanyaan,
                'question_translation' => null,
                'evidence_paragraph_number' => 1,
                'evidence_quote' => null,
                'explanation_correct' => $pembahasan !== '' ? $pembahasan : null,
                'explanation_distractors' => ['A' => '', 'B' => '', 'C' => '', 'D' => ''],
                'options' => $optionsPayload,
                'order' => $qNumber - 1,
            ];
        }

        // Validasi tiap wacana minimal punya 1 soal
        foreach ($passages as $key => $pData) {
            if (empty($pData['questions'])) {
                $errors[] = [
                    'row' => 1,
                    'column' => 'soal',
                    'message' => "Wacana '{$key}' belum memiliki soal pemahaman.",
                ];
            }
        }

        $totalQuestions = array_sum(array_map(fn ($p) => count($p['questions']), $passages));

        return [
            'valid' => empty($errors),
            'errors' => $errors,
            'passages' => array_values($passages),
            'total_passages' => count($passages),
            'total_questions' => $totalQuestions,
        ];
    }

    /**
     * Menyimpan seluruh wacana dan butir soal yang lolos validasi preview ke database.
     */
    public function commit(HariModul $day, array $preview): int
    {
        $passages = $preview['passages'] ?? [];
        if (empty($passages)) {
            return 0;
        }

        return DB::transaction(function () use ($day, $passages) {
            $importedCount = 0;

            foreach ($passages as $pData) {
                $quiz = Kuis::create([
                    'module_id' => $day->module_id,
                    'module_day_id' => $day->id,
                    'type' => 'dokkai',
                    'time_limit' => $pData['time_limit'] ?? 300,
                    'passing_score' => $pData['passing_score'] ?? 70,
                    'status' => 'draft',
                ]);

                $this->dokkaiService->sync($quiz, $pData);
                $importedCount++;
            }

            return $importedCount;
        });
    }

    /**
     * Memecah teks bacaan menjadi deretan paragraf berdasarkan baris baru.
     */
    public function splitParagraphs(string $rawText): array
    {
        if (trim($rawText) === '') {
            return [];
        }

        // Prioritaskan pemisahan enter ganda (\n\n), jika tidak ada gunakan single newline
        $chunks = preg_split('/\r?\n\s*\r?\n/', trim($rawText));
        if (count($chunks) <= 1) {
            $chunks = preg_split('/\r?\n/', trim($rawText));
        }

        $paragraphs = [];
        $pNum = 1;

        foreach ($chunks as $chunk) {
            $cleaned = trim($chunk);
            if ($cleaned !== '') {
                $paragraphs[] = [
                    'id' => null,
                    'paragraph_number' => $pNum,
                    'label' => "Paragraf {$pNum}",
                    'content_raw' => $cleaned,
                ];
                $pNum++;
            }
        }

        return $paragraphs;
    }

    /**
     * Menormalisasi kunci kolom dari variasi nama kolom yang mungkin diketik oleh pengguna.
     */
    private function normalizeRowKeys(array $row): array
    {
        $normalized = [];
        foreach ($row as $key => $value) {
            $cleanKey = strtolower(trim((string) $key));
            $cleanKey = str_replace([' ', '-', '.'], '_', $cleanKey);

            $mappedKey = match ($cleanKey) {
                'judul', 'title', 'wacana_title', 'judul_wacana' => 'judul_wacana',
                'level', 'jlpt', 'jlpt_level', 'level_jlpt' => 'level',
                'teks', 'wacana', 'passage', 'bacaan', 'teks_bacaan', 'teks_wacana' => 'teks_bacaan',
                'pertanyaan', 'soal', 'question', 'soal_pertanyaan' => 'pertanyaan',
                'opsi_a', 'pilihan_a', 'a', 'option_a' => 'opsi_a',
                'opsi_b', 'pilihan_b', 'b', 'option_b' => 'opsi_b',
                'opsi_c', 'pilihan_c', 'c', 'option_c' => 'opsi_c',
                'opsi_d', 'pilihan_d', 'd', 'option_d' => 'opsi_d',
                'kunci', 'kunci_jawaban', 'jawaban_benar', 'answer', 'correct_answer' => 'kunci',
                'pembahasan', 'penjelasan', 'explanation', 'feedback' => 'pembahasan',
                default => $cleanKey,
            };

            $normalized[$mappedKey] = $value;
        }

        return $normalized;
    }
}
