<?php

namespace App\Services;

use App\Models\DokkaiAttemptAnswer;
use App\Models\HariModul;
use App\Models\JawabanPengerjaanKuis;
use App\Models\Kuis;
use App\Models\LogReward;
use App\Models\Modul;
use App\Models\PengerjaanKuis;
use App\Models\Pengguna;
use App\Models\ProgramPembelajaran;
use App\Models\Progres;
use App\Models\ReviewSoal;
use App\Models\Soal;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class RingkasanProgresPenggunaService
{
    public function summary(Pengguna $user): array
    {
        return Cache::remember(
            $this->cacheKey($user),
            now()->addSeconds(45),
            fn () => $this->buildSummary($user)
        );
    }

    public function forget(Pengguna $user): void
    {
        Cache::forget($this->cacheKey($user));
    }

    private function buildSummary(Pengguna $user): array
    {
        $completedModuleIds = Progres::where('user_id', $user->id)
            ->whereNotNull('completed_at')
            ->distinct()
            ->pluck('module_id')
            ->all();
        $attemptedQuizIds = PengerjaanKuis::where('user_id', $user->id)->distinct()->pluck('quiz_id')->all();
        $modulesDone = count($completedModuleIds);
        $quizzesDone = count($attemptedQuizIds);
        $completedModules = empty($completedModuleIds)
            ? collect()
            : Modul::whereIn('id', $completedModuleIds)->get(['id', 'title']);
        $completedQuizzes = empty($attemptedQuizIds)
            ? collect()
            : Kuis::with('module:id,title')->whereIn('id', $attemptedQuizIds)->get(['id', 'module_id', 'type']);

        $learningJourneys = $this->learningJourneys($user, $completedModuleIds)->values()->all();

        return [
            'stats' => [
                'xp' => (int) $user->xp,
                'streak' => (int) $user->streak_count,
                'lessonsDone' => $modulesDone,
                'quizzesDone' => $quizzesDone,
            ],
            'weekActivity' => $this->weekActivity($user)->values()->all(),
            'learningJourneys' => $learningJourneys,
            'jlptJourney' => $learningJourneys,
            'recentActivity' => $this->recentActivity($user)->values()->all(),
            'skills' => $this->topicActivity($modulesDone, $quizzesDone, $completedModules, $completedQuizzes),
            'category_cards' => $this->categoryCards($user, $modulesDone, $quizzesDone),
            'next_learning' => $this->nextLearning($user, $completedModuleIds),
        ];
    }

    private function cacheKey(Pengguna $user): string
    {
        return "user-progress-summary:v8:{$user->id}";
    }

    private function weekActivity(Pengguna $user): Collection
    {
        $start = now()->subDays(6)->startOfDay();
        $end = now()->endOfDay();
        $xpByDate = LogReward::where('user_id', $user->id)
            ->whereBetween('created_at', [$start, $end])
            ->selectRaw('DATE(created_at) as activity_date, SUM(xp_amount) as total_xp')
            ->groupByRaw('DATE(created_at)')
            ->pluck('total_xp', 'activity_date');

        $today = now();
        $days = collect(range(6, 1))
            ->map(fn ($daysAgo) => now()->subDays($daysAgo))
            ->push($today)
            ->map(function ($date, $index) use ($xpByDate) {
                $key = $date->toDateString();
                $xp = (int) ($xpByDate[$key] ?? 0);

                return [
                    'day' => $date->translatedFormat('D'),
                    'xp' => $xp,
                    'today' => $index === 6,
                ];
            });

        $peakXp = max(1, (int) $days->max('xp'));

        return $days->map(fn (array $day) => [
            ...$day,
            'height' => $day['xp'] > 0 ? min(100, max(10, ($day['xp'] / $peakXp) * 100)).'%' : '0%',
        ]);
    }

    private function learningJourneys(Pengguna $user, array $completedModuleIds): Collection
    {
        $completed = array_flip($completedModuleIds);
        $access = app(AksesPremiumService::class);

        return ProgramPembelajaran::query()
            ->with([
                'curriculumTrack:id,code,name',
                'level:id,level_name',
                'modules' => fn ($query) => $query->where('status', 'published')->select(['id', 'program_pembelajaran_id']),
            ])
            ->where('status', 'published')
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get()
            ->filter(fn (ProgramPembelajaran $program) => $access->punyaAksesKelas($user, $program->id))
            ->map(function (ProgramPembelajaran $program) use ($completed) {
                $moduleIds = $program->modules->pluck('id');
                $totalModules = $moduleIds->count();
                $completedCount = $moduleIds->filter(fn ($id) => isset($completed[$id]))->count();
                $pct = $totalModules > 0 ? round(($completedCount / $totalModules) * 100) : 0;

                return [
                    'program' => $program->title,
                    'level' => $program->level?->level_name,
                    'curriculum' => $program->curriculumTrack?->name,
                    'label' => trim(implode(' ', array_filter([
                        $program->curriculumTrack?->name,
                        $program->level?->level_name,
                    ]))) ?: $program->title,
                    'pct' => $pct,
                    'done' => $pct === 100 && $totalModules > 0,
                ];
            })
            ->values();
    }

    private function recentActivity(Pengguna $user): Collection
    {
        return LogReward::where('user_id', $user->id)
            ->latest()
            ->take(5)
            ->get()
            ->map(fn (LogReward $log) => [
                'text' => $log->description,
                'xp' => (int) $log->xp_amount,
                'time' => $log->created_at->diffForHumans(),
                'type' => $log->source_type,
            ]);
    }

    private function nextLearning(Pengguna $user, array $completedModuleIds): ?array
    {
        $access = app(AksesPremiumService::class);
        $kloterBelajar = app(KloterBelajarService::class);
        $completed = array_flip($completedModuleIds);

        $programs = ProgramPembelajaran::query()
            ->with(['modules' => fn ($query) => $query
                ->where('status', 'published')
                ->orderBy('week_number')
                ->orderBy('id')])
            ->where('status', 'published')
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get()
            ->filter(fn (ProgramPembelajaran $program) => $access->punyaAksesKelas($user, $program->id));

        foreach ($programs as $program) {
            $roadmapUrl = route('user.modul.program', $program->slug);
            $kloter = $kloterBelajar->kloterAktifUser($user, $program->id);

            if (! $kloter) {
                return [
                    'state' => 'waiting',
                    'title' => $program->title,
                    'message' => 'Kelas aktif, menunggu penempatan kloter belajar.',
                    'url' => $roadmapUrl,
                    'action_label' => 'Lihat roadmap',
                ];
            }

            $module = $program->modules
                ->filter(fn (Modul $item) => $access->bolehAksesModul($user, $item))
                ->first(fn (Modul $item) => ! isset($completed[$item->id]));

            if ($module) {
                return [
                    'state' => 'ready',
                    'title' => $module->title,
                    'program_title' => $program->title,
                    'week_number' => $module->week_number,
                    'message' => 'Lanjutkan dari modul yang tersedia berikutnya.',
                    'url' => $roadmapUrl,
                    'action_label' => 'Lanjutkan roadmap',
                ];
            }
        }

        return null;
    }

    private function topicActivity(int $modulesDone, int $quizzesDone, Collection $modules, Collection $quizzes): array
    {
        $vocabCount = ($modulesDone * 8) + ($quizzesDone * 5);
        $grammarCount = ($modulesDone * 6) + ($quizzesDone * 5);
        $readCount = ($modulesDone * 4) + ($quizzesDone * 3);

        $vocabCount += $modules->filter(fn ($module) => $this->titleContains($module->title, ['vocab', 'kosakata', 'kanji']))->count() * 15;
        $grammarCount += $modules->filter(fn ($module) => $this->titleContains($module->title, ['grammar', 'partikel', 'pola', 'bunpo']))->count() * 15;
        $readCount += $modules->filter(fn ($module) => $this->titleContains($module->title, ['read', 'baca', 'dokkai']))->count() * 15;

        $vocabCount += $quizzes->filter(fn ($quiz) => $this->titleContains($this->quizSkillText($quiz), ['vocab', 'kosakata', 'kanji']))->count() * 10;
        $grammarCount += $quizzes->filter(fn ($quiz) => $this->titleContains($this->quizSkillText($quiz), ['grammar', 'partikel']))->count() * 10;
        $readCount += $quizzes->filter(fn ($quiz) => $this->titleContains($this->quizSkillText($quiz), ['dokkai', 'baca']))->count() * 10;

        return [
            ['label' => 'Kosakata & Kanji', 'value' => min(100, $vocabCount), 'color' => 'bg-sky-500'],
            ['label' => 'Tata Bahasa (Bunpo)', 'value' => min(100, $grammarCount), 'color' => 'bg-emerald-500'],
            ['label' => 'Pemahaman Bacaan (Dokkai)', 'value' => min(100, $readCount), 'color' => 'bg-amber-500'],
        ];
    }

    private function titleContains(string $title, array $needles): bool
    {
        foreach ($needles as $needle) {
            if (stripos($title, $needle) !== false) {
                return true;
            }
        }

        return false;
    }

    private function quizSkillText(Kuis $quiz): string
    {
        return trim($quiz->type.' '.($quiz->module?->title ?? ''));
    }

    private function categoryCards(Pengguna $user, int $modulesDone, int $quizzesDone): array
    {
        // 1. Ambil ID Soal biasa yang pernah gagal dijawab (dari ReviewSoal dan JawabanPengerjaanKuis)
        $failedSoalFromReviews = ReviewSoal::query()
            ->where('user_id', $user->id)
            ->where(function ($q) {
                $q->where('wrong_count', '>', 0)
                    ->orWhere('last_result', 'incorrect')
                    ->orWhere('last_result', 'wrong');
            })
            ->pluck('question_id')
            ->all();

        $failedSoalFromAnswers = JawabanPengerjaanKuis::query()
            ->whereHas('attempt', fn ($q) => $q->where('user_id', $user->id))
            ->where('is_correct', false)
            ->pluck('question_id')
            ->all();

        $allFailedSoalIds = array_values(array_unique(array_merge($failedSoalFromReviews, $failedSoalFromAnswers)));

        // 2. Ambil soal Dokkai yang pernah salah dijawab
        $failedDokkaiQuestions = DokkaiAttemptAnswer::query()
            ->whereHas('attempt', fn ($q) => $q->where('user_id', $user->id))
            ->where('is_correct', false)
            ->with('question.passage:id,title')
            ->latest('id')
            ->get()
            ->pluck('question')
            ->filter()
            ->unique('id')
            ->values();

        $failedDokkaiCount = $failedDokkaiQuestions->count();

        // 3. Ambil soal Tata Bahasa (Bunpo) yang pernah salah
        $failedGrammarQuestions = empty($allFailedSoalIds) ? collect() : Soal::query()
            ->whereIn('id', $allFailedSoalIds)
            ->whereHas('quiz', fn ($q) => $q->where('type', 'grammar'))
            ->latest('id')
            ->get(['id', 'question_text', 'question_reading']);

        $failedGrammarCount = $failedGrammarQuestions->count();

        // 4. Ambil soal Kosakata & Kanji yang pernah salah
        $failedKosakataQuestions = empty($allFailedSoalIds) ? collect() : Soal::query()
            ->whereIn('id', $allFailedSoalIds)
            ->whereHas('quiz', fn ($q) => $q->where('type', '!=', 'grammar'))
            ->latest('id')
            ->get(['id', 'question_text', 'question_reading']);

        $failedKosakataCount = $failedKosakataQuestions->count();

        // 5. Hitung tingkat akurasi / penguasaan riil dari riwayat jawaban pengguna
        $vocabStats = JawabanPengerjaanKuis::query()
            ->whereHas('attempt', fn ($q) => $q->where('user_id', $user->id))
            ->whereHas('question.quiz', fn ($q) => $q->where('type', '!=', 'grammar'))
            ->selectRaw('COUNT(*) as total, SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) as correct')
            ->first();
        $vocabTotal = (int) ($vocabStats?->total ?? 0);
        $vocabCorrect = (int) ($vocabStats?->correct ?? 0);
        $vocabPct = $vocabTotal > 0
            ? (int) round(($vocabCorrect / $vocabTotal) * 100)
            : ($failedKosakataCount > 0 ? max(20, 100 - ($failedKosakataCount * 10)) : 100);

        $grammarStats = JawabanPengerjaanKuis::query()
            ->whereHas('attempt', fn ($q) => $q->where('user_id', $user->id))
            ->whereHas('question.quiz', fn ($q) => $q->where('type', 'grammar'))
            ->selectRaw('COUNT(*) as total, SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) as correct')
            ->first();
        $grammarTotal = (int) ($grammarStats?->total ?? 0);
        $grammarCorrect = (int) ($grammarStats?->correct ?? 0);
        $grammarPct = $grammarTotal > 0
            ? (int) round(($grammarCorrect / $grammarTotal) * 100)
            : ($failedGrammarCount > 0 ? max(20, 100 - ($failedGrammarCount * 10)) : 100);

        $dokkaiStats = DokkaiAttemptAnswer::query()
            ->whereHas('attempt', fn ($q) => $q->where('user_id', $user->id))
            ->selectRaw('COUNT(*) as total, SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) as correct')
            ->first();
        $dokkaiTotal = (int) ($dokkaiStats?->total ?? 0);
        $dokkaiCorrect = (int) ($dokkaiStats?->correct ?? 0);
        $dokkaiPct = $dokkaiTotal > 0
            ? (int) round(($dokkaiCorrect / $dokkaiTotal) * 100)
            : ($failedDokkaiCount > 0 ? max(20, 100 - ($failedDokkaiCount * 10)) : 100);

        // Helper untuk memformat cuplikan butir soal kelemahan riil
        $buildWeakspots = function ($questions, string $defaultTitle) {
            if ($questions->isEmpty()) {
                return [
                    ['title' => $defaultTitle, 'is_cleared' => true],
                ];
            }

            return $questions->take(3)->map(function ($item) {
                $text = $item->question_text ?? ($item->passage?->title ?? 'Soal Latihan');

                return [
                    'title' => Str::limit(strip_tags((string) $text), 50),
                    'is_cleared' => false,
                ];
            })->values()->all();
        };

        return [
            [
                'id' => 'vocab',
                'title' => 'Kosakata & Kanji',
                'kanji_char' => '語',
                'pct' => $vocabPct,
                'theme' => 'sky',
                'color' => '#0284c7',
                'quiz_url' => route('user.weakspot.show', ['category' => 'vocab']),
                'failed_count' => $failedKosakataCount,
                'has_weakspot' => $failedKosakataCount > 0,
                'weakspots' => $buildWeakspots($failedKosakataQuestions, 'Semua kosakata terkuasai dengan baik'),
                'focus' => 'Fokus: perkuat hafalan kosakata dan kanji yang pernah keliru.',
            ],
            [
                'id' => 'grammar',
                'title' => 'Tata Bahasa (Bunpo)',
                'kanji_char' => '文',
                'pct' => $grammarPct,
                'theme' => 'emerald',
                'color' => '#10b981',
                'quiz_url' => route('user.weakspot.show', ['category' => 'grammar']),
                'failed_count' => $failedGrammarCount,
                'has_weakspot' => $failedGrammarCount > 0,
                'weakspots' => $buildWeakspots($failedGrammarQuestions, 'Pola kalimat tuntas dikuasai'),
                'focus' => 'Fokus: latih pemahaman pola kalimat, partikel, dan susunan kata.',
            ],
            [
                'id' => 'dokkai',
                'title' => 'Pemahaman Bacaan (Dokkai)',
                'kanji_char' => '読',
                'pct' => $dokkaiPct,
                'theme' => 'amber',
                'color' => '#f59e0b',
                'quiz_url' => route('user.weakspot.show', ['category' => 'dokkai']),
                'failed_count' => $failedDokkaiCount,
                'has_weakspot' => $failedDokkaiCount > 0,
                'weakspots' => $buildWeakspots($failedDokkaiQuestions, 'Pemahaman wacana tuntas dikuasai'),
                'focus' => 'Fokus: asah kemampuan membaca cepat dan analisis informasi wacana.',
            ],
        ];
    }
}
