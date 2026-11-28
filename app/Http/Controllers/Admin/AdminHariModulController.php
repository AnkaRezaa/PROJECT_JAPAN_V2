<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\HariModul;
use App\Models\Kosakata;
use App\Models\Kuis;
use App\Models\Modul;
use App\Models\SetFlashcard;
use App\Services\KloterBelajarService;
use App\Services\QuizGenerator\QuizGeneratorDraft;
use App\Services\SoalKuisService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AdminHariModulController extends Controller
{
    public function __construct(private readonly KloterBelajarService $kloterService) {}

    public function store(Request $request, Modul $module)
    {
        $this->kloterService->abortJikaModulDiLuarCakupan($request->user(), (int) $module->id);
        $validated = $this->validateDay($request, $module);
        $validated['module_id'] = $module->id;

        DB::transaction(function () use ($module, $validated) {
            $day = $module->days()->create($validated);

            $day->flashcardSets()->create([
                'level_id' => $module->level_id,
                'module_id' => $module->id,
                'title' => $day->title,
                'description' => $day->description,
                'source_type' => 'day',
                'status' => 'draft',
            ]);

            $checkpoint = $day->quizzes()->create([
                'module_id' => $module->id,
                'type' => 'multiple_choice',
                'time_limit' => null,
                'passing_score' => 70,
                'status' => 'draft',
            ]);

            $day->update(['checkpoint_quiz_id' => $checkpoint->id]);
        });

        return redirect()->back()->with('success', 'Day, flashcard, dan kuis checkpoint berhasil disiapkan.');
    }

    public function update(Request $request, HariModul $moduleDay)
    {
        $this->kloterService->abortJikaModulDiLuarCakupan($request->user(), (int) $moduleDay->module_id);
        $validated = $this->validateDay($request, $moduleDay->module, $moduleDay);

        DB::transaction(function () use ($moduleDay, $validated) {
            $moduleDay->update($validated);
            $moduleDay->flashcardSets()
                ->where('source_type', 'day')
                ->update([
                    'title' => $moduleDay->title,
                    'description' => $moduleDay->description,
                ]);
        });

        return redirect()->back()->with('success', 'Day berhasil diperbarui.');
    }

    public function destroy(Request $request, HariModul $moduleDay)
    {
        $this->kloterService->abortJikaModulDiLuarCakupan($request->user(), (int) $moduleDay->module_id);

        $hasRealFlashcards = $moduleDay->flashcardSets()->whereHas('flashcards')->exists();
        $hasRealQuizzes = $moduleDay->quizzes()->where(fn ($q) => $q->whereHas('questions')->orWhereHas('attempts'))->exists();
        $hasPresentations = $moduleDay->presentationDecks()->exists();
        $hasVocabulary = $moduleDay->vocabulary()->exists();

        if ($hasRealFlashcards || $hasRealQuizzes || $hasPresentations || $hasVocabulary) {
            return redirect()->back()->with('error', 'Day tidak dapat dihapus karena masih mempunyai materi (kartu, soal kuis, atau presentasi).');
        }

        try {
            DB::transaction(function () use ($moduleDay) {
                $moduleDay->update(['checkpoint_quiz_id' => null]);
                $moduleDay->flashcardSets()->delete();
                $moduleDay->quizzes()->delete();
                $moduleDay->delete();
            });

            return redirect()->back()->with('success', 'Day berhasil dihapus.');
        } catch (\Throwable $e) {
            return redirect()->back()->with('error', 'Gagal menghapus Day: ' . $e->getMessage());
        }
    }

    public function syncVocabulary(Request $request, HariModul $moduleDay)
    {
        $this->kloterService->abortJikaModulDiLuarCakupan($request->user(), (int) $moduleDay->module_id);
        $validated = $request->validate([
            'vocabulary_ids' => ['present', 'array'],
            'vocabulary_ids.*' => ['integer', 'exists:vocabulary_bank,id'],
        ]);

        $sync = collect($validated['vocabulary_ids'])
            ->unique()
            ->values()
            ->mapWithKeys(fn ($id, $index) => [(int) $id => ['sort_order' => $index]])
            ->all();

        DB::transaction(fn () => $moduleDay->vocabulary()->sync($sync));

        return redirect()->back()->with('success', 'Konten untuk Day berhasil diperbarui.');
    }

    public function applyGeneratedContent(Request $request, HariModul $moduleDay, SoalKuisService $soalKuisService)
    {
        $moduleDay->loadMissing('module');
        $module = $moduleDay->module;
        abort_unless($module, 404);
        $this->kloterService->abortJikaModulDiLuarCakupan($request->user(), (int) $module->id);

        $validated = $request->validate([
            'quiz_id' => [
                'nullable',
                'integer',
                Rule::exists('quizzes', 'id')->where(
                    fn ($query) => $query
                        ->where('module_id', $module->id)
                        ->where('module_day_id', $moduleDay->id)
                        ->whereNotIn('type', ['grammar', 'dokkai'])
                ),
            ],
            'flashcard_set_id' => [
                'nullable',
                'integer',
                Rule::exists('flashcard_sets', 'id')->where(
                    fn ($query) => $query
                        ->where('module_id', $module->id)
                        ->where('module_day_id', $moduleDay->id)
                ),
            ],
            'sync_flashcards' => ['sometimes', 'boolean'],
            'draft' => ['required', 'array'],
            'draft.type' => ['required', 'in:vocab'],
            'draft.questions' => ['required', 'array', 'min:1', 'max:50'],
            'draft.questions.*.id' => ['nullable', 'string', 'max:100'],
            'draft.questions.*.stage' => ['nullable', 'string', 'max:50'],
            'draft.questions.*.generation_mode' => ['nullable', 'in:word_to_meaning,meaning_to_word,reading_to_word,word_to_reading'],
            'draft.questions.*.prompt' => ['required', 'string', 'max:5000'],
            'draft.questions.*.reading' => ['nullable', 'string', 'max:5000'],
            'draft.questions.*.highlight_text' => ['nullable', 'string', 'max:500'],
            'draft.questions.*.show_question_reading' => ['sometimes', 'boolean'],
            'draft.questions.*.choices' => ['required', 'array', 'min:2', 'max:8'],
            'draft.questions.*.choices.*.id' => ['required', 'string', 'max:100'],
            'draft.questions.*.choices.*.text' => ['required', 'string', 'max:1000'],
            'draft.questions.*.choices.*.reading' => ['nullable', 'string', 'max:1000'],
            'draft.questions.*.answer' => ['required', 'array'],
            'draft.questions.*.answer.choice_id' => ['required', 'string', 'max:100'],
            'draft.questions.*.explanation' => ['nullable', 'string', 'max:5000'],
            'draft.questions.*.explanation_reading' => ['nullable', 'string', 'max:5000'],
            'draft.questions.*.audio_url' => ['nullable', 'string', 'max:2048'],
            'draft.questions.*.source' => ['required', 'array'],
            'draft.questions.*.source.type' => ['required', 'in:vocabulary'],
            'draft.questions.*.source.id' => [
                'required',
                'integer',
                Rule::exists('vocabulary_bank', 'id')->where(
                    fn ($query) => $query
                        ->whereNull('module_id')
                        ->orWhere('module_id', $module->id)
                ),
            ],
            'draft.questions.*.source.mode' => ['nullable', 'in:word_to_meaning,meaning_to_word,reading_to_word,word_to_reading'],
        ]);

        foreach ($validated['draft']['questions'] as $index => $q) {
            $mode = $q['generation_mode'] ?? $q['source']['mode'] ?? null;
            if (! $mode) {
                throw ValidationException::withMessages([
                    "draft.questions.{$index}.generation_mode" => 'Metadata generation_mode wajib diisi untuk setiap soal hasil generate.',
                ]);
            }
            $choiceIds = array_column($q['choices'], 'id');
            if (! in_array($q['answer']['choice_id'], $choiceIds, true)) {
                throw ValidationException::withMessages([
                    "draft.questions.{$index}.answer.choice_id" => 'Kunci jawaban tidak cocok dengan daftar pilihan.',
                ]);
            }
        }

        $questionsPayload = QuizGeneratorDraft::vocabularyQuestions($validated['draft']);
        $syncFlashcards = (bool) ($validated['sync_flashcards'] ?? true);
        $sourceIds = collect($validated['draft']['questions'])
            ->map(fn (array $q) => (int) $q['source']['id'])
            ->unique()
            ->values();

        $vocabularies = Kosakata::query()
            ->whereIn('id', $sourceIds)
            ->get()
            ->keyBy('id');

        $addedQuestions = 0;
        $addedCards = 0;
        $quizId = null;
        $flashcardSetId = null;

        DB::transaction(function () use (
            $module,
            $moduleDay,
            $validated,
            $questionsPayload,
            $syncFlashcards,
            $sourceIds,
            $vocabularies,
            $soalKuisService,
            &$addedQuestions,
            &$addedCards,
            &$quizId,
            &$flashcardSetId
        ) {
            $lockedDay = HariModul::whereKey($moduleDay->id)->lockForUpdate()->firstOrFail();

            $quiz = null;
            if (! empty($validated['quiz_id'])) {
                $quiz = Kuis::whereKey((int) $validated['quiz_id'])
                    ->where('module_id', $module->id)
                    ->where('module_day_id', $lockedDay->id)
                    ->firstOrFail();
            } else {
                $quiz = $lockedDay->quizzes()
                    ->whereNotIn('type', ['grammar', 'dokkai'])
                    ->orderByRaw('CASE WHEN id = ? THEN 0 ELSE 1 END', [(int) $lockedDay->checkpoint_quiz_id])
                    ->orderBy('id')
                    ->first();
            }

            if (! $quiz) {
                $quiz = $lockedDay->quizzes()->create([
                    'module_id' => $module->id,
                    'type' => 'multiple_choice',
                    'time_limit' => null,
                    'passing_score' => 70,
                    'status' => 'draft',
                ]);

                if (! $lockedDay->checkpoint_quiz_id) {
                    $lockedDay->update(['checkpoint_quiz_id' => $quiz->id]);
                }
            }

            $quizId = $quiz->id;
            $addedQuestions = $soalKuisService->storeGeneratedQuestions($quiz, $questionsPayload);

            if ($syncFlashcards) {
                $flashcardSet = null;
                if (! empty($validated['flashcard_set_id'])) {
                    $flashcardSet = SetFlashcard::whereKey((int) $validated['flashcard_set_id'])
                        ->where('module_id', $module->id)
                        ->where('module_day_id', $lockedDay->id)
                        ->firstOrFail();
                } else {
                    $flashcardSet = $lockedDay->flashcardSets()
                        ->orderBy('id')
                        ->first();
                }

                if (! $flashcardSet) {
                    $flashcardSet = $lockedDay->flashcardSets()->create([
                        'level_id' => $module->level_id,
                        'module_id' => $module->id,
                        'title' => $lockedDay->title,
                        'description' => $lockedDay->description,
                        'source_type' => 'day',
                        'status' => 'draft',
                    ]);
                }

                $flashcardSetId = $flashcardSet->id;
                SetFlashcard::whereKey($flashcardSet->id)->lockForUpdate()->firstOrFail();
                $nextCardOrder = (int) $flashcardSet->flashcards()->max('order') + 1;

                foreach ($sourceIds as $vocabId) {
                    $vocab = $vocabularies->get($vocabId);
                    if (! $vocab) {
                        continue;
                    }

                    $exists = $flashcardSet->flashcards()
                        ->where('vocabulary_id', $vocab->id)
                        ->exists();

                    if ($exists) {
                        continue;
                    }

                    $flashcardSet->flashcards()->create([
                        'vocabulary_id' => $vocab->id,
                        'front_text' => $vocab->word,
                        'reading' => $vocab->reading,
                        'back_text' => $vocab->meaning_id ?: $vocab->meaning_en,
                        'hint' => $vocab->category,
                        'example_sentence' => $vocab->example_sentence,
                        'example_meaning' => $vocab->example_meaning,
                        'audio_url' => $vocab->audio_url,
                        'order' => $nextCardOrder + $addedCards,
                    ]);

                    $addedCards++;
                }
            }

            $existingPivotMax = (int) DB::table('module_day_vocabulary')
                ->where('module_day_id', $lockedDay->id)
                ->max('sort_order');

            $pivotOffset = 1;
            foreach ($sourceIds as $vocabId) {
                $alreadyLinked = DB::table('module_day_vocabulary')
                    ->where('module_day_id', $lockedDay->id)
                    ->where('vocabulary_id', $vocabId)
                    ->exists();

                if (! $alreadyLinked) {
                    $lockedDay->vocabulary()->attach($vocabId, [
                        'sort_order' => $existingPivotMax + $pivotOffset,
                    ]);
                    $pivotOffset++;
                }
            }
        });

        $message = ($addedQuestions === 0 && $addedCards === 0)
            ? '0 ditambahkan, semuanya sudah tersedia.'
            : "{$addedQuestions} soal kuis" . ($syncFlashcards ? " dan {$addedCards} kartu flashcard" : '') . ' berhasil ditambahkan dari Bank Konten.';

        if ($request->wantsJson()) {
            return response()->json([
                'message' => $message,
                'added_questions' => $addedQuestions,
                'added_flashcards' => $addedCards,
                'quiz_id' => $quizId,
                'flashcard_set_id' => $flashcardSetId,
            ]);
        }

        return redirect()->back()->with('success', $message);
    }

    private function validateDay(Request $request, Modul $module, ?HariModul $day = null): array
    {
        $validated = $request->validate([
            'day_number' => [
                'required',
                'integer',
                'min:1',
                Rule::unique('module_days', 'day_number')
                    ->where('module_id', $module->id)
                    ->ignore($day?->id),
            ],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            'kotoba_intro_title' => ['nullable', 'string', 'max:255'],
            'kotoba_intro_body' => ['nullable', 'string', 'max:5000'],
            'handwriting_enabled' => ['sometimes', 'boolean'],
            'handwriting_mode' => ['sometimes', Rule::in(['guided_then_blank', 'guided_only', 'blank_only'])],
            'exam_id' => ['sometimes', 'nullable', 'integer', Rule::exists('exams', 'id')],
            'status' => ['required', 'in:draft,published'],
            'checkpoint_quiz_id' => [
                'nullable',
                'integer',
                Rule::exists('quizzes', 'id')->where('module_id', $module->id),
            ],
        ]);

        if (
            filled($validated['checkpoint_quiz_id'] ?? null)
            && ! Kuis::whereKey($validated['checkpoint_quiz_id'])
                ->where('module_day_id', $day?->id)
                ->exists()
        ) {
            abort(422, 'Kuis checkpoint harus berasal dari Day yang sama.');
        }

        if (isset($validated['exam_id']) && (! $day || (int) $day->exam_id !== (int) $validated['exam_id'])) {
            $allowed = app(\App\Services\ExamAccessService::class)
                ->selectableExamsQuery($request->user(), (int) $module->program_pembelajaran_id)
                ->whereKey($validated['exam_id'])->exists();
            if (! $allowed) {
                throw \Illuminate\Validation\ValidationException::withMessages([
                    'exam_id' => 'Ujian tidak tersedia atau berada di luar cakupan kelas ini.',
                ]);
            }
        }

        return $validated;
    }
}
