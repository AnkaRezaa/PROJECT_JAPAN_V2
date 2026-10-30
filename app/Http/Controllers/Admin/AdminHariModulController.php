<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\HariModul;
use App\Models\Kuis;
use App\Models\Modul;
use App\Services\KloterBelajarService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

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

        return $validated;
    }
}
