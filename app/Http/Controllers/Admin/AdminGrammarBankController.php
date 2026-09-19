<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ExamQuestionBank;
use App\Models\GrammarBank;
use App\Models\HariModul;
use App\Models\Kosakata;
use App\Models\LevelPembelajaran;
use App\Services\GrammarBankService;
use App\Services\KloterBelajarService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AdminGrammarBankController extends Controller
{
    public function __construct(
        private readonly GrammarBankService $grammarService,
        private readonly KloterBelajarService $kloterService
    ) {}

    public function index(Request $request): Response|JsonResponse
    {
        $filters = [
            'search' => (string) $request->string('search'),
            'level' => (string) $request->string('level', 'all'),
            'category' => (string) $request->string('category', 'all'),
            'status' => (string) $request->string('status', 'all'),
        ];

        if ($request->wantsJson()) {
            return response()->json($this->grammarService->list($filters, $request->integer('per_page', 20)));
        }

        $activeTab = (string) $request->string('tab', 'grammar');
        $grammarList = $this->grammarService->list($filters, 15);
        $levels = $this->grammarService->levels();

        $stats = [
            'total_vocabulary' => Kosakata::count(),
            'total_grammar' => \Illuminate\Support\Facades\Schema::hasTable('grammar_bank') ? GrammarBank::count() : 0,
            'total_exam_banks' => ExamQuestionBank::count(),
        ];

        $moduleDays = HariModul::query()
            ->with([
                'module:id,title,week_number,program_pembelajaran_id',
                'module.programPembelajaran:id,title',
            ])
            ->whereHas('module.programPembelajaran', function ($pq) use ($request) {
                $this->kloterService->batasiProgramDikelola($pq, $request->user());
            })
            ->orderBy('module_id')
            ->orderBy('day_number')
            ->get()
            ->map(fn ($day) => [
                'id' => $day->id,
                'day_number' => $day->day_number,
                'title' => $day->title,
                'module_id' => $day->module_id,
                'module_title' => $day->module?->title,
                'week_number' => $day->module?->week_number,
                'program_id' => $day->module?->program_pembelajaran_id,
                'program_title' => $day->module?->programPembelajaran?->title,
            ])
            ->values();

        return Inertia::render('Admin/BankSoalKonten/PusatBankSoalKonten', [
            'activeTab' => $activeTab,
            'grammarItems' => $grammarList,
            'filters' => $filters,
            'levels' => $levels,
            'stats' => $stats,
            'moduleDays' => $moduleDays,
        ]);
    }

    public function picker(Request $request): JsonResponse
    {
        $query = GrammarBank::query()->published();

        if ($request->filled('level') && $request->string('level') !== 'all') {
            $query->level($request->string('level'));
        }

        if ($request->filled('search')) {
            $query->search($request->string('search'));
        }

        $items = $query->latest('id')
            ->limit(30)
            ->get(['id', 'jlpt_level', 'pattern', 'title', 'meaning', 'formula', 'examples']);

        return response()->json(['data' => $items]);
    }

    public function store(Request $request): RedirectResponse|JsonResponse
    {
        $validated = $request->validate([
            'jlpt_level' => ['required', 'string', 'max:10'],
            'level_id' => ['nullable', 'exists:levels,id'],
            'lesson_key' => ['nullable', 'string', 'max:120', 'unique:grammar_bank,lesson_key'],
            'pattern' => ['required', 'string', 'max:255'],
            'title' => ['required', 'string', 'max:255'],
            'meaning' => ['required', 'string', 'max:5000'],
            'formula' => ['required', 'string', 'max:5000'],
            'explanation' => ['nullable', 'string', 'max:5000'],
            'examples' => ['nullable', 'array'],
            'examples.*.japanese' => ['required_with:examples', 'string', 'max:2000'],
            'examples.*.reading' => ['nullable', 'string', 'max:2000'],
            'examples.*.translation' => ['required_with:examples', 'string', 'max:2000'],
            'category' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', 'in:draft,published'],
        ]);

        $entry = $this->grammarService->store($validated, $request->user()?->id);

        if ($request->wantsJson()) {
            return response()->json(['message' => 'Pola grammar berhasil disimpan ke bank.', 'data' => $entry], 201);
        }

        return redirect()->back()->with('success', "Pola {$entry->pattern} berhasil ditambahkan ke Bank Grammar.");
    }

    public function show(GrammarBank $grammarBank): JsonResponse
    {
        return response()->json([
            'data' => $grammarBank->load(['level', 'lessons']),
        ]);
    }

    public function update(Request $request, GrammarBank $grammarBank): RedirectResponse|JsonResponse
    {
        $validated = $request->validate([
            'jlpt_level' => ['sometimes', 'required', 'string', 'max:10'],
            'level_id' => ['nullable', 'exists:levels,id'],
            'pattern' => ['sometimes', 'required', 'string', 'max:255'],
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'meaning' => ['sometimes', 'required', 'string', 'max:5000'],
            'formula' => ['sometimes', 'required', 'string', 'max:5000'],
            'explanation' => ['nullable', 'string', 'max:5000'],
            'examples' => ['nullable', 'array'],
            'examples.*.japanese' => ['required_with:examples', 'string', 'max:2000'],
            'examples.*.reading' => ['nullable', 'string', 'max:2000'],
            'examples.*.translation' => ['required_with:examples', 'string', 'max:2000'],
            'category' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', 'in:draft,published'],
        ]);

        $updated = $this->grammarService->update($grammarBank, $validated, $request->user()?->id);

        if ($request->wantsJson()) {
            return response()->json(['message' => 'Pola grammar berhasil diperbarui.', 'data' => $updated]);
        }

        return redirect()->back()->with('success', "Pola {$updated->pattern} berhasil diperbarui.");
    }

    public function destroy(Request $request, GrammarBank $grammarBank): RedirectResponse|JsonResponse
    {
        $pattern = $grammarBank->pattern;
        $this->grammarService->delete($grammarBank);

        if ($request->wantsJson()) {
            return response()->json(['message' => "Pola {$pattern} berhasil dihapus dari Bank Grammar."]);
        }

        return redirect()->back()->with('success', "Pola {$pattern} berhasil dihapus dari Bank Grammar.");
    }

    public function assignToDay(Request $request, GrammarBank $grammarBank): JsonResponse
    {
        $validated = $request->validate([
            'module_day_id' => ['required', 'exists:module_days,id'],
        ]);

        $day = HariModul::findOrFail($validated['module_day_id']);
        $this->kloterService->abortJikaModulDiLuarCakupan($request->user(), (int) $day->module_id);

        $quiz = $this->grammarService->assignToDay($grammarBank, $day);

        return response()->json([
            'message' => "Pola {$grammarBank->pattern} berhasil ditugaskan ke Hari {$day->day_number}.",
            'quiz_id' => $quiz->id,
        ]);
    }
}
