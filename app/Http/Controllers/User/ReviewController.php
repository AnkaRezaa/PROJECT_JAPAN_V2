<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Models\EventReview;
use App\Models\Flashcard;
use App\Models\ProgramPembelajaran;
use App\Models\Soal;
use App\Services\RepetisiPembelajaranService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ReviewController extends Controller
{
    private const ACTIVITY_LABELS = [
        'multiple_choice' => 'Pilihan ganda',
        'listening' => 'Audio',
        'typing' => 'Menulis jawaban',
        'fill_blank' => 'Isi jawaban',
        'flashcard' => 'Flashcard',
        'kanji_writing' => 'Kanji handwriting',
        'transformation' => 'Transformation',
        'sentence_builder' => 'Sentence builder',
        'context_choice' => 'Context choice',
    ];

    private const STATE_LABELS = [
        'new' => 'Baru',
        'learning' => 'Dipelajari',
        'review' => 'Review',
        'mastered' => 'Dikuasai',
    ];

    public function index(Request $request, RepetisiPembelajaranService $repetition): Response
    {
        $validated = $request->validate([
            'range' => ['nullable', Rule::in(['7', '30', 7, 30])],
            'activity' => ['nullable', Rule::in(array_keys(self::ACTIVITY_LABELS))],
            'state' => ['nullable', Rule::in(array_keys(self::STATE_LABELS))],
            'result' => ['nullable', Rule::in(['correct', 'wrong', 'skipped'])],
            'program' => ['nullable', 'integer', Rule::exists('program_pembelajaran', 'id')],
        ]);

        $user = $request->user();
        $days = (int) ($validated['range'] ?? 30);
        $programId = isset($validated['program']) ? (int) $validated['program'] : null;
        $historyScope = EventReview::query()
            ->where('review_events.user_id', $user->id)
            ->where('review_events.occurred_at', '>=', now()->subDays($days));
        $questionProgramIds = (clone $historyScope)
            ->where('review_events.source_type', 'question')
            ->join('questions', 'questions.id', '=', 'review_events.source_id')
            ->join('quizzes', 'quizzes.id', '=', 'questions.quiz_id')
            ->join('modules', 'modules.id', '=', 'quizzes.module_id')
            ->whereNotNull('modules.program_pembelajaran_id')
            ->distinct()
            ->pluck('modules.program_pembelajaran_id');
        $flashcardProgramIds = (clone $historyScope)
            ->where('review_events.source_type', 'flashcard')
            ->join('flashcards', 'flashcards.id', '=', 'review_events.source_id')
            ->join('flashcard_sets', 'flashcard_sets.id', '=', 'flashcards.flashcard_set_id')
            ->join('modules', 'modules.id', '=', 'flashcard_sets.module_id')
            ->whereNotNull('modules.program_pembelajaran_id')
            ->distinct()
            ->pluck('modules.program_pembelajaran_id');
        $programOptions = ProgramPembelajaran::query()
            ->whereIn('id', $questionProgramIds->merge($flashcardProgramIds)->unique())
            ->orderBy('title')
            ->get(['id', 'title'])
            ->map(fn (ProgramPembelajaran $program) => [
                'value' => (string) $program->id,
                'label' => $program->title,
            ]);

        $events = EventReview::query()
            ->where('user_id', $user->id)
            ->where('occurred_at', '>=', now()->subDays($days))
            ->when($programId, function ($query, int $selectedProgramId) {
                $query->where(function ($sourceQuery) use ($selectedProgramId) {
                    $sourceQuery
                        ->where(function ($questionQuery) use ($selectedProgramId) {
                            $questionQuery->where('source_type', 'question')
                                ->whereExists(function ($exists) use ($selectedProgramId) {
                                    $exists->selectRaw('1')
                                        ->from('questions')
                                        ->join('quizzes', 'quizzes.id', '=', 'questions.quiz_id')
                                        ->join('modules', 'modules.id', '=', 'quizzes.module_id')
                                        ->whereColumn('questions.id', 'review_events.source_id')
                                        ->where('modules.program_pembelajaran_id', $selectedProgramId);
                                });
                        })
                        ->orWhere(function ($flashcardQuery) use ($selectedProgramId) {
                            $flashcardQuery->where('source_type', 'flashcard')
                                ->whereExists(function ($exists) use ($selectedProgramId) {
                                    $exists->selectRaw('1')
                                        ->from('flashcards')
                                        ->join('flashcard_sets', 'flashcard_sets.id', '=', 'flashcards.flashcard_set_id')
                                        ->join('modules', 'modules.id', '=', 'flashcard_sets.module_id')
                                        ->whereColumn('flashcards.id', 'review_events.source_id')
                                        ->where('modules.program_pembelajaran_id', $selectedProgramId);
                                });
                        });
                });
            })
            ->when($validated['activity'] ?? null, fn ($query, $activity) => $query->where('activity_type', $activity))
            ->when($validated['state'] ?? null, fn ($query, $state) => $query->where('learning_state', $state))
            ->when($validated['result'] ?? null, fn ($query, $result) => $query->where('result', $result))
            ->latest('occurred_at')
            ->latest('id')
            ->paginate(20)
            ->withQueryString();
        $eventCollection = $events->getCollection();
        $questions = Soal::query()
            ->with('quiz.module.programPembelajaran')
            ->whereIn('id', $eventCollection->where('source_type', 'question')->pluck('source_id'))
            ->get(['id', 'quiz_id', 'question_text', 'question_reading'])
            ->keyBy('id');
        $flashcards = Flashcard::query()
            ->with('set.module.programPembelajaran')
            ->whereIn('id', $eventCollection->where('source_type', 'flashcard')->pluck('source_id'))
            ->get(['id', 'flashcard_set_id', 'front_text', 'reading'])
            ->keyBy('id');

        $events->setCollection($eventCollection->map(function (EventReview $event) use ($questions, $flashcards) {
            $source = $event->source_type === 'question'
                ? $questions->get($event->source_id)
                : $flashcards->get($event->source_id);
            $program = $event->source_type === 'question'
                ? $source?->quiz?->module?->programPembelajaran
                : $source?->set?->module?->programPembelajaran;

            return [
                'id' => $event->id,
                'label' => $event->source_type === 'question'
                    ? ($source?->question_text ?? 'Soal tidak lagi tersedia')
                    : ($source?->front_text ?? 'Flashcard tidak lagi tersedia'),
                'reading' => $event->source_type === 'question'
                    ? $source?->question_reading
                    : $source?->reading,
                'program_id' => $program?->id,
                'program_title' => $program?->title,
                'activity_type' => $event->activity_type,
                'activity_label' => self::ACTIVITY_LABELS[$event->activity_type] ?? 'Latihan',
                'learning_state' => $event->learning_state,
                'state_label' => self::STATE_LABELS[$event->learning_state] ?? 'Baru',
                'result' => $event->result,
                'date_group' => $event->occurred_at?->locale('id')->translatedFormat('l, d F Y'),
                'occurred_at' => $event->occurred_at?->locale('id')->translatedFormat('H:i'),
            ];
        }));

        return Inertia::render('User/Review/Index', [
            'reviewStats' => $repetition->historyStats($user, $days),
            'reviewEvents' => $events,
            'filters' => [
                'range' => (string) $days,
                'activity' => $validated['activity'] ?? '',
                'state' => $validated['state'] ?? '',
                'result' => $validated['result'] ?? '',
                'program' => $programId ? (string) $programId : '',
            ],
            'filterOptions' => [
                'programs' => $programOptions,
                'activities' => collect(self::ACTIVITY_LABELS)->map(fn ($label, $value) => compact('value', 'label'))->values(),
                'states' => collect(self::STATE_LABELS)->map(fn ($label, $value) => compact('value', 'label'))->values(),
                'results' => [
                    ['value' => 'correct', 'label' => 'Benar'],
                    ['value' => 'wrong', 'label' => 'Salah'],
                    ['value' => 'skipped', 'label' => 'Dilewati'],
                ],
            ],
            'purgeUrl' => route('user.review.history.purge'),
            'resetUrl' => route('user.review.state.reset'),
        ]);
    }

    public function purge(Request $request, RepetisiPembelajaranService $repetition): RedirectResponse
    {
        $deleted = $repetition->purgeHistory($request->user());

        return back()->with('success', $deleted > 0
            ? 'Riwayat Review berhasil dihapus.'
            : 'Riwayat Review sudah kosong.');
    }

    public function reset(Request $request, RepetisiPembelajaranService $repetition): RedirectResponse
    {
        $repetition->resetReview($request->user());

        return back()->with('success', 'Status Review berhasil direset. Progres kelas, nilai, dan XP tetap aman.');
    }
}
