<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Models\DeckPresentasi;
use App\Models\Flashcard;
use App\Models\HariModul;
use App\Models\Kosakata;
use App\Models\Kuis;
use App\Models\Modul;
use App\Models\PengerjaanKuis;
use App\Models\ProgramPembelajaran;
use App\Models\ProgresHariModul;
use App\Models\ReviewFlashcard;
use App\Models\SesiKelasLive;
use App\Models\SetFlashcard;
use App\Models\Soal;
use App\Models\TargetUjianPengguna;
use App\Services\AksesKuisPenggunaService;
use App\Services\AksesPremiumService;
use App\Services\KelasPenggunaPayloadService;
use App\Services\KloterBelajarService;
use App\Services\PembelajaranPenggunaService;
use App\Services\PenilaianJawabanKuisService;
use App\Services\ProgresRoadmapService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Inertia\Inertia;

class ModulController extends Controller
{
    public function program(
        ProgramPembelajaran $program,
        AksesPremiumService $aksesPremium,
        KloterBelajarService $kloterService,
        AksesKuisPenggunaService $aksesKuis,
        KelasPenggunaPayloadService $kelasPayload
    ) {
        $user = Auth::user();

        abort_unless($program->status === 'published', 404);
        $program->loadMissing(['level', 'curriculumTrack']);

        $classAccess = $kelasPayload->forProgram($user, $program);

        $moduls = $program->modules()
            ->with([
                'level',
                'weeklyExams' => fn ($query) => $query
                    ->where('status', 'published')
                    ->whereHas('questions')
                    ->with([
                        'questions',
                        'attempts' => fn ($attemptQuery) => $attemptQuery
                            ->where('user_id', $user->id)
                            ->where('status', 'completed'),
                    ]),
                'presentationDecks' => fn ($query) => $query
                    ->shared()
                    ->whereIn('week_slot', ['opening', 'after_day', 'closing'])
                    ->where('status', 'published')
                    ->whereHas('slides')
                    ->with('day:id,module_id,day_number,title')
                    ->withCount('slides')
                    ->orderBy('sort_order')
                    ->orderBy('id'),
                'days' => fn ($query) => $query
                    ->where('status', 'published')
                    ->with([
                        'checkpointQuiz.questions',
                        'flashcardSets' => fn ($query) => $query
                            ->where('status', 'published')
                            ->withCount('flashcards')
                            ->with([
                                'flashcards' => fn ($cardQuery) => $cardQuery
                                    ->select(['id', 'flashcard_set_id'])
                                    ->with(['reviews' => fn ($reviewQuery) => $reviewQuery
                                        ->where('user_id', $user->id)
                                        ->select(['id', 'flashcard_id', 'user_id'])]),
                            ]),
                        'quizzes' => fn ($query) => $query->where('status', 'published')->withCount('questions'),
                        'presentationDecks' => fn ($query) => $query
                            ->shared()
                            ->where('status', 'published')
                            ->withCount('slides')
                            ->with(['slides' => fn ($slideQuery) => $slideQuery
                                ->select([
                                    'id',
                                    'presentation_deck_id',
                                    'title',
                                    'layout',
                                    'content',
                                    'media_url',
                                    'background',
                                    'snapshot_url',
                                    'order',
                                ])
                                ->orderBy('order')
                                ->limit(1)]),
                        'vocabulary' => fn ($query) => $query->where('status', 'published'),
                    ])
                    ->orderBy('day_number'),
            ])
            ->where('status', 'published')
            ->orderBy('week_number')
            ->orderBy('id')
            ->get();
        $kloterAktif = $kloterService->kloterAktifUser($user, $program->id);
        $mingguAktifKloter = $kloterService->mingguAktif($kloterAktif);
        $fallbackLiveModuleId = $moduls
            ->firstWhere('week_number', $mingguAktifKloter)?->id
            ?? $moduls->first()?->id;
        $liveSessionsByModule = collect();

        if ($kloterAktif && $fallbackLiveModuleId) {
            $liveSessionsByModule = SesiKelasLive::query()
                ->with([
                    'mentor:id,username',
                    'deck:id,module_id,title',
                ])
                ->where('program_pembelajaran_id', $program->id)
                ->where('kloter_belajar_id', $kloterAktif->id)
                ->whereIn('status', ['scheduled', 'live'])
                ->orderByRaw("CASE WHEN status = 'live' THEN 0 ELSE 1 END")
                ->orderBy('scheduled_at')
                ->get()
                ->groupBy(fn (SesiKelasLive $session) => $session->deck?->module_id ?? $fallbackLiveModuleId)
                ->map(fn ($sessions) => $sessions->first());
        }

        $completedModulIds = collect();

        $weeks = $moduls->values()->map(function (Modul $modul, int $index) use (&$completedModulIds, $user, $aksesPremium, $moduls, $program, $kloterAktif, $mingguAktifKloter, $aksesKuis, $liveSessionsByModule) {
            $flashcardSet = $this->firstFlashcardSetFor($modul);
            $weeklyExams = $modul->weeklyExams;
            $weeklyExamStats = $weeklyExams->mapWithKeys(
                fn (Kuis $exam) => [$exam->id => $this->quizStats($user->id, $exam)]
            );
            $quiz = $weeklyExams->first();
            $flashcardStats = $this->flashcardStats($user->id, $flashcardSet);
            $quizStats = $quiz ? $weeklyExamStats->get($quiz->id) : $this->quizStats($user->id, null);
            $passingScore = (int) ($quiz?->passing_score ?? 70);
            $presentationCount = $modul->presentationDecks->count();
            $liveSession = $liveSessionsByModule->get($modul->id);
            $vocabularyCount = $this->vocabularyQueryForModules(collect([$modul->id]))->count('vocabulary_bank.id');

            $hasFlashcard = $flashcardStats['total'] > 0;
            $hasQuiz = $weeklyExams->isNotEmpty();
            $hasPresentation = $presentationCount > 0;
            $hasVocabulary = $vocabularyCount > 0;
            $hasDayContent = $modul->days->contains(fn (HariModul $day) => (
                $day->flashcardSets->isNotEmpty()
                || $day->quizzes->isNotEmpty()
                || $day->presentationDecks->isNotEmpty()
                || $day->vocabulary->isNotEmpty()
            ));
            $flashcardDone = ! $hasFlashcard || $flashcardStats['reviewed'] >= $flashcardStats['total'];
            $quizDone = ! $hasQuiz || $weeklyExams->every(
                fn (Kuis $exam) => (bool) ($weeklyExamStats->get($exam->id)['done'] ?? false)
            );
            $quizUnlocked = (bool) $hasQuiz;
            $isDone = $user->progress()
                ->where('module_id', $modul->id)
                ->whereNotNull('completed_at')
                ->exists();
            $isSubscriptionLocked = ! $aksesPremium->bolehAksesModul($user, $modul);
            $isKloterLocked = $kloterAktif && $mingguAktifKloter !== null && (int) $modul->week_number > $mingguAktifKloter;
            $hasContent = $hasFlashcard || $hasQuiz || $hasPresentation || $hasVocabulary || $hasDayContent;
            $primaryUrl = null;
            $primaryLabel = 'Pilih Resource';

            if ($quiz && ! $quizDone) {
                $primaryUrl = route('user.modul.quiz', $modul->id);
                $primaryLabel = 'Mulai Sesi';
            } elseif ($quiz) {
                $primaryUrl = route('user.modul.quiz', $modul->id);
                $primaryLabel = 'Review Sesi';
            }

            $status = 'unavailable';
            if (! $hasContent) {
                $status = 'unavailable';
            } elseif ($isDone) {
                $status = 'done';
                $completedModulIds->push($modul->id);
            } elseif ($index === 0 || $completedModulIds->contains($moduls[$index - 1]->id ?? null)) {
                $status = $isSubscriptionLocked ? 'locked' : 'active';
            }

            $weekCanOpen = in_array($status, ['active', 'done'], true) && ! $isKloterLocked && ! $isSubscriptionLocked;
            $completedDayIds = ProgresHariModul::query()
                ->where('user_id', $user->id)
                ->whereIn('module_day_id', $modul->days->pluck('id'))
                ->whereNotNull('completed_at')
                ->pluck('module_day_id');
            $days = $modul->days->values()->map(function (HariModul $day, int $dayIndex) use ($program, $modul, $weekCanOpen, $completedDayIds, $aksesKuis, $user) {
                $checkpointQuiz = $day->checkpointQuiz?->status === 'published' && $day->checkpointQuiz?->questions?->isNotEmpty()
                    ? $day->checkpointQuiz
                    : null;
                $quizAccess = $checkpointQuiz
                    ? $aksesKuis->status($user, $checkpointQuiz)
                    : ['allowed' => false, 'message' => 'Kuis checkpoint belum tersedia.'];
                $dayDone = $completedDayIds->contains($day->id);
                $previousDayDone = $dayIndex === 0 || $completedDayIds->contains($modul->days[$dayIndex - 1]?->id);
                $dayStatus = $dayDone ? 'done' : ($weekCanOpen && $previousDayDone ? 'active' : 'locked');
                $presentationCount = $day->presentationDecks->sum('slides_count');
                $flashcardCount = $day->flashcardSets->sum('flashcards_count');
                $flashcardReviewed = $day->flashcardSets
                    ->flatMap->flashcards
                    ->filter(fn ($card) => $card->reviews->isNotEmpty())
                    ->count();
                $questionCount = $day->quizzes->sum('questions_count');
                $hasContent = $presentationCount > 0 || $flashcardCount > 0 || $questionCount > 0 || $day->vocabulary->isNotEmpty();
                $completionMethod = $checkpointQuiz ? 'checkpoint' : null;
                $isReady = $hasContent && $completionMethod;
                $presentationPreviews = $day->presentationDecks
                    ->take(3)
                    ->map(function (DeckPresentasi $deck) {
                        $cover = $deck->slides->first();

                        return [
                            'id' => $deck->id,
                            'title' => $deck->title,
                            'description' => Str::limit(strip_tags((string) $deck->description), 120),
                            'slides_count' => $deck->slides_count,
                            'cover' => $cover ? [
                                'title' => $cover->title,
                                'layout' => $cover->layout,
                                'content_excerpt' => Str::limit(strip_tags((string) $cover->content), 100),
                                'media_url' => $cover->media_url,
                                'snapshot_url' => $cover->snapshot_url,
                                'background' => $cover->background,
                            ] : null,
                        ];
                    })
                    ->values();
                $vocabularyPreview = $day->vocabulary
                    ->take(3)
                    ->map(fn (Kosakata $item) => [
                        'id' => $item->id,
                        'type' => $item->content_type,
                        'word' => $item->word,
                        'reading' => $item->reading,
                        'meaning' => $item->meaning_id,
                    ])
                    ->values();

                return [
                    'id' => $day->id,
                    'day_number' => $day->day_number,
                    'title' => $day->title,
                    'description' => $day->description,
                    'status' => $isReady ? $dayStatus : 'unavailable',
                    'lock_reason' => ! $hasContent
                        ? 'Konten Hari ini belum tersedia.'
                        : (! $completionMethod
                            ? 'Kuis Day belum tersedia.'
                            : ($weekCanOpen ? 'Selesaikan Hari sebelumnya.' : 'Minggu ini belum terbuka.')),
                    'has_content' => $hasContent,
                    'completion_method' => $completionMethod,
                    'checkpoint_quiz_id' => $checkpointQuiz?->id,
                    'presentations_count' => $presentationCount,
                    'presentation_previews' => $presentationPreviews,
                    'vocabulary_count' => $day->vocabulary->count(),
                    'vocabulary_preview' => $vocabularyPreview,
                    'flashcard_total' => $flashcardCount,
                    'flashcard_reviewed' => $flashcardReviewed,
                    'questions_count' => $questionCount,
                    'checkpoint_summary' => $checkpointQuiz ? [
                        'id' => $checkpointQuiz->id,
                        'questions_count' => $checkpointQuiz->questions->count(),
                        'passing_score' => (int) ($checkpointQuiz->passing_score ?? 70),
                        'time_limit' => (int) ($checkpointQuiz->time_limit ?? 0),
                        'best_score' => PengerjaanKuis::query()
                            ->where('user_id', $user->id)
                            ->where('quiz_id', $checkpointQuiz->id)
                            ->max('score'),
                        'locked' => ! $quizAccess['allowed'],
                        'lock_reason' => $quizAccess['allowed'] ? null : $quizAccess['message'],
                    ] : null,
                    'presentation_url' => $presentationCount > 0
                        ? route('user.modul.program.presentasi', ['program' => $program->slug, 'module' => $modul->id, 'day' => $day->id])
                        : null,
                    'vocabulary_url' => $day->vocabulary->isNotEmpty()
                        ? route('user.modul.program.kosakata', ['program' => $program->slug, 'module' => $modul->id, 'day' => $day->id])
                        : null,
                    'quiz_url' => $checkpointQuiz && $quizAccess['allowed'] ? route('user.quizzes.show', $checkpointQuiz->id) : null,
                    'quiz_locked_reason' => $checkpointQuiz && ! $quizAccess['allowed'] ? $quizAccess['message'] : null,
                    'primary_url' => $checkpointQuiz && $quizAccess['allowed']
                        ? route('user.quizzes.show', $checkpointQuiz->id)
                        : null,
                ];
            });
            $allDaysCompleted = $days->isNotEmpty() && $days->every(fn (array $day) => $day['status'] === 'done');
            $weeklyExamPayload = $weeklyExams->map(function (Kuis $exam) use ($aksesKuis, $user, $weeklyExamStats) {
                $access = $aksesKuis->status($user, $exam);
                $stats = $weeklyExamStats->get($exam->id, ['done' => false, 'best_score' => null]);

                return [
                    'id' => $exam->id,
                    'title' => 'Ujian '.$exam->exam_order,
                    'exam_order' => $exam->exam_order,
                    'questions_count' => $exam->questions->count(),
                    'passing_score' => (int) ($exam->passing_score ?? 70),
                    'best_score' => $stats['best_score'],
                    'done' => $stats['done'],
                    'locked' => ! $access['allowed'],
                    'lock_reason' => $access['allowed']
                        ? null
                        : ($access['message'] ?? 'Selesaikan semua Hari terlebih dahulu.'),
                    'url' => $access['allowed']
                        ? route('user.quizzes.show', $exam->id)
                        : null,
                ];
            })->values();
            $presentationPayloads = $modul->presentationDecks
                ->sortBy(fn (DeckPresentasi $deck) => [
                    ['opening' => 0, 'after_day' => 1, 'closing' => 2][$deck->week_slot] ?? 3,
                    $deck->day?->day_number ?? 0,
                    $deck->sort_order,
                    $deck->id,
                ])
                ->map(function (DeckPresentasi $deck) use ($program, $modul, $weekCanOpen, $completedDayIds, $quizDone) {
                    $locked = match ($deck->week_slot) {
                        'after_day' => ! $weekCanOpen || ! $completedDayIds->contains($deck->module_day_id),
                        'closing' => ! $quizDone,
                        default => ! $weekCanOpen,
                    };

                    return [
                        'id' => $deck->id,
                        'title' => $deck->title,
                        'slides_count' => $deck->slides_count,
                        'placement' => $deck->week_slot,
                        'module_day_id' => $deck->module_day_id,
                        'day_number' => $deck->day?->day_number,
                        'sort_order' => $deck->sort_order,
                        'locked' => $locked,
                        'url' => $locked ? null : route('user.modul.program.presentasi', [
                            'program' => $program->slug,
                            'module' => $modul->id,
                            'deck' => $deck->id,
                        ]),
                    ];
                })
                ->values();

            return [
                'id' => $modul->id,
                'title' => 'Week '.($modul->week_number ?? ($index + 1)).' - '.$modul->title,
                'display_title' => $modul->title,
                'week_number' => $modul->week_number ?? ($index + 1),
                'subtitle' => $modul->description ?? 'Flashcard dan kuis mingguan.',
                'status' => $status,
                'is_premium' => (bool) $modul->level?->is_premium,
                'lock_reason' => ! $hasContent
                    ? 'Konten minggu ini belum tersedia.'
                    : ($isKloterLocked
                        ? 'Minggu ini belum terbuka untuk kloter kamu.'
                        : ($isSubscriptionLocked ? 'Preview gratis hanya membuka Week 1.' : 'Selesaikan minggu sebelumnya.')),
                'has_content' => $hasContent,
                'has_study_content' => $hasFlashcard || $hasQuiz || $hasDayContent,
                'flashcard_set_id' => $flashcardSet?->id,
                'quiz_id' => $quiz?->id,
                'flashcard_done' => $flashcardDone,
                'quiz_done' => $quizDone,
                'quiz_unlocked' => $quizUnlocked,
                'quiz_locked_reason' => null,
                'passing_score' => $passingScore,
                'flashcard_total' => $flashcardStats['total'],
                'flashcard_reviewed' => $flashcardStats['reviewed'],
                'questions_count' => $weeklyExams->sum(fn (Kuis $exam) => $exam->questions->count()),
                'presentations_count' => $presentationCount,
                'vocabulary_count' => $vocabularyCount,
                'presentation_url' => $hasPresentation ? route('user.modul.program.presentasi', ['program' => $program->slug, 'module' => $modul->id]) : null,
                'vocabulary_url' => $hasVocabulary ? route('user.modul.program.kosakata', ['program' => $program->slug, 'module' => $modul->id]) : null,
                'quiz_url' => $quiz ? route('user.modul.quiz', $modul->id) : null,
                'primary_url' => $primaryUrl,
                'primary_label' => $primaryLabel,
                'best_score' => $weeklyExamStats->pluck('best_score')->filter(fn ($score) => $score !== null)->min(),
                'kloter_locked' => (bool) $isKloterLocked,
                'isFinal' => $index === $moduls->count() - 1,
                'days' => $days,
                'presentations' => $presentationPayloads,
                'weekly_exams' => $weeklyExamPayload,
                'all_days_completed' => $allDaysCompleted,
                'live_session' => $liveSession ? [
                    'id' => $liveSession->id,
                    'status' => $liveSession->status,
                    'scheduled_at' => $liveSession->scheduled_at?->toIso8601String(),
                    'mentor_name' => $liveSession->mentor?->username,
                    'deck_title' => $liveSession->deck?->title,
                    'join_url' => $liveSession->status === 'live'
                        ? route('user.live-classes.show', $liveSession->join_code, absolute: false)
                        : null,
                ] : null,
            ];
        });

        $moduleIds = $moduls->pluck('id');
        $accessibleModuleIds = $moduls
            ->filter(fn (Modul $modul) => $aksesPremium->bolehAksesModul($user, $modul))
            ->pluck('id');
        $resourceWeek = $weeks->first(fn ($week) => in_array($week['status'], ['active', 'done'], true) && $week['has_content']);
        $examTarget = TargetUjianPengguna::query()
            ->where('user_id', $user->id)
            ->where('program_pembelajaran_id', $program->id)
            ->first();
        $completedWeekCount = $weeks->where('status', 'done')->count();
        $remainingWeeks = max(0, $weeks->count() - $completedWeekCount);
        $examTargetPayload = null;

        if ($examTarget) {
            $daysRemaining = (int) today()->diffInDays($examTarget->exam_date, false);
            $paceMessage = match (true) {
                $remainingWeeks === 0 => 'Roadmap selesai. Pertahankan kemampuan dengan review materi.',
                $daysRemaining < 0 => 'Tanggal ujian telah lewat. Perbarui target untuk membuat rencana baru.',
                $daysRemaining === 0 => 'Hari ujian telah tiba. Semoga berhasil!',
                $daysRemaining < $remainingWeeks => 'Target sudah dekat. Prioritaskan Minggu aktif terlebih dahulu.',
                default => sprintf(
                    'Selesaikan sekitar 1 Minggu setiap %d hari.',
                    max(1, (int) floor($daysRemaining / $remainingWeeks)),
                ),
            };

            $examTargetPayload = [
                'exam_date' => $examTarget->exam_date->toDateString(),
                'days_remaining' => $daysRemaining,
                'remaining_weeks' => $remainingWeeks,
                'pace_message' => $paceMessage,
            ];
        }

        return Inertia::render('User/Modul/DaftarModul', [
            'weeks' => $weeks,
            'program' => [
                'id' => $program->id,
                'title' => $program->title,
                'slug' => $program->slug,
                'description' => $program->description,
                'level' => $program->level?->level_name,
                'curriculum' => $program->curriculumTrack ? [
                    'code' => $program->curriculumTrack->code,
                    'name' => $program->curriculumTrack->name,
                ] : null,
                'lessons' => $moduls->count(),
                'completed_lessons' => $completedWeekCount,
                'progress' => $moduls->isNotEmpty()
                    ? (int) round(($completedWeekCount / $moduls->count()) * 100)
                    : 0,
                ...$classAccess,
                'resources' => [
                    'presentations_count' => DeckPresentasi::whereIn('module_id', $accessibleModuleIds)->shared()->where('status', 'published')->count(),
                    'vocabulary_count' => $this->vocabularyQueryForModules($accessibleModuleIds)->count('vocabulary_bank.id'),
                    'flashcard_count' => Flashcard::whereHas('set', fn ($query) => $query
                        ->whereIn('module_id', $accessibleModuleIds)
                        ->where('status', 'published'))
                        ->count(),
                    'quiz_count' => Kuis::whereIn('module_id', $accessibleModuleIds)
                        ->where('status', 'published')
                        ->whereHas('questions')
                        ->count(),
                    'presentations_url' => route('user.modul.program.presentasi', $program->slug),
                    'vocabulary_url' => route('user.modul.program.kosakata', $program->slug),
                    'quizzes_url' => $resourceWeek['quiz_url'] ?? null,
                ],
                'exam_target' => $examTargetPayload,
            ],
            'back_url' => route('user.kelas.index'),
        ]);
    }

    public function kosakata(
        ProgramPembelajaran $program,
        Request $request,
        AksesPremiumService $aksesPremium,
        ProgresRoadmapService $progresRoadmap
    ) {
        $user = Auth::user();

        abort_unless($program->status === 'published', 404);
        $program->loadMissing(['level', 'curriculumTrack']);

        $moduleIds = $this->accessibleModuleIdsForProgram($program, $user, $aksesPremium, $progresRoadmap);
        $selectedModuleId = $this->selectedAccessibleModuleId($request, $moduleIds);
        $queryModuleIds = $selectedModuleId ? collect([$selectedModuleId]) : $moduleIds;
        $query = $this->vocabularyQueryForModules($queryModuleIds);
        $selectedDayId = $this->selectedAccessibleDayId($request, $queryModuleIds, $user, $progresRoadmap);

        if ($selectedDayId) {
            $query->whereHas('days', fn ($dayQuery) => $dayQuery->whereKey($selectedDayId));
        }

        if ($request->filled('search')) {
            $search = $request->string('search')->toString();
            $query->where(function ($query) use ($search) {
                $query->where('word', 'like', "%{$search}%")
                    ->orWhere('reading', 'like', "%{$search}%")
                    ->orWhere('meaning_id', 'like', "%{$search}%")
                    ->orWhere('meaning_en', 'like', "%{$search}%")
                    ->orWhere('category', 'like', "%{$search}%");
            });
        }

        if ($request->filled('category') && $request->category !== 'all') {
            $query->where('category', $request->category);
        }

        if ($request->filled('jlpt_level') && $request->jlpt_level !== 'all') {
            $query->where('jlpt_level', $request->jlpt_level);
        }

        if ($request->filled('content_type') && $request->content_type !== 'all') {
            $query->where('content_type', $request->content_type);
        }

        $categories = $this->vocabularyQueryForModules($queryModuleIds)
            ->whereNotNull('category')
            ->distinct()
            ->orderBy('category')
            ->pluck('category')
            ->filter()
            ->values();
        $availableLevels = $this->vocabularyQueryForModules($queryModuleIds)
            ->whereNotNull('jlpt_level')
            ->distinct()
            ->orderBy('jlpt_level')
            ->pluck('jlpt_level')
            ->values();

        return Inertia::render('User/Kosakata/KosakataPage', [
            'program' => [
                'title' => $program->title,
                'slug' => $program->slug,
                'level' => $program->level?->level_name,
                'curriculum' => $program->curriculumTrack ? [
                    'code' => $program->curriculumTrack->code,
                    'name' => $program->curriculumTrack->name,
                ] : null,
                'roadmap_url' => route('user.modul.program', $program->slug),
            ],
            'modules' => $program->modules()
                ->whereIn('id', $moduleIds)
                ->orderBy('week_number')
                ->get(['id', 'title', 'week_number']),
            'selected_module_id' => $selectedModuleId,
            'selected_day_id' => $selectedDayId,
            'vocabulary' => $query
                ->orderBy('jlpt_level')
                ->orderBy('word')
                ->paginate(18)
                ->withQueryString(),
            'filters' => $request->only('search', 'category', 'jlpt_level', 'module', 'content_type'),
            'categories' => $categories,
            'available_levels' => $availableLevels,
        ]);
    }

    public function presentasi(
        ProgramPembelajaran $program,
        Request $request,
        AksesPremiumService $aksesPremium,
        ProgresRoadmapService $progresRoadmap
    ) {
        $user = Auth::user();

        abort_unless($program->status === 'published', 404);

        $moduleIds = $this->accessibleModuleIdsForProgram($program, $user, $aksesPremium, $progresRoadmap);
        $selectedModuleId = $this->selectedAccessibleModuleId($request, $moduleIds);
        $queryModuleIds = $selectedModuleId ? collect([$selectedModuleId]) : $moduleIds;
        $selectedDayId = $this->selectedAccessibleDayId($request, $queryModuleIds, $user, $progresRoadmap);
        $selectedSlot = $request->string('slot')->toString();
        $selectedDeckId = $request->integer('deck');

        abort_if($selectedSlot !== '' && ! in_array($selectedSlot, ['opening', 'after_day', 'closing'], true), 404);
        abort_if($selectedSlot !== '' && ! $selectedModuleId, 404);

        $selectedDeck = $selectedDeckId
            ? DeckPresentasi::query()
                ->whereKey($selectedDeckId)
                ->whereIn('module_id', $moduleIds)
                ->shared()
                ->where('status', 'published')
                ->whereHas('slides')
                ->firstOrFail()
            : null;

        if ($selectedDeck?->week_slot === 'after_day') {
            abort_unless(
                ProgresHariModul::query()
                    ->where('user_id', $user->id)
                    ->where('module_day_id', $selectedDeck->module_day_id)
                    ->whereNotNull('completed_at')
                    ->exists(),
                403,
                'Selesaikan Day terkait untuk membuka presentasi ini.'
            );
        }

        if ($selectedSlot === 'closing' || $selectedDeck?->week_slot === 'closing') {
            abort_unless(
                $user->progress()
                    ->where('module_id', $selectedDeck?->module_id ?? $selectedModuleId)
                    ->whereNotNull('completed_at')
                    ->exists(),
                403,
                'Selesaikan ujian Mingguan untuk membuka presentasi penutup.'
            );
        }

        $decks = DeckPresentasi::with(['module:id,title,week_number', 'slides'])
            ->withCount('slides')
            ->whereIn('module_id', $selectedDeck ? collect([$selectedDeck->module_id]) : $queryModuleIds)
            ->shared()
            ->when($selectedDeck, fn ($query) => $query->whereKey($selectedDeck->id))
            ->when(! $selectedDeck && $selectedDayId, fn ($query) => $query->where('module_day_id', $selectedDayId))
            ->when(! $selectedDeck && $selectedModuleId && ! $selectedDayId && $selectedSlot === '', fn ($query) => $query->whereNull('module_day_id'))
            ->when(! $selectedDeck && $selectedSlot !== '', fn ($query) => $query->where('week_slot', $selectedSlot))
            ->where('status', 'published')
            ->orderBy('module_id')
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get()
            ->map(function (DeckPresentasi $deck) {
                return [
                    'id' => $deck->id,
                    'title' => $deck->title,
                    'description' => $deck->description,
                    'module' => $deck->module ? [
                        'id' => $deck->module->id,
                        'title' => $deck->module->title,
                        'week_number' => $deck->module->week_number,
                    ] : null,
                    'slides_count' => $deck->slides_count,
                    'source_file_url' => $deck->finalPdfPath()
                        ? route('presentations.pdf.content', $deck, false)
                        : null,
                    'slides' => $deck->slides->map(function ($slide) {
                        $meta = $slide->source_meta ?? [];
                        $canvas = $slide->canvas_json ?? [];

                        return [
                            'id' => $slide->id,
                            'title' => $slide->title,
                            'layout' => $slide->layout,
                            'content' => $slide->content,
                            'media_url' => $slide->media_url,
                            'background' => $slide->background,
                            'accent_color' => $slide->accent_color,
                            'order' => $slide->order,
                            'jamboard_snapshot' => $slide->jamboard_snapshot,
                            'snapshot_url' => $slide->snapshot_url,
                            'canvas_width' => $meta['canvas_width'] ?? $meta['width'] ?? $canvas['width'] ?? null,
                            'canvas_height' => $meta['canvas_height'] ?? $meta['height'] ?? $canvas['height'] ?? null,
                        ];
                    })->values(),
                ];
            })
            ->values();

        return Inertia::render('User/Presentasi/PresentasiPage', [
            'program' => [
                'title' => $program->title,
                'slug' => $program->slug,
                'level' => $program->level?->level_name,
                'roadmap_url' => route('user.modul.program', $program->slug),
            ],
            'modules' => $program->modules()
                ->whereIn('id', $moduleIds)
                ->orderBy('week_number')
                ->get(['id', 'title', 'week_number']),
            'selected_module_id' => $selectedModuleId,
            'selected_day_id' => $selectedDayId,
            'decks' => $decks,
        ]);
    }

    public function lesson($weekId, AksesPremiumService $aksesPremium)
    {
        $user = Auth::user();
        $modul = Modul::where('status', 'published')->findOrFail($weekId);

        abort_unless($aksesPremium->bolehAksesModul($user, $modul), 403);

        $modul->loadMissing('programPembelajaran');

        return redirect()
            ->to($modul->programPembelajaran
                ? route('user.modul.program', $modul->programPembelajaran->slug)
                : route('user.kelas.index'))
            ->with('info', 'Latihan flashcard mandiri sudah dipindahkan ke dalam kuis Day.');
    }

    public function quiz(
        $weekId,
        AksesPremiumService $aksesPremium,
        PembelajaranPenggunaService $learning,
        AksesKuisPenggunaService $aksesKuis
    ) {
        $user = Auth::user();
        $modul = Modul::where('status', 'published')->findOrFail($weekId);

        abort_unless($aksesPremium->bolehAksesModul($user, $modul), 403);

        $quiz = $this->firstQuizFor($modul, $user->id, true);

        abort_unless($quiz, 404, 'Kuis modul belum tersedia.');

        if ($redirect = $aksesKuis->redirectJikaTerkunci($user, $quiz)) {
            return $redirect;
        }

        $payload = $learning->quizPayload($user, $quiz);

        $isWeeklyExam = (bool) data_get($payload, 'quiz.is_weekly_exam');

        return Inertia::render($isWeeklyExam ? 'User/Ujian/KerjakanUjian' : 'User/Kuis/KerjakanKuis', $payload + [
            'module_flow' => true,
            'back_url' => $modul->programPembelajaran
                ? route('user.modul.program', $modul->programPembelajaran->slug)
                : route('user.kelas.index'),
            'finish_url' => $modul->programPembelajaran
                ? route('user.modul.program', $modul->programPembelajaran->slug)
                : route('user.kelas.index'),
        ]);
    }

    public function checkQuestion(Request $request, Soal $question, AksesKuisPenggunaService $aksesKuis, PenilaianJawabanKuisService $penilaian)
    {
        $question->load('quiz.module');

        abort_unless($question->quiz?->status === 'published', 404);
        $aksesKuis->abortJikaTerkunci($request->user(), $question->quiz);

        if ($question->type === 'handwriting') {
            $validated = $request->validate([
                'answer' => ['nullable', 'string', 'max:4'],
                'answer_payload' => ['required', 'array'],
                'answer_payload.completed_strokes' => ['required', 'integer', 'min:0', 'max:100'],
                'answer_payload.total_strokes' => ['required', 'integer', 'min:1', 'max:100'],
                'answer_payload.attempts_by_stroke' => ['nullable', 'array', 'max:100'],
                'answer_payload.mistakes' => ['required', 'integer', 'min:0', 'max:10000'],
                'answer_payload.hints_used' => ['required', 'integer', 'min:0', 'max:10000'],
                'answer_payload.duration_ms' => ['required', 'integer', 'min:0', 'max:86400000'],
                'answer_payload.revealed' => ['required', 'boolean'],
            ]);
            $payload = $validated['answer_payload'];
            $mastered = $penilaian->benar($question, $validated['answer'] ?? null, $payload);

            return response()->json([
                'is_correct' => $mastered,
                'practice_only' => true,
                'mastery_status' => $mastered ? 'review' : 'learning',
                'message' => $mastered
                    ? 'Urutan stroke selesai. Latihan masuk progres repetisi.'
                    : 'Panduan membantu menyelesaikan karakter. Latihan dicatat untuk diulang.',
                'explanation' => $question->explanation,
                'explanation_reading' => $question->explanation_reading,
            ]);
        }

        $validated = $request->validate([
            'answer' => ['required', 'string', 'max:2000'],
            'answer_payload' => ['nullable', 'array'],
        ]);

        return response()->json([
            'is_correct' => $penilaian->jawabanSama($validated['answer'], (string) $question->correct_answer),
            'practice_only' => false,
            'explanation' => $question->explanation,
            'explanation_reading' => $question->explanation_reading,
        ]);
    }

    private function firstFlashcardSetFor(Modul $modul): ?SetFlashcard
    {
        return SetFlashcard::where('module_id', $modul->id)
            ->where('status', 'published')
            ->whereHas('flashcards')
            ->orderBy('id')
            ->first();
    }

    private function firstQuizFor(Modul $modul, int $userId, bool $withQuestions = false): ?Kuis
    {
        $query = Kuis::query()
            ->where('module_id', $modul->id)
            ->whereNull('module_day_id')
            ->whereNotNull('exam_order')
            ->where('status', 'published')
            ->whereHas('questions')
            ->with(['attempts' => fn ($attemptQuery) => $attemptQuery
                ->where('user_id', $userId)
                ->where('status', 'completed')])
            ->orderBy('exam_order')
            ->orderBy('id');

        if ($withQuestions) {
            $query->with(['questions' => fn ($query) => $query->orderBy('order')]);
        }

        $exams = $query->get();

        return $exams->first(
            fn (Kuis $exam) => ! $this->quizStats($userId, $exam)['done']
        ) ?? $exams->first();
    }

    private function flashcardStats(int $userId, ?SetFlashcard $flashcardSet): array
    {
        if (! $flashcardSet) {
            return ['total' => 0, 'reviewed' => 0];
        }

        $cardIds = Flashcard::where('flashcard_set_id', $flashcardSet->id)->pluck('id');

        return [
            'total' => $cardIds->count(),
            'reviewed' => ReviewFlashcard::where('user_id', $userId)
                ->where('skill', 'recognition')
                ->whereIn('flashcard_id', $cardIds)
                ->count(),
        ];
    }

    private function quizStats(int $userId, ?Kuis $quiz): array
    {
        if (! $quiz) {
            return ['done' => false, 'best_score' => null];
        }

        $bestScore = $quiz->relationLoaded('attempts')
            ? $quiz->attempts->max('score')
            : PengerjaanKuis::where('user_id', $userId)
                ->where('quiz_id', $quiz->id)
                ->where('status', 'completed')
                ->max('score');

        return [
            'done' => $bestScore !== null && (int) $bestScore >= (int) ($quiz->passing_score ?? 70),
            'best_score' => $bestScore,
        ];
    }

    private function accessibleModuleIdsForProgram(
        ProgramPembelajaran $program,
        $user,
        AksesPremiumService $aksesPremium,
        ProgresRoadmapService $progresRoadmap
    ) {
        return $program->modules()
            ->where('status', 'published')
            ->get()
            ->filter(fn (Modul $modul) => $aksesPremium->bolehAksesModul($user, $modul)
                && $progresRoadmap->statusAksesModul($user, $modul)['allowed'])
            ->pluck('id');
    }

    private function selectedAccessibleDayId(
        Request $request,
        $moduleIds,
        $user,
        ProgresRoadmapService $progresRoadmap
    ): ?int {
        if (! $request->filled('day')) {
            return null;
        }

        $day = HariModul::query()
            ->whereKey($request->integer('day'))
            ->where('status', 'published')
            ->whereIn('module_id', $moduleIds)
            ->firstOrFail();

        $access = $progresRoadmap->statusAksesHari($user, $day);
        abort_unless($access['allowed'], 403, $access['message']);

        return $day->id;
    }

    private function selectedAccessibleModuleId(Request $request, $moduleIds): ?int
    {
        $module = $request->input('module');

        if ($module === null || $module === '' || $module === 'all') {
            return null;
        }

        if (! is_scalar($module) || ! ctype_digit((string) $module) || (int) $module < 1) {
            return null;
        }

        $moduleId = (int) $module;

        abort_unless($moduleIds->contains($moduleId), 403, 'Selesaikan Minggu sebelumnya terlebih dahulu.');

        return $moduleId;
    }

    private function vocabularyQueryForModules($moduleIds)
    {
        return Kosakata::query()
            ->select('vocabulary_bank.*')
            ->where('status', 'published')
            ->where(function ($query) use ($moduleIds) {
                $query->whereIn('module_id', $moduleIds)
                    ->orWhereHas('days', fn ($dayQuery) => $dayQuery->whereIn('module_id', $moduleIds))
                    ->orWhereHas('flashcards.set', fn ($query) => $query
                        ->whereIn('module_id', $moduleIds)
                        ->where('status', 'published'));
            })
            ->distinct();
    }
}
