<?php

namespace App\Services;

use App\Http\Requests\Admin\SyncExamQuestionsRequest;
use App\Http\Requests\Admin\SyncExamSectionsRequest;
use App\Models\ExamVersion;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class ExamImportService
{
    public function __construct(
        private readonly ImportSpreadsheetService $spreadsheets,
        private readonly TemplateExcelService $templates,
        private readonly ExamAuthoringService $authoring,
    ) {}

    public function preview(ExamVersion $version, UploadedFile $file): array
    {
        abort_if($version->status !== 'draft', 409, 'Import hanya dapat dilakukan pada draft.');
        $version->loadMissing('exam');
        $sheets = $this->spreadsheets->xlsxSheets($file->getRealPath());
        $errors = [];
        if ($version->sections()->exists()) {
            $errors[] = 'Impor hanya dapat dilakukan pada draft tanpa bagian agar naskah yang ada tidak tertimpa.';
        }

        foreach (['bagian', 'soal'] as $required) {
            if (! isset($sheets[$required])) {
                $errors[] = "Sheet {$required} tidak ditemukan.";
            }
        }

        $sections = [];
        foreach ($sheets['bagian'] ?? [] as $index => $row) {
            $key = trim((string) ($row['section_key'] ?? ''));
            $sections[] = [
                'key' => $key,
                'title' => trim((string) ($row['judul'] ?? $key)),
                'short_title' => trim((string) ($row['judul_singkat'] ?? $row['judul'] ?? $key)),
                'sort_order' => (int) ($row['urutan'] ?? $index + 1),
                'time_limit_seconds' => (int) ($row['durasi_menit'] ?? 0) * 60,
                'estimated_max_score' => (int) ($row['skor_maksimal'] ?? 0),
                'estimated_pass_score' => (int) ($row['batas_lulus'] ?? 0),
            ];
        }

        $questions = [];
        foreach ($sheets['soal'] ?? [] as $index => $row) {
            $sectionKey = trim((string) ($row['section_key'] ?? ''));
            $prompt = trim((string) ($row['pertanyaan'] ?? ''));
            $correct = trim((string) ($row['jawaban_benar'] ?? ''));
            $type = trim((string) ($row['tipe'] ?? 'multiple_choice'));
            if (! collect($sections)->contains('key', $sectionKey)) {
                $errors[] = 'Soal baris '.($index + 2).': section_key tidak ditemukan pada sheet Bagian.';
            }
            if ($prompt === '' || $correct === '') {
                $errors[] = 'Soal baris '.($index + 2).': pertanyaan dan jawaban_benar wajib diisi.';
            }
            if (! in_array($type, ['multiple_choice', 'fill_blank', 'typing', 'listening', 'sentence_builder'], true)) {
                $errors[] = 'Soal baris '.($index + 2).': tipe soal tidak didukung.';
            }
            $options = $this->options((string) ($row['opsi'] ?? ''));
            if ($type === 'multiple_choice' && count($options) < 2) {
                $errors[] = 'Soal baris '.($index + 2).': pilihan ganda minimal memiliki dua opsi.';
            }
            if ($type === 'listening' && trim((string) ($row['audio_path'] ?? '')) === '') {
                $errors[] = 'Soal baris '.($index + 2).': audio_path wajib untuk listening.';
            }
            $questions[$sectionKey][] = [
                'code' => trim((string) ($row['kode'] ?? '')) ?: null,
                'type' => $type,
                'sort_order' => (int) ($row['urutan'] ?? count($questions[$sectionKey] ?? []) + 1),
                'points' => (int) ($row['bobot'] ?? 1),
                'question_text' => $prompt,
                'question_reading' => trim((string) ($row['bacaan_pertanyaan'] ?? '')) ?: null,
                'options' => $options ?: null,
                'correct_answer' => $correct,
                'explanation' => trim((string) ($row['pembahasan'] ?? '')) ?: null,
                'audio_path' => trim((string) ($row['audio_path'] ?? '')) ?: null,
            ];
        }

        if (count($sections) !== count(array_unique(array_column($sections, 'key')))) {
            $errors[] = 'section_key pada sheet Bagian harus unik.';
        }
        $sectionValidator = Validator::make(['sections' => $sections], SyncExamSectionsRequest::rulesForCategory($version->exam->category ?? 'jlpt'));
        $errors = [...$errors, ...$sectionValidator->errors()->all()];
        foreach ($questions as $sectionQuestions) {
            $questionValidator = Validator::make(['questions' => $sectionQuestions], (new SyncExamQuestionsRequest)->rules());
            $errors = [...$errors, ...$questionValidator->errors()->all()];
        }

        return ['valid' => $errors === [], 'errors' => array_values(array_unique($errors)), 'summary' => ['sections' => count($sections), 'questions' => collect($questions)->flatten(1)->count()], 'data' => ['sections' => $sections, 'questions' => $questions]];
    }

    public function commit(ExamVersion $version, UploadedFile $file): ExamVersion
    {
        $preview = $this->preview($version, $file);
        if (! $preview['valid']) {
            throw ValidationException::withMessages(['file' => $preview['errors']]);
        }

        return DB::transaction(function () use ($version, $preview) {
            $version = ExamVersion::whereKey($version->id)->lockForUpdate()->firstOrFail();
            abort_if($version->status !== 'draft', 409, 'Import hanya dapat dilakukan pada draft.');
            if ($version->sections()->exists()) {
                throw ValidationException::withMessages(['file' => 'Impor hanya dapat dilakukan pada draft tanpa bagian agar naskah yang ada tidak tertimpa.']);
            }
            $this->authoring->syncSections($version, $preview['data']['sections']);
            $version->refresh()->load('sections');
            foreach ($version->sections as $section) {
                $this->authoring->syncQuestions($section, $preview['data']['questions'][$section->key] ?? []);
            }

            return $version->refresh()->load('sections.questions');
        });
    }

    public function template(): BinaryFileResponse
    {
        $path = $this->templates->xlsxWorkbookPath([
            'Ujian' => ['headers' => ['judul', 'level', 'jenis', 'akses'], 'rows' => [['Simulasi JLPT N3', 'N3', 'simulation', 'premium']]],
            'Bagian' => ['headers' => ['section_key', 'judul', 'judul_singkat', 'urutan', 'durasi_menit', 'skor_maksimal', 'batas_lulus'], 'rows' => [['vocabulary', '言語知識（文字・語彙）', 'Kosakata & Huruf', 1, 30, 60, 19]]],
            'Soal' => ['headers' => ['section_key', 'kode', 'urutan', 'tipe', 'pertanyaan', 'bacaan_pertanyaan', 'opsi', 'jawaban_benar', 'pembahasan', 'bobot', 'audio_path'], 'rows' => [['vocabulary', 'N3-MOJI-001', 1, 'multiple_choice', '「受付」の読み方は？', '', 'うけつけ|うけづけ|じゅけつけ|うけつき', 'うけつけ', '', 1, '']]],
        ], 'exam-template-');

        return response()->download($path, 'template-ujian-mandiri.xlsx')->deleteFileAfterSend(true);
    }

    private function options(string $value): array
    {
        if (trim($value) === '') {
            return [];
        }
        $json = json_decode($value, true);

        return is_array($json) ? array_values($json) : array_values(array_filter(array_map('trim', explode('|', $value))));
    }
}
