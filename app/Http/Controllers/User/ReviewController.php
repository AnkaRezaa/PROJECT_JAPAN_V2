<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Models\EventReview;
use App\Models\Flashcard;
use App\Models\SesiReview;
use App\Models\Soal;
use App\Services\AntreanReviewService;
use App\Services\SesiReviewService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ReviewController extends Controller
{
    public function index(Request $request, AntreanReviewService $queue, SesiReviewService $sessions): Response
    {
        $user = $request->user();
        $history = SesiReview::query()
            ->where('user_id', $user->id)
            ->where('mode', 'review')
            ->where('started_at', '>=', now()->subDays(30))
            ->latest('started_at')
            ->paginate(8)
            ->withQueryString()
            ->through(fn (SesiReview $session) => [
                'id' => $session->uuid,
                'target_count' => $session->target_count,
                'correct_count' => $session->correct_count,
                'wrong_count' => $session->wrong_count,
                'skipped_count' => $session->skipped_count,
                'completed' => $session->completed_at !== null,
                'started_at' => $session->started_at?->locale('id')->translatedFormat('d M Y, H:i'),
            ]);
        $active = $sessions->active($user);
        $events = EventReview::query()
            ->where('user_id', $user->id)
            ->whereNull('undone_at')
            ->where('occurred_at', '>=', now()->subDays(30))
            ->latest('occurred_at')
            ->limit(12)
            ->get();
        $questions = Soal::query()
            ->whereIn('id', $events->where('source_type', 'question')->pluck('source_id'))
            ->pluck('question_text', 'id');
        $flashcards = Flashcard::query()
            ->whereIn('id', $events->where('source_type', 'flashcard')->pluck('source_id'))
            ->pluck('front_text', 'id');

        return Inertia::render('User/Review/Index', [
            'reviewSummary' => $queue->summary($user),
            'reviewHistory' => $history,
            'activeSession' => $active ? [
                'id' => $active['id'],
                'remaining_count' => max(0, $active['target_count'] - $active['resolved_count']),
                'resume_url' => route('user.review.show', $active['id']),
            ] : null,
            'recentEvents' => $events->map(fn (EventReview $event) => [
                'id' => $event->id,
                'result' => $event->result,
                'label' => $event->source_type === 'question'
                    ? ($questions[$event->source_id] ?? 'Soal tidak lagi tersedia')
                    : ($flashcards[$event->source_id] ?? 'Flashcard tidak lagi tersedia'),
                'skill_label' => match ($event->skill) {
                    'writing' => 'Menulis kanji',
                    'recognition' => 'Mengenali kosakata',
                    default => 'Kuis',
                },
                'occurred_at' => $event->occurred_at?->locale('id')->diffForHumans(),
            ])->values(),
            'startUrl' => route('user.review.start'),
        ]);
    }

    public function summary(Request $request, AntreanReviewService $queue): JsonResponse
    {
        return response()->json(['required_count' => $queue->badgeCount($request->user())]);
    }

    public function start(Request $request, SesiReviewService $sessions): RedirectResponse
    {
        $state = $sessions->start($request->user());

        if (! $state) {
            return redirect()->route('user.review.index')
                ->with('info', 'Belum ada materi yang dapat direview saat ini.');
        }

        return redirect()->route('user.review.show', $state['id']);
    }

    public function show(Request $request, string $session, SesiReviewService $sessions): Response|RedirectResponse
    {
        $state = $sessions->find($request->user(), $session);

        if (! $state) {
            return redirect()->route('user.review.index')
                ->with('info', 'Sesi Review sudah berakhir. Mulai sesi baru dari halaman Review.');
        }

        $payload = $sessions->payload($request->user(), $state);

        if (! $payload['completed'] && ! $payload['current_item']) {
            $state = $sessions->start($request->user(), true);

            if (! $state) {
                return redirect()->route('user.review.index')
                    ->with('info', 'Materi sesi ini tidak lagi tersedia.');
            }

            return redirect()->route('user.review.show', $state['id']);
        }

        return Inertia::render('User/Review/Session', [
            'reviewSession' => $payload,
            'backUrl' => route('user.review.index'),
            'answerUrl' => route('user.review.answer', $state['id']),
            'skipUrl' => route('user.review.skip', $state['id']),
            'undoUrl' => route('user.review.undo', $state['id']),
            'resetUrl' => route('user.review.reset'),
            'feedbackUrl' => route('product-feedback.store'),
        ]);
    }

    public function answer(Request $request, string $session, SesiReviewService $sessions): JsonResponse
    {
        $validated = $request->validate([
            'item_token' => ['required', 'uuid'],
            'answer' => ['nullable', 'string', 'max:2000'],
            'answer_payload' => ['nullable', 'array'],
            'answer_payload.completed_strokes' => ['nullable', 'integer', 'min:0', 'max:100'],
            'answer_payload.total_strokes' => ['nullable', 'integer', 'min:0', 'max:100'],
            'answer_payload.attempts_by_stroke' => ['nullable', 'array', 'max:100'],
            'answer_payload.mistakes' => ['nullable', 'integer', 'min:0', 'max:10000'],
            'answer_payload.hints_used' => ['nullable', 'integer', 'min:0', 'max:10000'],
            'answer_payload.duration_ms' => ['nullable', 'integer', 'min:0', 'max:86400000'],
            'answer_payload.revealed' => ['nullable', 'boolean'],
        ]);

        return response()->json($sessions->answer($request->user(), $session, $validated));
    }

    public function skip(Request $request, string $session, SesiReviewService $sessions): JsonResponse
    {
        $validated = $request->validate(['item_token' => ['required', 'uuid']]);

        return response()->json($sessions->skip($request->user(), $session, $validated['item_token']));
    }

    public function undo(Request $request, string $session, SesiReviewService $sessions): JsonResponse
    {
        return response()->json($sessions->undo($request->user(), $session));
    }

    public function reset(Request $request, SesiReviewService $sessions): RedirectResponse
    {
        $state = $sessions->start($request->user(), true);

        if (! $state) {
            return redirect()->route('user.review.index')
                ->with('info', 'Belum ada materi yang dapat direview saat ini.');
        }

        return redirect()->route('user.review.show', $state['id']);
    }
}
