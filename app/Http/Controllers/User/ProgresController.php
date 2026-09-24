<?php

namespace App\Http\Controllers\User;

use App\Events\KuisSelesai;
use App\Http\Controllers\Controller;
use App\Models\JawabanPengerjaanKuis;
use App\Models\Kuis;
use App\Models\LogReward;
use App\Models\Modul;
use App\Models\PengerjaanKuis;
use App\Models\Progres;
use App\Services\AksesKuisPenggunaService;
use App\Services\AksesPremiumService;
use App\Services\GamifikasiConfigService;
use App\Services\PenilaianJawabanKuisService;
use App\Services\ProgresRoadmapService;
use App\Services\RepetisiPembelajaranService;
use App\Services\RingkasanProgresPenggunaService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class ProgresController extends Controller
{
    public function __construct(
        private readonly PenilaianJawabanKuisService $penilaian
    ) {}

    public function index(RingkasanProgresPenggunaService $summary)
    {
        return Inertia::render('User/Progress/Progress', $summary->summary(Auth::user()));
    }

    public function startAttempt(
        Request $request,
        Kuis $quiz,
        AksesKuisPenggunaService $aksesKuis
    ) {
        $validated = $request->validate([
            'submission_token' => ['required', 'uuid'],
        ]);
        $user = Auth::user();
        $quiz->loadMissing(['module', 'questions']);

        abort_unless($quiz->status === 'published', 404);
        $aksesKuis->abortJikaTerkunci($user, $quiz);
        abort_if($quiz->questions->isEmpty(), 422, 'Kuis belum memiliki soal.');

        $attempt = DB::transaction(function () use ($user, $quiz, $validated) {
            Kuis::query()->whereKey($quiz->id)->lockForUpdate()->firstOrFail();

            $tokenAttempt = PengerjaanKuis::query()
                ->where('user_id', $user->id)
                ->where('quiz_id', $quiz->id)
                ->where('submission_token', $validated['submission_token'])
                ->first();

            if ($tokenAttempt) {
                return $tokenAttempt;
            }

            $activeAttempt = PengerjaanKuis::query()
                ->where('user_id', $user->id)
                ->where('quiz_id', $quiz->id)
                ->where('status', 'in_progress')
                ->where('started_at', '>=', now()->subDay())
                ->lockForUpdate()
                ->latest('id')
                ->first();

            if ($activeAttempt) {
                return $activeAttempt;
            }

            PengerjaanKuis::query()
                ->where('user_id', $user->id)
                ->where('quiz_id', $quiz->id)
                ->where('status', 'in_progress')
                ->update(['status' => 'expired']);

            return PengerjaanKuis::create([
                'user_id' => $user->id,
                'quiz_id' => $quiz->id,
                'submission_token' => $validated['submission_token'],
                'status' => 'in_progress',
                'score' => 0,
                'xp_earned' => 0,
                'started_at' => now(),
                'attempted_at' => now(),
            ]);
        });

        $elapsed = $attempt->started_at?->diffInSeconds(now()) ?? 0;
        $remainingSeconds = $quiz->time_limit
            ? max(0, (int) $quiz->time_limit - $elapsed)
            : null;

        return response()->json([
            'attempt_id' => $attempt->id,
            'submission_token' => $attempt->submission_token,
            'started_at' => $attempt->started_at?->toISOString(),
            'remaining_seconds' => $remainingSeconds,
        ]);
    }

    public function storeAttempt(
        Request $request,
        AksesKuisPenggunaService $aksesKuis,
        RepetisiPembelajaranService $repetisi,
        GamifikasiConfigService $gamifikasiConfig,
        RingkasanProgresPenggunaService $summary,
        ProgresRoadmapService $roadmapProgress
    ) {
        $validated = $request->validate([
            'quiz_id' => ['required', 'exists:quizzes,id'],
            'answers' => ['present', 'array'],
            'answers.*.question_id' => ['required', 'integer', 'exists:questions,id'],
            'answers.*.answer_text' => ['nullable', 'string', 'max:2000'],
            'answers.*.answer_payload' => ['nullable', 'array'],
            'answers.*.answer_payload.completed_strokes' => ['nullable', 'integer', 'min:0', 'max:100'],
            'answers.*.answer_payload.total_strokes' => ['nullable', 'integer', 'min:0', 'max:100'],
            'answers.*.answer_payload.attempts_by_stroke' => ['nullable', 'array', 'max:100'],
            'answers.*.answer_payload.mistakes' => ['nullable', 'integer', 'min:0', 'max:10000'],
            'answers.*.answer_payload.hints_used' => ['nullable', 'integer', 'min:0', 'max:10000'],
            'answers.*.answer_payload.duration_ms' => ['nullable', 'integer', 'min:0', 'max:86400000'],
            'answers.*.answer_payload.revealed' => ['nullable', 'boolean'],
            'answers.*.answer_payload.ordered_token_ids' => ['nullable', 'array', 'max:20'],
            'answers.*.answer_payload.ordered_token_ids.*' => ['string', 'max:80'],
            'module_flow' => ['nullable', 'boolean'],
            'finished_by_timeout' => ['nullable', 'boolean'],
            'attempt_id' => ['nullable', 'integer', 'exists:attempts,id'],
            'submission_token' => ['nullable', 'uuid'],
        ]);

        $user = Auth::user();
        $quiz = Kuis::with([
            'questions',
            'module.programPembelajaran',
        ])
            ->where('status', 'published')
            ->whereHas('module', fn ($moduleQuery) => $moduleQuery->where('status', 'published'))
            ->findOrFail($validated['quiz_id']);

        $module = $quiz->module;
        $isGrammar = $quiz->isGrammar();
        $scoredQuestionIds = $quiz->questions
            ->where('type', '!=', 'handwriting')
            ->pluck('id');
        $scoredQuestionCount = $scoredQuestionIds->count();

        $aksesKuis->abortJikaTerkunci($user, $quiz);
        abort_if($quiz->questions->isEmpty(), 422, 'Kuis belum memiliki soal.');
        abort_if(
            $isGrammar && (empty($validated['attempt_id']) || empty($validated['submission_token'])),
            422,
            'Sesi kuis belum dimulai.'
        );

        $wrongAttemptCount = 0;
        $answeredUniqueCount = 0;
        $passingScore = (int) ($quiz->passing_score ?? 70);
        $maxLives = 5;
        $passed = false;
        $wasCompleted = false;
        $completedModule = false;
        $completedDay = false;
        $attemptAlreadyCompleted = false;
        $rewardAlreadyGranted = LogReward::where('user_id', $user->id)
            ->where('source_type', 'quiz')
            ->where('source_id', $quiz->id)
            ->exists();

        $attempt = DB::transaction(function () use ($validated, $quiz, $user, $repetisi, $gamifikasiConfig, $isGrammar, $rewardAlreadyGranted, &$wrongAttemptCount, &$answeredUniqueCount, &$attemptAlreadyCompleted) {
            $attempt = null;

            if ($isGrammar) {
                $attempt = PengerjaanKuis::query()
                    ->whereKey($validated['attempt_id'])
                    ->where('user_id', $user->id)
                    ->where('quiz_id', $quiz->id)
                    ->where('submission_token', $validated['submission_token'])
                    ->lockForUpdate()
                    ->firstOrFail();

                if ($attempt->status === 'completed') {
                    $attemptAlreadyCompleted = true;

                    return $attempt;
                }

                abort_unless($attempt->status === 'in_progress', 422, 'Sesi ujian sudah tidak aktif.');
            }

            $answerEvents = ($isGrammar
                ? $attempt->answers()->get()->map(fn ($answer) => [
                    'question_id' => $answer->question_id,
                    'answer_text' => $answer->answer_text,
                    'answer_payload' => $answer->answer_payload ?? [],
                ])
                : collect($validated['answers'] ?? []))
                ->filter(fn ($answer) => isset($answer['question_id']))
                ->values();
            $answers = $answerEvents
                ->keyBy(fn ($answer) => (int) $answer['question_id'])
                ->values();
            $questionMap = $quiz->questions->keyBy('id');
            $scoredQuestionMap = $questionMap->reject(fn ($question) => $this->penilaian->soalLatihan($question));
            $scoredAnswers = $answers->filter(
                fn ($answer) => $scoredQuestionMap->has((int) $answer['question_id'])
            );
            $answeredUniqueCount = $scoredAnswers->count();
            $correctCount = $this->scoreAnswers($scoredAnswers, $scoredQuestionMap);
            $totalQuestions = $scoredQuestionMap->count();
            $totalPoints = (int) $scoredQuestionMap->sum(
                fn ($question) => max(1, (int) ($question->points ?? 1))
            );
            $earnedPoints = (int) $scoredAnswers->sum(function ($answer) use ($scoredQuestionMap) {
                $question = $scoredQuestionMap->get((int) $answer['question_id']);

                return $question && $this->penilaian->benar($question, $answer['answer_text'] ?? '', $answer['answer_payload'] ?? [])
                    ? max(1, (int) ($question->points ?? 1))
                    : 0;
            });
            $score = $totalPoints > 0 ? (int) round(($earnedPoints / $totalPoints) * 100) : 0;
            $xpEarned = $rewardAlreadyGranted
                ? 0
                : $gamifikasiConfig->quizXpForScore($score);
            $wrongAttemptCount = $answerEvents
                ->filter(function ($answer) use ($questionMap) {
                    $question = $questionMap->get((int) $answer['question_id']);

                    return $question
                        && ! $this->penilaian->soalLatihan($question)
                        && ! $this->penilaian->benar($question, $answer['answer_text'] ?? '', $answer['answer_payload'] ?? []);
                })
                ->count();

            $attemptPayload = [
                'status' => 'completed',
                'score' => $score,
                'xp_earned' => $xpEarned,
                'completed_at' => now(),
                'attempted_at' => now(),
            ];

            if ($attempt) {
                $attempt->update($attemptPayload);
            } else {
                $attempt = PengerjaanKuis::create([
                    'user_id' => $user->id,
                    'quiz_id' => $quiz->id,
                    'started_at' => now(),
                    ...$attemptPayload,
                ]);
            }

            if (! $isGrammar) {
                $answers->each(function ($answer) use ($attempt, $questionMap) {
                    $question = $questionMap->get((int) $answer['question_id']);

                    if (! $question) {
                        return;
                    }

                    $answerText = $answer['answer_text'] ?? '';
                    $isPractice = $this->penilaian->soalLatihan($question);
                    $isCorrect = $this->penilaian->benar($question, $answerText, $answer['answer_payload'] ?? []);

                    $attempt->answers()->create([
                        'question_id' => $question->id,
                        'answer_text' => $answerText,
                        'answer_payload' => $answer['answer_payload'] ?? null,
                        'is_correct' => $isCorrect,
                        'earned_points' => ! $isPractice && $isCorrect ? max(1, (int) ($question->points ?? 1)) : 0,
                    ]);
                });
            }

            $answerEvents->each(function ($answer) use ($questionMap, $user, $quiz, $repetisi) {
                $question = $questionMap->get((int) $answer['question_id']);

                if (! $question) {
                    return;
                }

                $repetisi->catatJawabanSoal(
                    $user,
                    $question,
                    $this->penilaian->benar($question, $answer['answer_text'] ?? '', $answer['answer_payload'] ?? []),
                    $quiz
                );
            });

            return $attempt;
        });

        if ($attemptAlreadyCompleted) {
            $attempt->loadMissing('answers');
            $passed = $scoredQuestionCount > 0 && $attempt->score >= $passingScore;
            $finishUrl = $module?->programPembelajaran
                ? route('user.modul.program', $module->programPembelajaran->slug)
                : route('user.kelas.index');

            return response()->json([
                'attempt_id' => $attempt->id,
                'score' => $attempt->score,
                'xp_earned' => 0,
                'passed' => $passed,
                'completed_day' => false,
                'completed_module' => $user->progress()
                    ->where('module_id', $module?->id)
                    ->whereNotNull('completed_at')
                    ->exists(),
                'answered_count' => $attempt->answers
                    ->whereIn('question_id', $scoredQuestionIds)
                    ->count(),
                'correct_count' => $attempt->answers
                    ->whereIn('question_id', $scoredQuestionIds)
                    ->where('is_correct', true)
                    ->count(),
                'total_questions' => $scoredQuestionCount,
                'passing_score' => $passingScore,
                'answer_review' => $this->attemptReview($attempt, $quiz),
                'idempotent' => true,
                'next_url' => $finishUrl,
                'message' => 'Hasil ujian sebelumnya ditampilkan kembali.',
            ]);
        }

        if ($module) {
            $passed = $isGrammar
                ? $scoredQuestionCount > 0
                    && $attempt->score >= $passingScore
                    && $answeredUniqueCount >= $scoredQuestionCount
                : (
                    $scoredQuestionCount > 0
                    &&
                    $attempt->score >= $passingScore
                    && $wrongAttemptCount < $maxLives
                    && $answeredUniqueCount >= $scoredQuestionCount
                    && ! ($validated['finished_by_timeout'] ?? false)
                );

            if ($passed && $quiz->module_day_id) {
                $result = $roadmapProgress->selesaikanDariKuis($user, $quiz, (int) $attempt->score);
                $completedDay = $result['day_completed'];
                $completedModule = $result['module_completed'];
                $wasCompleted = $result['was_module_completed'];
            }
        }

        if ($scoredQuestionCount > 0) {
            event(new KuisSelesai($user, $quiz->id, $attempt->score, $attempt->xp_earned));
        }
        $summary->forget($user);

        if ($request->expectsJson()) {
            $finishUrl = $module?->programPembelajaran
                ? route('user.modul.program', $module->programPembelajaran->slug)
                : route('user.kelas.index');

            return response()->json([
                'attempt_id' => $attempt->id,
                'score' => $attempt->score,
                'xp_earned' => $rewardAlreadyGranted ? 0 : $attempt->xp_earned,
                'passed' => $passed,
                'completed_day' => $completedDay,
                'completed_module' => $completedModule,
                'was_completed' => $wasCompleted,
                'answered_count' => $answeredUniqueCount,
                'correct_count' => $attempt->answers()
                    ->whereIn('question_id', $scoredQuestionIds)
                    ->where('is_correct', true)
                    ->count(),
                'total_questions' => $scoredQuestionCount,
                'practice_questions' => $quiz->questions->where('type', 'handwriting')->count(),
                'wrong_attempt_count' => $wrongAttemptCount,
                'passing_score' => $passingScore,
                'finished_by_timeout' => (bool) ($validated['finished_by_timeout'] ?? false),
                'answer_review' => [],
                'next_url' => $finishUrl,
                'message' => $isGrammar
                    ? ($passed
                        ? ($completedModule
                            ? 'Lesson Grammar lulus. Week selesai dan roadmap berikutnya terbuka.'
                            : ($completedDay
                                ? 'Lesson Grammar lulus. Day berikutnya sudah terbuka.'
                                : 'Lesson Grammar lulus. Selesaikan kebutuhan Day lainnya.'))
                        : 'Hasil Grammar tersimpan. Ulangi lesson untuk meningkatkan skor.')
                    : ($passed
                        ? ($completedModule
                            ? 'Kuis lulus. Week selesai dan roadmap berikutnya terbuka.'
                            : ($completedDay
                                ? 'Kuis lulus. Day berikutnya sudah terbuka.'
                                : 'Kuis lulus. Selesaikan kebutuhan Day lainnya.'))
                        : 'Kuis tersimpan. Ulangi sampai skor dan mastery cukup.'),
            ]);
        }

        return redirect()->back()->with('success', 'Jawaban kuis berhasil dikirim.');
    }


    private function scoreAnswers($answers, $questionMap): int
    {
        return $answers
            ->filter(fn ($answer) => $questionMap->has((int) $answer['question_id']))
            ->filter(function ($answer) use ($questionMap) {
                $question = $questionMap->get((int) $answer['question_id']);

                return $this->penilaian->benar(
                    $question,
                    $answer['answer_text'] ?? '',
                    $answer['answer_payload'] ?? []
                );
            })
            ->count();
    }

    public function storeFirstAnswer(
        Request $request,
        PengerjaanKuis $attempt,
        AksesKuisPenggunaService $aksesKuis
    ) {
        $validated = $request->validate([
            'submission_token' => ['required', 'uuid'],
            'question_id' => ['required', 'integer', 'exists:questions,id'],
            'answer_text' => ['nullable', 'string', 'max:2000'],
            'answer_payload' => ['nullable', 'array'],
            'answer_payload.ordered_token_ids' => ['nullable', 'array', 'max:20'],
            'answer_payload.ordered_token_ids.*' => ['string', 'max:80'],
        ]);

        abort_unless((int) $attempt->user_id === (int) Auth::id(), 404);
        abort_unless(hash_equals((string) $attempt->submission_token, $validated['submission_token']), 422, 'Token sesi tidak valid.');
        abort_unless($attempt->status === 'in_progress', 422, 'Sesi kuis sudah selesai.');
        $quiz = $attempt->quiz()->with('questions')->firstOrFail();
        abort_unless($quiz->isGrammar() && $quiz->status === 'published', 404);
        $aksesKuis->abortJikaTerkunci(Auth::user(), $quiz);
        $question = $quiz->questions->firstWhere('id', (int) $validated['question_id']);
        abort_unless($question, 422, 'Soal bukan bagian dari lesson Grammar ini.');

        $currentCorrect = $this->penilaian->benar(
            $question,
            $validated['answer_text'] ?? '',
            $validated['answer_payload'] ?? []
        );
        $answer = DB::transaction(function () use ($attempt, $question, $validated, $currentCorrect) {
            $lockedAttempt = PengerjaanKuis::query()->whereKey($attempt->id)->lockForUpdate()->firstOrFail();
            abort_unless($lockedAttempt->status === 'in_progress', 422, 'Sesi kuis sudah selesai.');

            return JawabanPengerjaanKuis::query()->firstOrCreate(
                ['attempt_id' => $attempt->id, 'question_id' => $question->id],
                [
                    'answer_text' => $validated['answer_text'] ?? null,
                    'answer_payload' => $validated['answer_payload'] ?? null,
                    'is_correct' => $currentCorrect,
                    'earned_points' => $currentCorrect ? max(1, (int) ($question->points ?? 1)) : 0,
                ]
            );
        });

        return response()->json([
            'correct' => $currentCorrect,
            'explanation' => $question->explanation,
            'recorded' => $answer->wasRecentlyCreated,
        ]);
    }

    private function attemptReview(PengerjaanKuis $attempt, Kuis $quiz): array
    {
        $attempt->loadMissing('answers');
        $answers = $attempt->answers->keyBy('question_id');

        return $quiz->questions->map(function ($question) use ($answers) {
            $answer = $answers->get($question->id);

            return [
                'question_id' => $question->id,
                'question' => $question->question_text,
                'question_reading' => $question->question_reading,
                'user_answer' => $answer?->answer_text,
                'correct_answer' => $question->correct_answer,
                'correct_answer_reading' => $question->correct_answer_reading,
                'explanation' => $question->explanation,
                'explanation_reading' => $question->explanation_reading,
                'is_correct' => (bool) ($answer?->is_correct),
                'earned_points' => (int) ($answer?->earned_points ?? 0),
                'max_points' => max(1, (int) ($question->points ?? 1)),
            ];
        })->values()->all();
    }
}
