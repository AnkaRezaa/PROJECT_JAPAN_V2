<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Models\HariModul;
use App\Models\ReviewFlashcard;
use App\Models\SetFlashcard;
use App\Services\AksesFlashcardPenggunaService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class MojiGoiController extends Controller
{
    public function show(
        Request $request,
        HariModul $moduleDay,
        string $focus,
        AksesFlashcardPenggunaService $aksesFlashcard
    ) {
        abort_unless(in_array($focus, ['kanji', 'kotoba'], true), 404);
        abort_unless($moduleDay->status === 'published', 404);

        $user = Auth::user();
        $moduleDay->loadMissing(['module.programPembelajaran', 'checkpointQuiz.questions']);

        $mappedQuizFocus = $focus === 'kanji' ? 'kanji' : 'kosakata';
        $checkpointQuiz = $moduleDay->checkpointQuiz && $moduleDay->checkpointQuiz->status === 'published'
            ? $moduleDay->checkpointQuiz
            : null;
        $focusedQuizQuestions = $checkpointQuiz
            ? \App\Services\PembelajaranPenggunaService::filterQuestionsByFocus(
                $checkpointQuiz->questions->where('type', '!=', 'handwriting')->values(),
                $mappedQuizFocus,
                true
            )
            : collect();
        $quizQuestionCount = $focusedQuizQuestions->count();
        $quizUrl = $checkpointQuiz && $quizQuestionCount > 0
            ? route('user.quizzes.show', [
                'quiz' => $checkpointQuiz->id,
                'focus' => $mappedQuizFocus,
                'standalone' => 1,
            ])
            : null;

        $sets = SetFlashcard::query()
            ->with(['flashcards.vocabulary'])
            ->where('module_day_id', $moduleDay->id)
            ->where('status', 'published')
            ->orderBy('id')
            ->get();

        if ($sets->isNotEmpty()) {
            $aksesFlashcard->abortJikaTerkunci($user, $sets->first());
        }

        $cards = $sets
            ->flatMap(fn (SetFlashcard $set) => $set->flashcards)
            ->unique('id')
            ->filter(function ($card) use ($focus) {
                $contentType = $card->vocabulary?->content_type;

                return $focus === 'kanji'
                    ? $contentType === 'kanji'
                    : $contentType !== 'kanji';
            })
            ->values();

        $reviews = ReviewFlashcard::query()
            ->where('user_id', $user->id)
            ->where('skill', 'recognition')
            ->whereIn('flashcard_id', $cards->pluck('id'))
            ->get()
            ->keyBy('flashcard_id');

        $payloadCards = $cards->map(function ($card) use ($reviews) {
            $review = $reviews->get($card->id);
            $vocabulary = $card->vocabulary;
            $metadata = is_array($vocabulary?->metadata) ? $vocabulary->metadata : [];

            return [
                'id' => $card->id,
                'front_text' => $card->front_text,
                'reading' => $card->reading,
                'audio_reading_override' => $metadata['audio_reading_override'] ?? null,
                'back_text' => $card->back_text,
                'hint' => $card->hint,
                'example_sentence' => $card->example_sentence,
                'example_reading' => $vocabulary?->example_reading,
                'example_meaning' => $card->example_meaning,
                'audio_url' => $card->audio_url,
                'content_type' => $vocabulary?->content_type ?? 'kosakata',
                'meaning_en' => $vocabulary?->meaning_en,
                'onyomi' => $metadata['onyomi'] ?? null,
                'kunyomi' => $metadata['kunyomi'] ?? null,
                'radicals' => array_values(array_filter((array) ($metadata['radicals'] ?? []))),
                'stroke_count' => isset($metadata['stroke_count']) ? (int) $metadata['stroke_count'] : null,
                'notes' => $metadata['notes'] ?? null,
                'review_status' => $review?->status ?? 'new',
                'is_known' => in_array($review?->status, ['review', 'known'], true),
            ];
        })->values();

        $program = $moduleDay->module?->programPembelajaran;
        $roadmapUrl = $program
            ? route('user.modul.program', $program->slug)
            : route('user.kelas.index');

        return Inertia::render('User/Modul/SesiMojiGoi', [
            'focus' => $focus,
            'day' => [
                'id' => $moduleDay->id,
                'day_number' => $moduleDay->day_number,
                'title' => $moduleDay->title,
                'description' => $moduleDay->description,
                'kotoba_intro_title' => $moduleDay->kotoba_intro_title,
                'kotoba_intro_body' => $moduleDay->kotoba_intro_body,
                'handwriting_enabled' => $moduleDay->handwriting_enabled ?? true,
                'module_title' => $moduleDay->module?->title,
                'week_number' => $moduleDay->module?->week_number,
            ],
            'cards' => $payloadCards,
            'quiz_url' => $quizUrl,
            'quiz_question_count' => $quizQuestionCount,
            'back_url' => $roadmapUrl,
        ]);
    }
}
