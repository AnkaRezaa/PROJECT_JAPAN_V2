<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\HariModul;
use App\Models\Kuis;
use App\Services\KloterBelajarService;
use App\Services\KuisDokkaiService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class AdminDokkaiController extends Controller
{
    public function __construct(
        private readonly KloterBelajarService $kloter,
        private readonly KuisDokkaiService $dokkaiService
    ) {}

    public function picker(Request $request): JsonResponse
    {
        $query = Kuis::query()
            ->where('type', 'dokkai')
            ->whereHas('dokkaiPassage')
            ->with([
                'dokkaiPassage.paragraphs',
                'dokkaiPassage.vocabularies',
                'dokkaiPassage.questions',
                'moduleDay.module.programPembelajaran',
            ]);

        if ($request->filled('level') && $request->string('level') !== 'all') {
            $level = (string) $request->string('level');
            $query->whereHas('dokkaiPassage', fn ($q) => $q->where('jlpt_level', $level));
        }

        if ($request->filled('search')) {
            $search = (string) $request->string('search');
            $query->whereHas('dokkaiPassage', fn ($q) => $q->where('title', 'like', "%{$search}%"));
        }

        $items = $query->latest('id')
            ->limit(30)
            ->get()
            ->map(fn (Kuis $quiz) => $this->dokkaiService->payload($quiz, true));

        return response()->json(['data' => $items]);
    }

    public function index(Request $request, HariModul $moduleDay): JsonResponse
    {
        $this->authorizeDay($request, $moduleDay);

        $quizzes = $moduleDay->quizzes()
            ->where('type', 'dokkai')
            ->with(['dokkaiPassage.paragraphs', 'dokkaiPassage.vocabularies', 'dokkaiPassage.questions'])
            ->get()
            ->map(fn (Kuis $quiz) => $this->dokkaiService->payload($quiz, true));

        return response()->json(['lessons' => $quizzes]);
    }

    public function show(Request $request, Kuis $quiz): JsonResponse
    {
        $this->authorizeQuiz($request, $quiz);

        return response()->json(['lesson' => $this->dokkaiService->payload($quiz, true)]);
    }

    public function store(Request $request, HariModul $moduleDay): JsonResponse
    {
        $this->authorizeDay($request, $moduleDay);
        $validated = $this->validatePayload($request);

        $quiz = DB::transaction(function () use ($moduleDay, $validated) {
            $quiz = Kuis::create([
                'module_id' => $moduleDay->module_id,
                'module_day_id' => $moduleDay->id,
                'type' => 'dokkai',
                'time_limit' => $validated['time_limit'] ?? 300,
                'passing_score' => $validated['passing_score'] ?? 70,
                'status' => 'draft',
            ]);

            return $this->dokkaiService->sync($quiz, $validated);
        });

        return response()->json([
            'message' => 'Draf Wacana Dokkai berhasil disimpan.',
            'lesson' => $this->dokkaiService->payload($quiz, true),
        ], 201);
    }

    public function update(Request $request, Kuis $quiz): JsonResponse
    {
        $this->authorizeQuiz($request, $quiz);
        $validated = $this->validatePayload($request);
        $quiz = $this->dokkaiService->sync($quiz, $validated);

        return response()->json([
            'message' => 'Draf Wacana Dokkai berhasil diperbarui.',
            'lesson' => $this->dokkaiService->payload($quiz, true),
        ]);
    }

    public function destroy(Request $request, Kuis $quiz): JsonResponse
    {
        $this->authorizeQuiz($request, $quiz);
        $quiz->delete();

        return response()->json(['message' => 'Wacana Dokkai berhasil dihapus.']);
    }

    public function updateStatus(Request $request, Kuis $quiz): JsonResponse
    {
        $this->authorizeQuiz($request, $quiz);
        $validated = $request->validate([
            'status' => ['required', Rule::in(['draft', 'published'])],
        ]);

        $quiz->update(['status' => $validated['status']]);

        return response()->json([
            'message' => $validated['status'] === 'published'
                ? 'Wacana Dokkai berhasil diterbitkan.'
                : 'Wacana Dokkai dikembalikan menjadi draf.',
            'status' => $quiz->status,
        ]);
    }

    private function validatePayload(Request $request): array
    {
        return $request->validate([
            'passing_score' => ['nullable', 'integer', 'min:0', 'max:100'],
            'time_limit' => ['nullable', 'integer', 'min:0'],
            'passage' => ['required', 'array'],
            'passage.title' => ['required', 'string', 'max:255'],
            'passage.sub_title' => ['nullable', 'string', 'max:500'],
            'passage.theme_category' => ['nullable', 'string', 'max:100'],
            'passage.jlpt_level' => ['nullable', 'string', 'max:10'],
            'passage.estimated_reading_time' => ['nullable', 'integer', 'min:1'],
            'passage.xp_reward' => ['nullable', 'integer', 'min:0'],
            'passage.audio_url' => ['nullable', 'string', 'max:500'],
            'paragraphs' => ['nullable', 'array'],
            'paragraphs.*.paragraph_number' => ['nullable', 'integer'],
            'paragraphs.*.label' => ['nullable', 'string', 'max:255'],
            'paragraphs.*.content_raw' => ['required', 'string'],
            'vocabularies' => ['nullable', 'array'],
            'vocabularies.*.word' => ['required', 'string', 'max:255'],
            'vocabularies.*.furigana' => ['required', 'string', 'max:255'],
            'vocabularies.*.romaji' => ['nullable', 'string', 'max:255'],
            'vocabularies.*.meaning' => ['required', 'string'],
            'vocabularies.*.pitch_accent' => ['nullable', 'string', 'max:100'],
            'vocabularies.*.part_of_speech' => ['nullable', 'string', 'max:100'],
            'vocabularies.*.jlpt_level' => ['nullable', 'string', 'max:10'],
            'vocabularies.*.example_sentence' => ['nullable', 'string'],
            'vocabularies.*.example_translation' => ['nullable', 'string'],
            'vocabularies.*.audio_url' => ['nullable', 'string', 'max:500'],
            'questions' => ['nullable', 'array'],
            'questions.*.question_number' => ['nullable', 'integer'],
            'questions.*.question_text' => ['required', 'string'],
            'questions.*.question_translation' => ['nullable', 'string'],
            'questions.*.evidence_paragraph_id' => ['nullable', 'integer'],
            'questions.*.evidence_paragraph_number' => ['nullable', 'integer'],
            'questions.*.evidence_quote' => ['nullable', 'string'],
            'questions.*.explanation_correct' => ['nullable', 'string'],
            'questions.*.explanation_distractors' => ['nullable', 'array'],
            'questions.*.options' => ['required', 'array', 'min:2'],
        ]);
    }

    private function authorizeDay(Request $request, HariModul $moduleDay): void
    {
        $this->kloter->abortJikaModulDiLuarCakupan($request->user(), (int) $moduleDay->module_id);
    }

    private function authorizeQuiz(Request $request, Kuis $quiz): void
    {
        abort_unless($quiz->isDokkai(), 404, 'Kuis Dokkai tidak ditemukan.');
        $this->kloter->abortJikaModulDiLuarCakupan($request->user(), (int) $quiz->module_id);
    }
}
