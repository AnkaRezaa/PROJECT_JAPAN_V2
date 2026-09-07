<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\HariModul;
use App\Models\Kuis;
use App\Models\ProgramPembelajaran;
use App\Services\ImportKuisGrammarService;
use App\Services\ImportSpreadsheetService;
use App\Services\KloterBelajarService;
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

    public function template(
        Request $request,
        ProgramPembelajaran $program,
        TemplateExcelService $excel
    ) {
        $this->kloter->abortJikaProgramDiLuarCakupan($request->user(), $program->id);
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
        $validated = $request->validate(['import_file' => ['required', 'file', 'mimes:xlsx', 'max:2048']]);
        $sheets = $spreadsheets->xlsxSheets($validated['import_file']->getRealPath());

        return response()->json($importer->preview($program, $sheets));
    }

    public function import(
        Request $request,
        ProgramPembelajaran $program,
        ImportSpreadsheetService $spreadsheets,
        ImportKuisGrammarService $importer
    ) {
        $this->kloter->abortJikaProgramDiLuarCakupan($request->user(), $program->id);
        $validated = $request->validate(['import_file' => ['required', 'file', 'mimes:xlsx', 'max:2048']]);
        $preview = $importer->preview($program, $spreadsheets->xlsxSheets($validated['import_file']->getRealPath()));

        if (! $preview['valid']) {
            return response()->json($preview, 422);
        }

        $count = $importer->commit($program, $preview);

        return response()->json(['message' => "{$count} lesson Grammar disimpan sebagai draf.", 'imported_count' => $count]);
    }

    private function validatePayload(Request $request, ?Kuis $quiz = null): array
    {
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
            'stages.*.questions.*.tokens.*.distractor' => ['nullable', 'boolean'],
            'stages.*.questions.*.correctOrder' => ['nullable', 'array', 'min:1', 'max:20'],
            'stages.*.questions.*.correctOrder.*' => ['string', 'max:80'],
            'stages.*.questions.*.explanation' => ['nullable', 'string', 'max:5000'],
            'stages.*.questions.*.points' => ['nullable', 'integer', 'min:1', 'max:1000'],
        ]);

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
