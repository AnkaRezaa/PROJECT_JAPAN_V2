<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\HariModul;
use App\Models\Kuis;
use App\Models\ProgramPembelajaran;
use App\Services\ImportKuisGrammarService;
use App\Services\ImportSpreadsheetService;
use App\Services\KloterBelajarService;
use App\Services\KuisGrammarGeneratorService;
use App\Services\KuisGrammarService;
use App\Services\TemplateExcelService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AdminGrammarQuizController extends Controller
{
    public function __construct(
        private readonly KloterBelajarService $kloter,
        private readonly KuisGrammarService $grammar
    ) {}

    public function index(Request $request, HariModul $moduleDay)
    {
        $this->authorizeDay($request, $moduleDay);

        return response()->json([
            'lessons' => $moduleDay->quizzes()
                ->where('type', 'grammar')
                ->with(['grammarLesson', 'questions'])
                ->get()
                ->map(fn (Kuis $quiz) => $this->grammar->payload($quiz, true)),
        ]);
    }

    public function show(Request $request, Kuis $quiz)
    {
        $this->authorizeQuiz($request, $quiz);

        return response()->json(['lesson' => $this->grammar->payload($quiz, true)]);
    }

    public function store(Request $request, HariModul $moduleDay)
    {
        $this->authorizeDay($request, $moduleDay);
        $validated = $this->validatePayload($request);

        $quiz = DB::transaction(function () use ($moduleDay, $validated) {
            $quiz = Kuis::create([
                'module_id' => $moduleDay->module_id,
                'module_day_id' => $moduleDay->id,
                'exam_order' => null,
                'type' => 'grammar',
                'time_limit' => $validated['time_limit'] ?? null,
                'passing_score' => $validated['passing_score'] ?? 70,
                'status' => 'draft',
            ]);

            return $this->grammar->sync($quiz, $validated);
        });

        return response()->json([
            'message' => 'Draf Grammar berhasil disimpan.',
            'lesson' => $this->grammar->payload($quiz, true),
        ], 201);
    }

    public function update(Request $request, Kuis $quiz)
    {
        $this->authorizeQuiz($request, $quiz);
        $validated = $this->validatePayload($request, $quiz);
        $quiz = $this->grammar->sync($quiz, $validated);

        return response()->json([
            'message' => 'Draf Grammar berhasil diperbarui.',
            'lesson' => $this->grammar->payload($quiz, true),
        ]);
    }

    public function updateStatus(Request $request, Kuis $quiz)
    {
        $this->authorizeQuiz($request, $quiz);
        $validated = $request->validate(['status' => ['required', Rule::in(['draft', 'published'])]]);

        if ($validated['status'] === 'published') {
            $this->grammar->assertPublishable($quiz);
        }

        $quiz->update(['status' => $validated['status']]);

        return response()->json([
            'message' => $validated['status'] === 'published'
                ? 'Lesson Grammar berhasil diterbitkan.'
                : 'Lesson Grammar dikembalikan menjadi draf.',
            'status' => $quiz->status,
        ]);
    }

    public function destroy(Request $request, Kuis $quiz)
    {
        $this->authorizeQuiz($request, $quiz);
        $quiz->delete();

        return response()->json(['message' => 'Lesson Grammar berhasil dihapus.']);
    }

    public function generateDraft(Request $request, KuisGrammarGeneratorService $generator)
    {
        if (empty(trim($request->input('lesson.pattern', '')))) {
            return response()->json([
                'message' => 'Pola Grammar wajib diisi terlebih dahulu sebelum membuat soal.',
            ], 422);
        }

        $validated = $request->validate([
            'lesson' => ['required', 'array'],
            'lesson.pattern' => ['required', 'string', 'max:255'],
            'lesson.title' => ['nullable', 'string', 'max:255'],
            'lesson.meaning' => ['nullable', 'string', 'max:5000'],
            'lesson.formula' => ['nullable', 'string', 'max:5000'],
            'lesson.explanation' => ['nullable', 'string', 'max:10000'],
            'lesson.level' => ['nullable', 'string', 'max:30'],
            'lesson.examples' => ['nullable', 'array', 'max:20'],
            'lesson.examples.*.japanese' => ['nullable', 'string', 'max:5000'],
            'lesson.examples.*.reading' => ['nullable', 'string', 'max:5000'],
            'lesson.examples.*.translation' => ['nullable', 'string', 'max:5000'],
            'settings' => ['nullable', 'array'],
            'settings.counts' => ['nullable', 'array'],
            'settings.counts.transformation' => ['nullable', 'integer', 'min:1', 'max:20'],
            'settings.counts.sentence_builder' => ['nullable', 'integer', 'min:1', 'max:20'],
            'settings.counts.context_choice' => ['nullable', 'integer', 'min:1', 'max:20'],
            'settings.useDistractors' => ['nullable', 'boolean'],
            'settings.difficulty' => ['nullable', 'string', 'in:easy,medium,hard,mixed'],
            'settings.autoMeaning' => ['nullable', 'boolean'],
        ], [
            'lesson.pattern.required' => 'Pola Grammar wajib diisi terlebih dahulu sebelum membuat soal.',
        ], [
            'lesson.pattern' => 'Pola Grammar',
            'lesson.title' => 'Judul Materi',
            'lesson.meaning' => 'Arti Pola',
            'lesson.formula' => 'Rumus Pola',
        ]);

        $stagesDraft = $generator->generateFromLesson(
            $validated['lesson'] ?? [],
            $validated['settings'] ?? []
        );

        $formattedStages = [
            [
                'id' => 'transformation',
                'title' => 'Stage 1: Transformasi Pola',
                'description' => 'Latihan perubahan bentuk kata kerja atau komponen grammar yang tepat.',
                'questions' => $stagesDraft['transformation'] ?? [],
            ],
            [
                'id' => 'sentence_builder',
                'title' => 'Stage 2: Penyusunan Kalimat',
                'description' => 'Susun kata acak menjadi kalimat utuh sesuai pola grammar.',
                'questions' => $stagesDraft['sentence_builder'] ?? [],
            ],
            [
                'id' => 'context_choice',
                'title' => 'Stage 3: Pilihan Kontekstual',
                'description' => 'Pilih kalimat yang paling tepat sesuai nuansa dan situasi yang diberikan.',
                'questions' => $stagesDraft['context_choice'] ?? [],
            ],
        ];

        return response()->json([
            'message' => 'Draf kuis berhasil di-generate secara otomatis.',
            'stages' => $formattedStages,
        ]);
    }

    public function regenerateQuestion(
        Request $request,
        KuisGrammarGeneratorService $generator
    ) {
        $validated = $request->validate([
            'stage' => ['required', 'string', 'in:transformation,sentence_builder,context_choice'],
            'index' => ['nullable', 'integer', 'min:0'],
            'lesson' => ['required', 'array'],
            'lesson.pattern' => ['nullable', 'string', 'max:255'],
            'lesson.formula' => ['nullable', 'string', 'max:5000'],
            'lesson.level' => ['nullable', 'string', 'max:30'],
            'lesson.examples' => ['nullable', 'array', 'max:20'],
            'settings' => ['nullable', 'array'],
        ]);

        $question = $generator->regenerateSingleQuestion(
            $validated['stage'],
            $validated['lesson'] ?? [],
            $validated['settings'] ?? [],
            (int) ($validated['index'] ?? 0)
        );

        return response()->json([
            'message' => 'Soal berhasil diperbarui dengan variasi baru.',
            'question' => $question,
        ]);
    }

    public function template(
        Request $request,
        ProgramPembelajaran $program,
        TemplateExcelService $excel
    ) {
        $this->kloter->abortJikaProgramDiLuarCakupan($request->user(), $program->id);
        $format = $request->query('format', 'xlsx');

        if ($format === 'csv') {
            $headers = ['stage', 'prompt', 'source_text', 'context', 'options_or_tokens', 'correct_answer_or_order', 'feedback', 'points', 'pattern', 'title', 'formula', 'meaning'];
            $sampleRows = [
                ['transformation', 'Ubah ke bentuk ば.', '勉強する', '', '勉強すれば|勉強したら|勉強して', '勉強すれば', 'する berubah menjadi すれば.', 1, '～ば～ほど', 'Semakin..., semakin...', 'Vば + V辞書形 + ほど', 'Semakin A, semakin B'],
                ['sentence_builder', 'Susun kalimat yang benar.', '', 'Semakin belajar, semakin mahir.', '勉強すれば|する|ほど|上手になります|まで', '勉強すれば|する|ほど|上手になります', 'Susun pola ば～ほど.', 1, '～ば～ほど', 'Semakin..., semakin...', 'Vば + V辞書形 + ほど', 'Semakin A, semakin B'],
                ['context_choice', 'Pilih kalimat yang sesuai.', '', 'Semakin sering latihan, semakin mahir.', '練習すればするほど、上手になります。|練習したことがあります。', '練習すればするほど、上手になります。', 'Gunakan pola ば～ほど.', 1, '～ば～ほど', 'Semakin..., semakin...', 'Vば + V辞書形 + ほど', 'Semakin A, semakin B'],
            ];

            $tempPath = tempnam(sys_get_temp_dir(), 'grammar-csv-');
            $handle = fopen($tempPath, 'w');
            fputs($handle, "\xEF\xBB\xBF");
            fputcsv($handle, $headers);
            foreach ($sampleRows as $row) {
                fputcsv($handle, $row);
            }
            fclose($handle);

            return response()->download($tempPath, 'template-kuis-grammar-'.$program->slug.'.csv')->deleteFileAfterSend(true);
        }

        $path = $excel->xlsxWorkbookPath([
            'Materi' => [
                'headers' => ['lesson_key', 'level', 'module_week', 'day_number', 'pattern', 'title', 'meaning', 'formula', 'explanation'],
                'rows' => [['n3-ba-hodo', 'JLPT N3', 1, 1, '～ば～ほど', 'Semakin..., semakin...', 'Semakin A, semakin B', 'Vば + V辞書形 + ほど', 'Hubungan perubahan A dan B.']],
            ],
            'Contoh' => [
                'headers' => ['lesson_key', 'order', 'japanese', 'reading', 'translation'],
                'rows' => [['n3-ba-hodo', 1, '勉強すればするほど、日本語が上手になります。', 'べんきょうすればするほど、にほんごがじょうずになります。', 'Semakin banyak belajar, semakin mahir bahasa Jepang.']],
            ],
            'Soal' => [
                'headers' => ['lesson_key', 'stage', 'order', 'prompt', 'source_text', 'context', 'options_or_tokens', 'correct_answer_or_order', 'feedback', 'points'],
                'rows' => [
                    ['n3-ba-hodo', 'transformation', 1, 'Ubah ke bentuk ば.', '勉強する', '', '勉強すれば|勉強したら|勉強して', '勉強すれば', 'する berubah menjadi すれば.', 1],
                    ['n3-ba-hodo', 'sentence_builder', 1, 'Susun kalimat yang benar.', '', 'Semakin belajar, semakin mahir.', '勉強すれば|する|ほど|上手になります|まで', '勉強すれば|する|ほど|上手になります', 'Susun pola ば～ほど.', 1],
                    ['n3-ba-hodo', 'context_choice', 1, 'Pilih kalimat yang sesuai.', '', 'Semakin sering latihan, semakin mahir.', '練習すればするほど、上手になります。|練習したことがあります。', '練習すればするほど、上手になります。', 'Gunakan pola ば～ほど.', 1],
                ],
            ],
        ], 'grammar-template-');

        return response()->download($path, 'template-kuis-grammar-'.$program->slug.'.xlsx')->deleteFileAfterSend(true);
    }

    public function previewImport(
        Request $request,
        ProgramPembelajaran $program,
        ImportSpreadsheetService $spreadsheets,
        ImportKuisGrammarService $importer
    ) {
        $this->kloter->abortJikaProgramDiLuarCakupan($request->user(), $program->id);
        $validated = $request->validate([
            'import_file' => ['required', 'file', 'mimes:xlsx,csv,txt', 'max:2048'],
            'module_day_id' => ['nullable', 'integer', 'exists:hari_moduls,id'],
        ]);

        $file = $validated['import_file'];
        $extension = strtolower($file->getClientOriginalExtension());
        $day = !empty($validated['module_day_id']) ? HariModul::find($validated['module_day_id']) : null;

        if ($extension === 'csv' || $extension === 'txt') {
            $rows = $spreadsheets->parseCsvRows($file->getRealPath());
            return response()->json($importer->previewFlatCsv($program, $rows, $day));
        }

        $sheets = $spreadsheets->xlsxSheets($file->getRealPath());

        return response()->json($importer->preview($program, $sheets));
    }

    public function import(
        Request $request,
        ProgramPembelajaran $program,
        ImportSpreadsheetService $spreadsheets,
        ImportKuisGrammarService $importer
    ) {
        $this->kloter->abortJikaProgramDiLuarCakupan($request->user(), $program->id);
        $validated = $request->validate([
            'import_file' => ['required', 'file', 'mimes:xlsx,csv,txt', 'max:2048'],
            'module_day_id' => ['nullable', 'integer', 'exists:hari_moduls,id'],
        ]);

        $file = $validated['import_file'];
        $extension = strtolower($file->getClientOriginalExtension());
        $day = !empty($validated['module_day_id']) ? HariModul::find($validated['module_day_id']) : null;

        if ($extension === 'csv' || $extension === 'txt') {
            $rows = $spreadsheets->parseCsvRows($file->getRealPath());
            $preview = $importer->previewFlatCsv($program, $rows, $day);
        } else {
            $preview = $importer->preview($program, $spreadsheets->xlsxSheets($file->getRealPath()));
        }

        if (! $preview['valid']) {
            return response()->json($preview, 422);
        }

        $count = ($extension === 'csv' || $extension === 'txt')
            ? $importer->commitFlatCsv($program, $preview, $day)
            : $importer->commit($program, $preview);

        return response()->json(['message' => "{$count} lesson Grammar disimpan sebagai draf.", 'imported_count' => $count]);
    }

    private function validatePayload(Request $request, ?Kuis $quiz = null): array
    {
        $messages = [
            'lesson.pattern.required' => 'Pola Grammar wajib diisi.',
            'lesson.title.required' => 'Judul materi grammar wajib diisi.',
            'lesson.meaning.required' => 'Arti pola grammar wajib diisi.',
            'lesson.formula.required' => 'Rumus pola grammar wajib diisi.',
            'lesson.examples.*.japanese.required' => 'Kalimat Jepang pada contoh wajib diisi.',
            'lesson.examples.*.translation.required' => 'Arti Indonesia pada contoh kalimat wajib diisi.',
            'stages.size' => 'Kuis grammar harus memiliki 3 tahapan (stage).',
            'stages.*.questions.min' => 'Setiap stage minimal harus memiliki 1 butir soal sebelum disimpan.',
            'stages.*.questions.*.prompt.required' => 'Instruksi pertanyaan wajib diisi.',
            'stages.*.questions.*.choices.*.required' => 'Pilihan jawaban tidak boleh kosong.',
        ];

        $customAttributes = [
            'lesson.pattern' => 'Pola Grammar',
            'lesson.title' => 'Judul Materi',
            'lesson.meaning' => 'Arti Pola',
            'lesson.formula' => 'Rumus Pola',
            'lesson.explanation' => 'Penjelasan Singkat',
            'lesson.examples' => 'Contoh Kalimat',
            'lesson.examples.*.japanese' => 'Kalimat Jepang Contoh',
            'lesson.examples.*.reading' => 'Cara Baca Contoh',
            'lesson.examples.*.translation' => 'Arti Indonesia Contoh',
            'stages' => 'Tahapan Stage',
            'stages.*.questions' => 'Daftar Soal',
        ];

        $validated = $request->validate([
            'time_limit' => ['nullable', 'integer', 'min:0', 'max:86400'],
            'passing_score' => ['nullable', 'integer', 'min:1', 'max:100'],
            'settings' => ['nullable', 'array'],
            'lesson' => ['required', 'array'],
            'lesson.lesson_key' => [
                'nullable', 'string', 'max:120', 'regex:/^[a-z0-9][a-z0-9-]*$/',
                Rule::unique('grammar_lessons', 'lesson_key')->ignore($quiz?->grammarLesson?->id),
            ],
            'lesson.level' => ['nullable', 'string', 'max:30'],
            'lesson.pattern' => ['required', 'string', 'max:255'],
            'lesson.title' => ['required', 'string', 'max:255'],
            'lesson.meaning' => ['required', 'string', 'max:5000'],
            'lesson.formula' => ['required', 'string', 'max:5000'],
            'lesson.explanation' => ['nullable', 'string', 'max:10000'],
            'lesson.examples' => ['present', 'array', 'max:20'],
            'lesson.examples.*.japanese' => ['required', 'string', 'max:5000'],
            'lesson.examples.*.reading' => ['nullable', 'string', 'max:5000'],
            'lesson.examples.*.translation' => ['required', 'string', 'max:5000'],
            'stages' => ['required', 'array', 'size:3'],
            'stages.*.id' => ['required', Rule::in(KuisGrammarService::STAGES)],
            'stages.*.questions' => ['required', 'array', 'min:1', 'max:100'],
            'stages.*.questions.*.id' => ['nullable', 'integer'],
            'stages.*.questions.*.type' => ['required', Rule::in(KuisGrammarService::STAGES)],
            'stages.*.questions.*.prompt' => ['required', 'string', 'max:5000'],
            'stages.*.questions.*.japanese' => ['nullable', 'string', 'max:5000'],
            'stages.*.questions.*.reading' => ['nullable', 'string', 'max:5000'],
            'stages.*.questions.*.translation' => ['nullable', 'string', 'max:5000'],
            'stages.*.questions.*.context' => ['nullable', 'string', 'max:5000'],
            'stages.*.questions.*.choices' => ['nullable', 'array', 'min:2', 'max:10'],
            'stages.*.questions.*.choices.*' => ['required', 'string', 'max:2000'],
            'stages.*.questions.*.correctAnswer' => ['nullable', 'string', 'max:2000'],
            'stages.*.questions.*.tokens' => ['nullable', 'array', 'min:2', 'max:20'],
            'stages.*.questions.*.tokens.*.id' => ['required_with:stages.*.questions.*.tokens', 'string', 'max:80'],
            'stages.*.questions.*.tokens.*.text' => ['required_with:stages.*.questions.*.tokens', 'string', 'max:1000'],
            'stages.*.questions.*.tokens.*.reading' => ['nullable', 'string', 'max:1000'],
            'stages.*.questions.*.distractor' => ['nullable', 'boolean'],
            'stages.*.questions.*.correctOrder' => ['nullable', 'array', 'min:1', 'max:20'],
            'stages.*.questions.*.correctOrder.*' => ['string', 'max:80'],
            'stages.*.questions.*.explanation' => ['nullable', 'string', 'max:5000'],
            'stages.*.questions.*.points' => ['nullable', 'integer', 'min:1', 'max:1000'],
        ], $messages, $customAttributes);

        $questionIds = collect($validated['stages'])
            ->flatMap(fn (array $stage) => $stage['questions'])
            ->pluck('id')
            ->filter()
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values();

        $ownedQuestionCount = $quiz
            ? $quiz->questions()->whereIn('id', $questionIds)->count()
            : 0;

        if ($questionIds->isNotEmpty() && $ownedQuestionCount !== $questionIds->count()) {
            throw ValidationException::withMessages([
                'stages' => 'Terdapat soal yang bukan bagian dari lesson Grammar ini.',
            ]);
        }

        return $validated;
    }

    private function authorizeDay(Request $request, HariModul $day): void
    {
        $this->kloter->abortJikaModulDiLuarCakupan($request->user(), (int) $day->module_id);
    }

    private function authorizeQuiz(Request $request, Kuis $quiz): void
    {
        abort_unless($quiz->isGrammar(), 404);
        $this->kloter->abortJikaModulDiLuarCakupan($request->user(), (int) $quiz->module_id);
    }
}
