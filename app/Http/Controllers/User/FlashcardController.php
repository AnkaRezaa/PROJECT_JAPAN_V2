<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Models\Flashcard;
use App\Models\Kuis;
use App\Models\SetFlashcard;
use App\Services\AksesFlashcardPenggunaService;
use App\Services\RepetisiPembelajaranService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class FlashcardController extends Controller
{
    public function show(SetFlashcard $flashcardSet, AksesFlashcardPenggunaService $aksesFlashcard)
    {
        $user = Auth::user();
        $aksesFlashcard->abortJikaTerkunci($user, $flashcardSet);
        $flashcardSet->loadMissing([
            'module.programPembelajaran',
            'day.module.programPembelajaran',
        ]);

        $quiz = Kuis::query()
            ->whereKey($flashcardSet->day?->checkpoint_quiz_id)
            ->where('status', 'published')
            ->first();

        if (! $quiz) {
            $quiz = Kuis::query()
                ->where('module_day_id', $flashcardSet->module_day_id)
                ->where('status', 'published')
                ->orderBy('id')
                ->first();
        }

        if ($quiz) {
            return redirect()
                ->route('user.quizzes.show', $quiz)
                ->with('info', 'Flashcard sekarang dipelajari langsung di dalam kuis Day.');
        }

        $program = $flashcardSet->day?->module?->programPembelajaran
            ?? $flashcardSet->module?->programPembelajaran;

        return redirect()
            ->to($program ? route('user.modul.program', $program->slug) : route('user.kelas.index'))
            ->with('warning', 'Kuis Day untuk materi ini belum tersedia.');
    }

    public function review(
        Request $request,
        Flashcard $flashcard,
        RepetisiPembelajaranService $repetisi,
        AksesFlashcardPenggunaService $aksesFlashcard
    ) {
        $validated = $request->validate([
            'action' => ['required', 'in:known,learning'],
            'skill' => ['nullable', 'in:recognition,writing'],
        ]);

        $user = Auth::user();
        $aksesFlashcard->abortJikaKartuTerkunci($user, $flashcard);
        $repetisi->catatReviewFlashcard(
            $user,
            $flashcard,
            $validated['action'] === 'known',
            $validated['skill'] ?? 'recognition',
        );

        return redirect()->back()->with('success', 'Progres repetisi disimpan.');
    }
}
