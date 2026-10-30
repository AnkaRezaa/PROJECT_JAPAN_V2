<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Modul;
use App\Models\PengerjaanKuis;
use App\Models\Pengguna;
use App\Models\Soal;
use App\Models\UmpanBalikPembelajaran;
use App\Services\ChartDataService;
use App\Services\KloterBelajarService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class AdminAnalitikController extends Controller
{
    public function __invoke(
        Request $request,
        KloterBelajarService $kloterService,
        ChartDataService $chartData
    ): Response
    {
        /** @var Pengguna $admin */
        $admin = $request->user();
        $selectedKloter = $kloterService->resolveKloterDikelola($admin, $request->integer('kloter') ?: null);
        $programIds = $kloterService->programIdsDikelola($admin, $selectedKloter);
        $studentsQuery = $kloterService->batasiSiswaDikelola(
            Pengguna::query()->where('role', 'user'),
            $admin,
            $selectedKloter
        );
        $studentIds = (clone $studentsQuery)->select('users.id');
        $attemptsQuery = PengerjaanKuis::query()
            ->whereIn('user_id', clone $studentIds)
            ->when($programIds !== null, fn (Builder $query) => $query
                ->whereHas('quiz.module', fn (Builder $query) => $query->whereIn('program_pembelajaran_id', $programIds)));
        $period = $chartData->resolvePeriod($request);
        $scoreBuckets = [
            'Perlu pendampingan (<50)' => 0,
            'Cukup (50-74)' => 0,
            'Baik (75-89)' => 0,
            'Sangat baik (90-100)' => 0,
        ];
        $scoreDistribution = (clone $attemptsQuery)
            ->where('attempted_at', '>=', $chartData->fromDate($period))
            ->selectRaw("CASE
                WHEN score < 50 THEN 'Perlu pendampingan (<50)'
                WHEN score < 75 THEN 'Cukup (50-74)'
                WHEN score < 90 THEN 'Baik (75-89)'
                ELSE 'Sangat baik (90-100)'
            END as bucket, COUNT(*) as total")
            ->groupBy('bucket')
            ->pluck('total', 'bucket');

        $lowScoreQuizzes = (clone $attemptsQuery)
            ->select('quiz_id', DB::raw('AVG(score) as average_score'), DB::raw('COUNT(*) as attempts_count'))
            ->with('quiz.module')
            ->groupBy('quiz_id')
            ->orderBy('average_score')
            ->take(8)
            ->get()
            ->map(fn (PengerjaanKuis $attempt) => [
                'quiz_id' => $attempt->quiz_id,
                'quiz_type' => $attempt->quiz?->type,
                'lesson' => $attempt->quiz?->module?->title,
                'module' => $attempt->quiz?->module?->title,
                'average_score' => round((float) $attempt->average_score, 1),
                'attempts_count' => (int) $attempt->attempts_count,
            ]);

        $popularModules = Modul::query()
            ->when($programIds !== null, fn (Builder $query) => $query->whereIn('program_pembelajaran_id', $programIds))
            ->withCount(['progress as completions_count' => fn (Builder $query) => $query->whereIn('user_id', clone $studentIds)])
            ->orderByDesc('completions_count')
            ->take(8)
            ->get(['id', 'title']);

        $cutoff = now()->subDays(7);
        $inactiveQuery = (clone $studentsQuery)
            ->whereDoesntHave('progress', fn (Builder $query) => $query
                ->where('updated_at', '>=', $cutoff)
                ->when($programIds !== null, fn (Builder $query) => $query
                    ->whereHas('module', fn (Builder $module) => $module->whereIn('program_pembelajaran_id', $programIds))))
            ->whereDoesntHave('attempts', fn (Builder $query) => $query
                ->where('attempted_at', '>=', $cutoff)
                ->when($programIds !== null, fn (Builder $query) => $query
                    ->whereHas('quiz.module', fn (Builder $module) => $module->whereIn('program_pembelajaran_id', $programIds))));
        $inactiveStudentsCount = (clone $inactiveQuery)->count();
        $inactiveStudents = $inactiveQuery
            ->withMax([
                'progress as last_lesson_activity' => function (Builder $query) use ($programIds) {
                    $query->when($programIds !== null, fn (Builder $query) => $query
                        ->whereHas('module', fn (Builder $module) => $module->whereIn('program_pembelajaran_id', $programIds)));
                },
            ], 'updated_at')
            ->withMax([
                'attempts as last_quiz_activity' => function (Builder $query) use ($programIds) {
                    $query->when($programIds !== null, fn (Builder $query) => $query
                        ->whereHas('quiz.module', fn (Builder $module) => $module->whereIn('program_pembelajaran_id', $programIds)));
                },
            ], 'attempted_at')
            ->orderByRaw('CASE WHEN last_lesson_activity IS NULL AND last_quiz_activity IS NULL THEN 0 ELSE 1 END')
            ->orderByRaw('CASE WHEN last_lesson_activity IS NULL THEN last_quiz_activity WHEN last_quiz_activity IS NULL THEN last_lesson_activity WHEN last_lesson_activity > last_quiz_activity THEN last_lesson_activity ELSE last_quiz_activity END')
            ->orderBy('users.id')
            ->limit(8)
            ->get()
            ->map(function (Pengguna $student) {
                $lastActivity = collect([
                    $student->last_lesson_activity,
                    $student->last_quiz_activity,
                ])->filter()->max();

                return [
                    'id' => $student->id,
                    'username' => $student->username,
                    'email' => $student->email,
                    'last_activity' => $lastActivity,
                    'last_activity_label' => $lastActivity ? date('d M Y', strtotime($lastActivity)) : 'Belum aktif',
                    'xp' => (int) $student->xp,
                ];
            })
            ->values();

        $recentAttempts = (clone $attemptsQuery)
            ->with(['user:id,username,email', 'quiz.module'])
            ->latest('attempted_at')
            ->take(10)
            ->get()
            ->map(fn (PengerjaanKuis $attempt) => [
                'id' => $attempt->id,
                'student' => $attempt->user?->username,
                'lesson' => $attempt->quiz?->module?->title,
                'quiz_type' => $attempt->quiz?->type,
                'score' => $attempt->score,
                'xp_earned' => $attempt->xp_earned,
                'attempted_at' => optional($attempt->attempted_at)->format('d M Y H:i'),
            ]);

        $questionPerformance = Soal::query()
            ->when($programIds !== null, fn (Builder $query) => $query
                ->whereHas('quiz.module', fn (Builder $query) => $query->whereIn('program_pembelajaran_id', $programIds)))
            ->with('quiz.module')
            ->withCount([
                'attemptAnswers as attempts_count' => fn (Builder $query) => $query
                    ->whereHas('attempt', fn (Builder $attempt) => $attempt->whereIn('user_id', clone $studentIds)),
                'attemptAnswers as correct_count' => fn (Builder $query) => $query
                    ->where('is_correct', true)
                    ->whereHas('attempt', fn (Builder $attempt) => $attempt->whereIn('user_id', clone $studentIds)),
            ])
            ->whereHas('attemptAnswers', fn (Builder $query) => $query
                ->whereHas('attempt', fn (Builder $attempt) => $attempt->whereIn('user_id', clone $studentIds)))
            ->orderByRaw('ROUND(100.0 * correct_count / NULLIF(attempts_count, 0), 1) ASC')
            ->orderBy('questions.id')
            ->limit(12)
            ->get()
            ->map(function (Soal $question) {
                $correctRate = round(($question->correct_count / $question->attempts_count) * 100, 1);

                return [
                    'id' => $question->id,
                    'question_text' => $question->question_text,
                    'quiz_type' => $question->quiz?->type,
                    'lesson' => $question->quiz?->module?->title,
                    'module' => $question->quiz?->module?->title,
                    'attempts_count' => (int) $question->attempts_count,
                    'correct_count' => (int) $question->correct_count,
                    'correct_rate' => $correctRate,
                ];
            })
            ->values();
        $feedbackCounts = UmpanBalikPembelajaran::query()
            ->whereIn('user_id', clone $studentIds)
            ->when($programIds !== null, fn (Builder $query) => $query->whereIn('program_pembelajaran_id', $programIds))
            ->where('feedback_date', '>=', $chartData->fromDate($period)->toDateString())
            ->selectRaw('rating, COUNT(*) as total')
            ->groupBy('rating')
            ->pluck('total', 'rating');

        return Inertia::render('Admin/Analitik/Analitik', [
            'adminScope' => $admin->admin_scope ?: Pengguna::ADMIN_SCOPE_GLOBAL,
            'summary' => [
                'total_students' => (clone $studentsQuery)->count(),
                'total_attempts' => (clone $attemptsQuery)->count(),
                'average_score' => round((float) (clone $attemptsQuery)->avg('score'), 1),
                'inactive_students' => $inactiveStudentsCount,
            ],
            'kloters' => $kloterService->pilihanKloterAdmin($admin),
            'filters' => ['kloter' => $selectedKloter?->id, 'period' => $period],
            'scoreDistribution' => collect($scoreBuckets)
                ->map(fn (int $total, string $label) => [
                    'label' => $label,
                    'value' => (int) ($scoreDistribution->get($label) ?? $total),
                ])
                ->values(),
            'lowScoreQuizzes' => $lowScoreQuizzes,
            'popularModules' => $popularModules,
            'inactiveStudents' => $inactiveStudents->take(8)->values(),
            'recentAttempts' => $recentAttempts,
            'questionPerformance' => $questionPerformance,
            'learningFeedback' => [
                ['label' => 'Perlu diulang', 'value' => (int) ($feedbackCounts->get('repeat') ?? 0), 'tone' => 'red'],
                ['label' => 'Pas', 'value' => (int) ($feedbackCounts->get('just_right') ?? 0), 'tone' => 'amber'],
                ['label' => 'Terlalu mudah', 'value' => (int) ($feedbackCounts->get('easy') ?? 0), 'tone' => 'emerald'],
            ],
        ]);
    }
}
