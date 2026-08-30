<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\KuisRequest;
use App\Models\Kosakata;
use App\Models\Kuis;
use App\Models\Modul;
use App\Models\SetFlashcard;
use App\Models\Soal;
use App\Services\ImportSpreadsheetService;
use App\Services\NotifikasiPenggunaService;
use App\Services\SoalKuisService;
use App\Services\TemplateExcelService;
use App\Services\KloterBelajarService;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class AdminKuisController extends Controller
{
    public function __construct(private readonly KloterBelajarService $kloterService)
    {
    }

    public function store(
        KuisRequest $request,
        NotifikasiPenggunaService $notifikasi
    ) {
        $validated = $request->validated();
        $this->kloterService->abortJikaModulDiLuarCakupan($request->user(), (int) $validated['module_id']);
        $stayOnRoadmap = (bool) Arr::pull($validated, 'stay_on_roadmap', false);
        $validated['available_at'] = filled($validated['module_day_id'] ?? null)
            ? null
            : ($validated['available_at'] ?? null);
        $validated['status'] = 'draft';

        $quiz = DB::transaction(function () use ($validated) {
            $module = Modul::query()->lockForUpdate()->findOrFail($validated['module_id']);

            $validated['exam_order'] = empty($validated['module_day_id'])
                ? ((int) Kuis::query()
                    ->where('module_id', $module->id)
                    ->whereNotNull('exam_order')
                    ->max('exam_order')) + 1
                : null;

            $quiz = Kuis::create($validated);

            return $quiz;
        });

        if ($quiz->status === 'published') {
            $this->kirimNotifikasiKuisTerbit($quiz, $notifikasi);
        }

        if ($stayOnRoadmap) {
            return redirect()->back()->with('success', 'Latihan menulis berhasil ditambahkan ke Day.');
        }

        return redirect()->route('admin.quizzes.builder', $quiz)->with('success', 'Kuis berhasil dibuat');
    }

    public function update(KuisRequest $request, Kuis $quiz, NotifikasiPenggunaService $notifikasi)
    {
        $this->kloterService->abortJikaModulDiLuarCakupan($request->user(), (int) $quiz->module_id);
        $oldStatus = $quiz->status;
        $validated = $request->validated();
        $validated['available_at'] = filled($validated['module_day_id'] ?? null)
            ? null
            : ($validated['available_at'] ?? null);

        if (($validated['status'] ?? $quiz->status) === 'published' && ! $quiz->questions()->exists()) {
            throw ValidationException::withMessages([
                'status' => 'Kuis tanpa soal tidak dapat dipublikasikan.',
            ]);
        }

        DB::transaction(function () use ($quiz, $validated) {
            $oldModuleId = $quiz->module_id;
            $wasWeeklyExam = $quiz->isWeeklyExam();
            $newModule = Modul::query()->lockForUpdate()->findOrFail($validated['module_id']);
            $becomesWeeklyExam = empty($validated['module_day_id']);

            $validated['exam_order'] = $becomesWeeklyExam
                ? ($wasWeeklyExam && (int) $oldModuleId === (int) $newModule->id
                    ? $quiz->exam_order
                    : ((int) Kuis::query()
                        ->where('module_id', $newModule->id)
                        ->whereNotNull('exam_order')
                        ->max('exam_order')) + 1)
                : null;

            $quiz->update($validated);

            if ($wasWeeklyExam && ((int) $oldModuleId !== (int) $quiz->module_id || ! $becomesWeeklyExam)) {
                $this->renumberWeeklyExams((int) $oldModuleId);
            }
        });

        if ($oldStatus !== 'published' && $quiz->status === 'published') {
            $this->kirimNotifikasiKuisTerbit($quiz, $notifikasi);
        }

        return redirect()->back()->with('success', 'Kuis berhasil diperbarui');
    }

    public function updateStatus(Request $request, Kuis $quiz, NotifikasiPenggunaService $notifikasi)
    {
        $this->kloterService->abortJikaModulDiLuarCakupan($request->user(), (int) $quiz->module_id);
        $oldStatus = $quiz->status;
        $validated = $request->validate([
            'status' => ['required', 'in:draft,published'],
        ]);

        if ($validated['status'] === 'published' && ! $quiz->questions()->exists()) {
            throw ValidationException::withMessages([
                'status' => 'Ujian tanpa soal tidak dapat dipublikasikan.',
            ]);
        }

        $quiz->update($validated);

        if ($oldStatus !== 'published' && $quiz->status === 'published') {
            $this->kirimNotifikasiKuisTerbit($quiz, $notifikasi);
        }

        return redirect()->back()->with('success', 'Status kuis berhasil diperbarui');
    }

    public function destroy(Request $request, Kuis $quiz)
    {
        $this->kloterService->abortJikaModulDiLuarCakupan($request->user(), (int) $quiz->module_id);
        $module = $quiz->module()->first(['id', 'program_pembelajaran_id']);
        $dayId = $quiz->module_day_id;

        DB::transaction(function () use ($quiz) {
            $moduleId = (int) $quiz->module_id;
            $wasWeeklyExam = $quiz->isWeeklyExam();

            $quiz->delete();

            if ($wasWeeklyExam) {
                $this->renumberWeeklyExams($moduleId);
            }
        });

        return $module
            ? redirect()->route('admin.modules.index', [
                'program_id' => $module->program_pembelajaran_id,
                'week_id' => $module->id,
                'day_id' => $dayId,
                'focus' => 'roadmap',
            ])->with('success', 'Kuis berhasil dihapus')
            : redirect()->route('admin.programs.index')->with('success', 'Kuis berhasil dihapus');
    }

    public function legacyQuestionsIndex()
    {
        return redirect()->route('admin.programs.index');
    }

    public function legacyQuestionEdit(Soal $question)
    {
        return redirect()->route('admin.quizzes.builder', $question->quiz_id);
    }

    public function legacyQuestionsGone()
    {
        abort(410, 'Soal dikelola lewat Builder Kuis.');
    }

    public function builder(Kuis $quiz, Request $request)
    {
        $this->kloterService->abortJikaModulDiLuarCakupan($request->user(), (int) $quiz->module_id);
        $quiz->load([
            'module:id,program_pembelajaran_id,title,week_number,level_id',
            'module.level:id,level_name',
            'module.programPembelajaran:id,curriculum_track_id,level_id,title',
            'module.programPembelajaran.curriculumTrack:id,code,name',
            'day:id,module_id,day_number,title',
            'questions' => fn ($query) => $query
                ->withCount([
                    'attemptAnswers as attempts_count',
                    'attemptAnswers as correct_count' => fn ($answerQuery) => $answerQuery->where('is_correct', true),
                ])
                ->orderBy('order'),
        ]);

        $isWeeklyExam = $quiz->isWeeklyExam();
        $flashcardWorkspace = null;

        if (! $isWeeklyExam && $quiz->module_day_id) {
            $vocabularyQuery = Kosakata::query()
                ->where(function ($query) use ($quiz) {
                    $query->whereNull('module_id')
                        ->orWhere('module_id', $quiz->module_id);
                })
                ->orderBy('word');

            if ($request->filled('search')) {
                $search = $request->string('search')->toString();
                $vocabularyQuery->where(function ($query) use ($search) {
                    $query->where('word', 'like', "%{$search}%")
                        ->orWhere('reading', 'like', "%{$search}%")
                        ->orWhere('meaning_id', 'like', "%{$search}%")
                        ->orWhere('category', 'like', "%{$search}%");
                });
            }

            if ($request->filled('status') && $request->status !== 'all') {
                $vocabularyQuery->where('status', $request->status);
            }

            if ($request->filled('content_type') && $request->content_type !== 'all') {
                $vocabularyQuery->where('content_type', $request->content_type);
            }

            $flashcardWorkspace = [
                'sets' => SetFlashcard::query()
                    ->with([
                        'level:id,level_name',
                        'module:id,program_pembelajaran_id,title,week_number',
                        'day:id,module_id,day_number,title',
                        'flashcards.vocabulary',
                    ])
                    ->where('module_id', $quiz->module_id)
                    ->where('module_day_id', $quiz->module_day_id)
                    ->orderBy('id')
                    ->get(),
                'vocabulary' => $vocabularyQuery->paginate(12)->withQueryString(),
                'filters' => $request->only('search', 'status', 'content_type'),
            ];
        }

        return Inertia::render($isWeeklyExam ? 'Admin/Ujian/BuilderUjian' : 'Admin/Kuis/BuilderKuis', [
            'quiz' => [
                'id' => $quiz->id,
                'title' => $isWeeklyExam
                    ? 'Ujian '.($quiz->exam_order ?? 1).' - Minggu '.($quiz->module?->week_number ?? '')
                    : 'Kuis '.($quiz->day?->title ?? $quiz->module?->title ?? ''),
                'is_weekly_exam' => $isWeeklyExam,
                'exam_order' => $quiz->exam_order,
                'attempt_count' => $quiz->attempts()->count(),
                'type' => $quiz->type,
                'time_limit' => $quiz->time_limit,
                'passing_score' => $quiz->passing_score ?? 70,
                'available_at' => $quiz->available_at?->toISOString(),
                'status' => $quiz->status ?? 'published',
                'module' => $quiz->module,
                'day' => $quiz->day,
                'lesson' => null,
            ],
            'questions' => $quiz->questions
                ->where('type', '!=', 'handwriting')
                ->values()
                ->map(fn ($question) => [
                    'id' => $question->id,
                    'type' => $question->type ?: ($quiz->type ?: 'multiple_choice'),
                    'question_text' => $question->question_text,
                    'question_reading' => $question->question_reading,
                    'correct_answer' => $question->correct_answer,
                    'correct_answer_reading' => $question->correct_answer_reading,
                    'options' => $question->options ?? [],
                    'option_readings' => $question->option_readings ?? [],
                    'explanation' => $question->explanation,
                    'explanation_reading' => $question->explanation_reading,
                    'audio_url' => $question->audio_url,
                    'order' => $question->order,
                    'points' => (int) ($question->points ?? 1),
                    'attempts_count' => (int) $question->attempts_count,
                    'correct_count' => (int) $question->correct_count,
                    'correct_rate' => $question->attempts_count > 0
                        ? round(($question->correct_count / $question->attempts_count) * 100, 1)
                        : null,
                ]),
            'flashcardWorkspace' => $flashcardWorkspace,
        ]);
    }

    public function updateQuestions(Request $request, Kuis $quiz, SoalKuisService $questions)
    {
        $validated = $request->validate([
            'time_limit' => ['nullable', 'integer', 'min:0', 'max:1440'],
            'passing_score' => ['nullable', 'integer', 'min:1', 'max:100'],
            'questions' => 'present|array',
            'questions.*.id' => 'nullable|integer',
            'questions.*.type' => ['required', Rule::in(['multiple_choice', 'fill_blank', 'listening'])],
            'questions.*.question_text' => 'required|string|max:5000',
            'questions.*.question_reading' => 'nullable|string|max:5000',
            'questions.*.correct_answer' => 'required|string|max:1000',
            'questions.*.correct_answer_reading' => 'nullable|string|max:1000',
            'questions.*.options' => 'nullable|array',
            'questions.*.option_readings' => 'nullable|array',
            'questions.*.option_readings.*' => 'nullable|string|max:1000',
            'questions.*.explanation' => 'nullable|string|max:5000',
            'questions.*.explanation_reading' => 'nullable|string|max:5000',
            'questions.*.audio_url' => 'nullable|string|max:2048',
            'questions.*.points' => ['nullable', 'integer', 'min:1', 'max:1000'],
        ]);

        DB::transaction(function () use ($quiz, $validated, $questions) {
            $quiz->update([
                'time_limit' => $validated['time_limit'] ?? null,
                'passing_score' => $validated['passing_score'] ?? ($quiz->passing_score ?? 70),
                'status' => empty($validated['questions']) ? 'draft' : $quiz->status,
            ]);

            $questions->syncQuestions($quiz, $validated);
        });

        return redirect()->back()->with('success', 'Soal kuis berhasil disimpan');
    }

    public function importQuestions(
        Request $request,
        Kuis $quiz,
        ImportSpreadsheetService $spreadsheets,
        SoalKuisService $questions
    ) {
        $validated = $request->validate([
            'import_file' => ['required', 'file', 'max:2048'],
        ]);

        $file = $validated['import_file'];
        $extension = strtolower($file->getClientOriginalExtension());

        if (! in_array($extension, ['csv', 'txt', 'xlsx'], true)) {
            return redirect()->back()->withErrors(['import_file' => 'Format import harus CSV atau XLSX.']);
        }

        $rows = $spreadsheets->rows($file->getRealPath(), $extension);

        if (empty($rows)) {
            return redirect()->back()->withErrors(['import_file' => 'Tidak ada baris soal yang dapat diimport atau header tidak valid.']);
        }

        $created = $questions->importRows($quiz, $rows);

        if ($created === 0) {
            return redirect()->back()->withErrors(['import_file' => 'Tidak ada soal valid. Pastikan kolom question_text dan correct_answer terisi.']);
        }

        return redirect()->back()->with('success', "{$created} soal berhasil diimport.");
    }

    public function previewImportQuestions(
        Request $request,
        Kuis $quiz,
        ImportSpreadsheetService $spreadsheets,
        SoalKuisService $questions
    ) {
        $validated = $request->validate([
            'import_file' => ['required', 'file', 'max:2048'],
        ]);

        $file = $validated['import_file'];
        $extension = strtolower($file->getClientOriginalExtension());

        if (! in_array($extension, ['csv', 'txt', 'xlsx'], true)) {
            return response()->json([
                'message' => 'Format import harus CSV atau XLSX.',
            ], 422);
        }

        $rows = $spreadsheets->rows($file->getRealPath(), $extension);

        if (empty($rows)) {
            return response()->json([
                'message' => 'Tidak ada baris soal yang dapat diimport atau header tidak valid.',
            ], 422);
        }

        return response()->json($questions->previewRows($quiz, $rows));
    }

    public function downloadImportTemplate(
        Kuis $quiz,
        string $format,
        TemplateExcelService $templates,
        SoalKuisService $questions
    ) {
        $format = strtolower($format);

        if (! in_array($format, ['csv', 'xlsx'], true)) {
            abort(404);
        }

        $headers = $questions->importHeaders();
        $rows = $questions->templateRows($quiz);
        $filename = 'toku-up-quiz-import-template-v1.'.$format;

        if ($format === 'csv') {
            return $templates->csvResponse($headers, $rows, $filename);
        }

        $path = $templates->xlsxPath($headers, $rows, 'Kuis Import', 'toku_up_quiz_template_');

        return response()
            ->download($path, $filename, [
                'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            ])
            ->deleteFileAfterSend(true);
    }

    public function generateVocabularyQuestions(Request $request, Kuis $quiz, SoalKuisService $questions)
    {
        $validated = $this->validateVocabularyGenerator($request, $quiz);

        $created = $questions->generateFromVocabulary($quiz, $validated);

        return redirect()->back()->with('success', "{$created} soal berhasil dibuat dari bank konten.");
    }

    public function previewVocabularyQuestions(Request $request, Kuis $quiz, SoalKuisService $questions)
    {
        return response()->json(
            $questions->previewFromVocabulary($quiz, $this->validateVocabularyGenerator($request, $quiz))
        );
    }

    private function validateVocabularyGenerator(Request $request, Kuis $quiz): array
    {
        $validated = $request->validate([
            'jlpt_level' => ['nullable', 'string', 'max:8'],
            'category' => ['nullable', 'string', 'max:100'],
            'count' => ['required', 'integer', 'min:1', 'max:50'],
            'mode' => ['required', Rule::in(['word_to_meaning', 'meaning_to_word', 'reading_to_word'])],
            'status' => ['required', Rule::in(['published', 'draft', 'all'])],
            'content_type' => ['nullable', Rule::in([...Kosakata::contentTypes(), 'all'])],
            'vocabulary_ids' => ['nullable', 'array', 'max:50'],
            'vocabulary_ids.*' => [
                'integer',
                Rule::exists('vocabulary_bank', 'id')->where(
                    fn ($query) => $query
                        ->whereNull('module_id')
                        ->orWhere('module_id', $quiz->module_id)
                ),
            ],
        ]);

        $validated['module_id'] = $quiz->module_id;

        return $validated;
    }

    private function kirimNotifikasiKuisTerbit(Kuis $quiz, NotifikasiPenggunaService $notifikasi): void
    {
        $quiz->loadMissing('module.programPembelajaran');

        if (! $quiz->module) {
            return;
        }

        $url = $quiz->module->programPembelajaran
            ? route('user.modul.program', $quiz->module->programPembelajaran->slug)
            : route('user.kelas.index');

        $notifikasi->kirimKePenggunaYangBisaAksesModul(
            $quiz->module,
            'new_quiz',
            'Kuis baru tersedia',
            "Kuis untuk {$quiz->module->title} sudah bisa dikerjakan.",
            $url,
            ['quiz_id' => $quiz->id, 'module_id' => $quiz->module_id]
        );
    }

    private function renumberWeeklyExams(int $moduleId): void
    {
        Kuis::query()
            ->where('module_id', $moduleId)
            ->whereNotNull('exam_order')
            ->orderBy('exam_order')
            ->orderBy('id')
            ->get()
            ->each(function (Kuis $exam, int $index) {
                $expectedOrder = $index + 1;

                if ((int) $exam->exam_order !== $expectedOrder) {
                    $exam->update(['exam_order' => $expectedOrder]);
                }
            });
    }
}
