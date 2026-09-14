<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ImportExamBankQuestionsRequest;
use App\Http\Requests\Admin\PullExamBankQuestionsRequest;
use App\Http\Requests\Admin\StoreExamBankQuestionRequest;
use App\Http\Requests\Admin\StoreExamQuestionBankRequest;
use App\Http\Requests\Admin\StoreExamQuestionWrapperRequest;
use App\Http\Requests\Admin\UpdateExamQuestionBankRequest;
use App\Models\ExamBankQuestion;
use App\Models\ExamQuestionBank;
use App\Models\ExamQuestionWrapper;
use App\Models\ExamSection;
use App\Models\LevelPembelajaran;
use App\Services\ExamQuestionBankService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminExamQuestionBankController extends Controller
{
    public function __construct(
        private readonly ExamQuestionBankService $bankService,
    ) {}

    public function index(Request $request): Response
    {
        $filters = [
            'search' => (string) $request->string('search'),
            'level' => (string) $request->string('level', 'all'),
            'status' => (string) $request->string('status', 'all'),
        ];

        $query = ExamQuestionBank::with('level:id,level_name')
            ->withCount(['wrappers', 'questions'])
            ->latest('id');

        if ($filters['search'] !== '') {
            $query->where(function ($q) use ($filters) {
                $q->where('title', 'like', "%{$filters['search']}%")
                    ->orWhere('source', 'like', "%{$filters['search']}%")
                    ->orWhere('description', 'like', "%{$filters['search']}%");
            });
        }

        if ($filters['level'] !== 'all') {
            $query->whereHas('level', fn ($lq) => $lq->where('level_name', $filters['level'])->orWhere('id', $filters['level']));
        }

        if ($filters['status'] !== 'all') {
            $query->where('status', $filters['status']);
        }

        $banks = $query->paginate(12)->withQueryString()->through(fn (ExamQuestionBank $item) => [
            'id' => $item->id,
            'slug' => $item->slug,
            'title' => $item->title,
            'source' => $item->source,
            'level' => $item->level?->level_name ?? '-',
            'level_id' => $item->level_id,
            'description' => $item->description,
            'status' => $item->status,
            'wrappers_count' => $item->wrappers_count,
            'questions_count' => $item->questions_count,
            'updated_at' => optional($item->updated_at)->format('Y-m-d H:i'),
        ]);

        $levels = LevelPembelajaran::orderBy('id')->get(['id', 'level_name']);

        return Inertia::render('Admin/Ujian/BankSoal/Index', [
            'banks' => $banks,
            'levels' => $levels,
            'filters' => $filters,
        ]);
    }

    public function store(StoreExamQuestionBankRequest $request): RedirectResponse
    {
        $bank = $this->bankService->createBank($request->validated(), $request->user());

        return redirect()->route('admin.exams.question-banks.show', $bank)->with('success', 'Bank soal baru berhasil dibuat.');
    }

    public function show(ExamQuestionBank $bank): Response
    {
        $bank->load([
            'level:id,level_name',
            'wrappers' => fn ($q) => $q->orderBy('sort_order')->orderBy('id'),
            'wrappers.questions' => fn ($q) => $q->orderBy('sort_order')->orderBy('id'),
            'questions' => fn ($q) => $q->whereNull('exam_question_wrapper_id')->orderBy('sort_order')->orderBy('id'),
        ]);

        $levels = LevelPembelajaran::orderBy('id')->get(['id', 'level_name']);

        return Inertia::render('Admin/Ujian/BankSoal/Show', [
            'bank' => [
                'id' => $bank->id,
                'slug' => $bank->slug,
                'title' => $bank->title,
                'source' => $bank->source,
                'description' => $bank->description,
                'status' => $bank->status,
                'level' => $bank->level?->level_name ?? '-',
                'level_id' => $bank->level_id,
                'wrappers' => $bank->wrappers->map(fn (ExamQuestionWrapper $wrapper) => [
                    'id' => $wrapper->id,
                    'wrapper_code' => $wrapper->wrapper_code,
                    'title' => $wrapper->title,
                    'category' => $wrapper->category,
                    'mondai_number' => $wrapper->mondai_number,
                    'stimulus_text' => $wrapper->stimulus_text,
                    'stimulus_reading' => $wrapper->stimulus_reading,
                    'audio_url' => $wrapper->audio_url,
                    'sort_order' => $wrapper->sort_order,
                    'questions' => $wrapper->questions->map(fn (ExamBankQuestion $q) => $this->mapQuestion($q)),
                ]),
                'standalone_questions' => $bank->questions->map(fn (ExamBankQuestion $q) => $this->mapQuestion($q)),
            ],
            'levels' => $levels,
        ]);
    }

    public function update(UpdateExamQuestionBankRequest $request, ExamQuestionBank $bank): RedirectResponse
    {
        $this->bankService->updateBank($bank, $request->validated(), $request->user());

        return back()->with('success', 'Informasi bank soal diperbarui.');
    }

    public function destroy(ExamQuestionBank $bank): RedirectResponse
    {
        $this->bankService->deleteBank($bank);

        return redirect()->route('admin.exams.question-banks.index')->with('success', 'Bank soal berhasil dihapus.');
    }

    public function storeWrapper(StoreExamQuestionWrapperRequest $request, ExamQuestionBank $bank): JsonResponse
    {
        $wrapper = $this->bankService->createWrapper($bank, $request->validated());

        return response()->json(['wrapper' => $wrapper], 201);
    }

    public function updateWrapper(StoreExamQuestionWrapperRequest $request, ExamQuestionWrapper $wrapper): JsonResponse
    {
        $updated = $this->bankService->updateWrapper($wrapper, $request->validated());

        return response()->json(['wrapper' => $updated]);
    }

    public function destroyWrapper(ExamQuestionWrapper $wrapper): JsonResponse
    {
        $this->bankService->deleteWrapper($wrapper);

        return response()->json(['success' => true]);
    }

    public function storeQuestion(StoreExamBankQuestionRequest $request, ExamQuestionBank $bank): JsonResponse
    {
        $question = $this->bankService->createQuestion($bank, $request->validated());

        return response()->json(['question' => $this->mapQuestion($question)], 201);
    }

    public function updateQuestion(StoreExamBankQuestionRequest $request, ExamBankQuestion $question): JsonResponse
    {
        $updated = $this->bankService->updateQuestion($question, $request->validated());

        return response()->json(['question' => $this->mapQuestion($updated)]);
    }

    public function destroyQuestion(ExamBankQuestion $question): JsonResponse
    {
        $this->bankService->deleteQuestion($question);

        return response()->json(['success' => true]);
    }

    public function template(string $format): BinaryFileResponse|StreamedResponse
    {
        return $this->bankService->template($format);
    }

    public function importPreview(ImportExamBankQuestionsRequest $request, ExamQuestionBank $bank): JsonResponse
    {
        return response()->json($this->bankService->preview($bank, $request->file('file')));
    }

    public function import(ImportExamBankQuestionsRequest $request, ExamQuestionBank $bank): JsonResponse
    {
        $result = $this->bankService->commit($bank, $request->file('file'));

        return response()->json(['success' => true, 'result' => $result]);
    }

    public function picker(Request $request): JsonResponse
    {
        $levelId = $request->input('level_id');
        $category = $request->input('category');
        $search = $request->input('search');

        $query = ExamQuestionBank::with([
            'level:id,level_name',
            'wrappers' => function ($wq) use ($category) {
                if ($category && $category !== 'all') {
                    $wq->where('category', $category);
                }
                $wq->with('questions');
            },
            'questions' => function ($qq) {
                $qq->whereNull('exam_question_wrapper_id');
            },
        ])->where('status', 'published');

        if ($levelId) {
            $query->where('level_id', $levelId);
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('source', 'like', "%{$search}%");
            });
        }

        $banks = $query->get()->map(fn (ExamQuestionBank $bank) => [
            'id' => $bank->id,
            'title' => $bank->title,
            'source' => $bank->source,
            'level' => $bank->level?->level_name,
            'wrappers' => $bank->wrappers->map(fn (ExamQuestionWrapper $w) => [
                'id' => $w->id,
                'wrapper_code' => $w->wrapper_code,
                'title' => $w->title,
                'category' => $w->category,
                'mondai_number' => $w->mondai_number,
                'stimulus_text' => $w->stimulus_text,
                'audio_url' => $w->audio_url,
                'questions' => $w->questions->map(fn (ExamBankQuestion $q) => $this->mapQuestion($q)),
            ]),
            'standalone_questions' => $bank->questions->map(fn (ExamBankQuestion $q) => $this->mapQuestion($q)),
        ]);

        return response()->json(['banks' => $banks]);
    }

    public function pullQuestions(PullExamBankQuestionsRequest $request, ExamSection $section): JsonResponse
    {
        $count = $this->bankService->pullToExamSection($section, $request->validated('bank_question_ids'));

        return response()->json([
            'pulled_count' => $count,
            'section' => $section->refresh()->load('questions'),
        ]);
    }

    private function mapQuestion(ExamBankQuestion $q): array
    {
        return [
            'id' => $q->id,
            'exam_question_bank_id' => $q->exam_question_bank_id,
            'exam_question_wrapper_id' => $q->exam_question_wrapper_id,
            'code' => $q->code,
            'type' => $q->type,
            'sort_order' => $q->sort_order,
            'points' => $q->points,
            'question_text' => $q->question_text,
            'question_reading' => $q->question_reading,
            'options' => $q->options ?? [],
            'option_readings' => $q->option_readings ?? [],
            'correct_answer' => $q->correct_answer,
            'correct_answer_reading' => $q->correct_answer_reading,
            'explanation' => $q->explanation,
            'explanation_reading' => $q->explanation_reading,
            'audio_url' => $q->audio_url,
        ];
    }
}
