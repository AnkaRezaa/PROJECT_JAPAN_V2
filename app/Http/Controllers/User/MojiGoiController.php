<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Models\HariModul;
use App\Models\Pengguna;
use App\Models\ReviewFlashcard;
use App\Models\SetFlashcard;
use App\Services\AksesFlashcardPenggunaService;
use App\Services\PembelajaranPenggunaService;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
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

        $sets = SetFlashcard::query()
            ->with(['flashcards.vocabulary'])
            ->where('module_day_id', $moduleDay->id)
            ->where('status', 'published')
            ->orderBy('id')
            ->get();

        if ($sets->isNotEmpty()) {
            $aksesFlashcard->abortJikaTerkunci($user, $sets->first());
        }

        $allCards = $sets->flatMap(fn (SetFlashcard $set) => $set->flashcards)->unique('id')->values();
        $program = $moduleDay->module?->programPembelajaran;
        $roadmapUrl = $program
            ? route('user.modul.program', $program->slug)
            : route('user.kelas.index');

        $payload = $focus === 'kanji'
            ? $this->kanjiSessionPayload($user, $moduleDay, $allCards, $roadmapUrl)
            : $this->kotobaSessionPayload($user, $moduleDay, $allCards, $roadmapUrl);

        return Inertia::render('User/Modul/SesiMojiGoi', $payload);
    }

    private function kanjiSessionPayload(
        Pengguna $user,
        HariModul $moduleDay,
        Collection $allCards,
        string $roadmapUrl
    ): array {
        $cards = $allCards
            ->filter(fn ($card) => $card->vocabulary?->content_type === 'kanji')
            ->values();
        $reviews = $this->recognitionReviewsFor($user, $cards);
        [$quizUrl, $quizCount] = $this->focusedQuizHandoff($moduleDay, 'kanji');

        return [
            'focus' => 'kanji',
            'day' => [
                'id' => $moduleDay->id,
                'day_number' => $moduleDay->day_number,
                'title' => $moduleDay->title,
                'description' => $moduleDay->description,
                'handwriting_enabled' => $moduleDay->handwriting_enabled ?? true,
                'handwriting_mode' => $moduleDay->handwriting_mode ?: 'guided_then_blank',
                'module_title' => $moduleDay->module?->title,
                'week_number' => $moduleDay->module?->week_number,
            ],
            'cards' => $cards->map(function ($card) use ($reviews) {
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
                    'content_type' => 'kanji',
                    'onyomi' => $metadata['onyomi'] ?? null,
                    'kunyomi' => $metadata['kunyomi'] ?? null,
                    'radicals' => array_values(array_filter((array) ($metadata['radicals'] ?? []))),
                    'stroke_count' => isset($metadata['stroke_count']) ? (int) $metadata['stroke_count'] : null,
                    'notes' => $metadata['notes'] ?? null,
                    'review_status' => $review?->status ?? 'new',
                    'is_known' => (bool) $review?->isCompleted(),
                ];
            })->values(),
            'quiz_url' => $quizUrl,
            'quiz_question_count' => $quizCount,
            'back_url' => $roadmapUrl,
        ];
    }

    private function kotobaSessionPayload(
        Pengguna $user,
        HariModul $moduleDay,
        Collection $allCards,
        string $roadmapUrl
    ): array {
        $cards = $allCards
            ->filter(fn ($card) => $card->vocabulary?->content_type !== 'kanji')
            ->values();
        $reviews = $this->recognitionReviewsFor($user, $cards);
        [$quizUrl, $quizCount] = $this->focusedQuizHandoff($moduleDay, 'kosakata');

        return [
            'focus' => 'kotoba',
            'day' => [
                'id' => $moduleDay->id,
                'day_number' => $moduleDay->day_number,
                'title' => $moduleDay->title,
                'description' => $moduleDay->description,
                'kotoba_intro_title' => $moduleDay->kotoba_intro_title,
                'kotoba_intro_body' => $moduleDay->kotoba_intro_body,
                'handwriting_enabled' => false,
                'module_title' => $moduleDay->module?->title,
                'week_number' => $moduleDay->module?->week_number,
            ],
            'cards' => $cards->map(function ($card) use ($reviews) {
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
                    'notes' => $metadata['notes'] ?? null,
                    'review_status' => $review?->status ?? 'new',
                    'is_known' => (bool) $review?->isCompleted(),
                ];
            })->values(),
            'quiz_url' => $quizUrl,
            'quiz_question_count' => $quizCount,
            'back_url' => $roadmapUrl,
        ];
    }

    private function recognitionReviewsFor(Pengguna $user, Collection $cards): Collection
    {
        if ($cards->isEmpty()) {
            return collect();
        }

        return ReviewFlashcard::query()
            ->where('user_id', $user->id)
            ->where('skill', 'recognition')
            ->whereIn('flashcard_id', $cards->pluck('id'))
            ->get()
            ->keyBy('flashcard_id');
    }

    private function focusedQuizHandoff(HariModul $moduleDay, string $mappedQuizFocus): array
    {
        $checkpointQuiz = $moduleDay->checkpointQuiz && $moduleDay->checkpointQuiz->status === 'published'
            ? $moduleDay->checkpointQuiz
            : null;

        if (! $checkpointQuiz) {
            return [null, 0];
        }

        $count = PembelajaranPenggunaService::filterQuestionsByFocus(
            $checkpointQuiz->questions->where('type', '!=', 'handwriting')->values(),
            $mappedQuizFocus,
            true
        )->count();

        if ($count <= 0) {
            return [null, 0];
        }

        return [
            route('user.quizzes.show', [
                'quiz' => $checkpointQuiz->id,
                'focus' => $mappedQuizFocus,
                'standalone' => 1,
            ]),
            $count,
        ];
    }
}
