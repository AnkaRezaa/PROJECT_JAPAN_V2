<?php

namespace App\Services;

use App\Events\KuisSelesai;
use App\Models\DokkaiAttemptAnswer;
use App\Models\DokkaiQuestion;
use App\Models\HariModul;
use App\Models\JawabanPengerjaanKuis;
use App\Models\Kuis;
use App\Models\LogReward;
use App\Models\PengerjaanKuis;
use App\Models\Pengguna;
use App\Models\ProgramPembelajaran;
use App\Models\ReviewSoal;
use App\Models\Soal;
use App\Services\AksesKuisPenggunaService;
use App\Services\AksesPremiumService;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class KuisCampuranService
{
    public function __construct(
        private readonly RingkasanProgresPenggunaService $summaryService,
        private readonly RepetisiPembelajaranService $repetisiService,
        private readonly AksesKuisPenggunaService $aksesKuis,
        private readonly AksesPremiumService $aksesPremium
    ) {}

    public function generatePayload(HariModul $day, Pengguna $user): array
    {
        $quiz = $day->checkpointQuiz ?? $day->quizzes()->where('status', 'published')->first();
        abort_unless($quiz, 404, 'Kuis untuk hari ini belum tersedia.');

        $weakspotIds = ReviewSoal::query()
            ->where('user_id', $user->id)
            ->where('wrong_count', '>', 0)
            ->pluck('question_id')
            ->flip()
            ->all();

        // 1. Ambil Pool ID Dokkai
        $dokkaiPool = DokkaiQuestion::query()
            ->whereHas('passage.quiz', fn ($q) => $q->where('module_day_id', $day->id)->where('status', 'published'))
            ->pluck('id')
            ->all();
        $sampledDokkaiIds = $this->sampleWeightedIds($dokkaiPool, 3);

        // 2. Ambil Pool ID Bunpo
        $bunpoPool = Soal::query()
            ->whereHas('quiz', fn ($q) => $q->where('module_day_id', $day->id)->where('type', 'grammar')->where('status', 'published'))
            ->pluck('id')
            ->all();
        $sampledBunpoIds = $this->sampleWeightedIds($bunpoPool, 3, $weakspotIds);

        // 3. Fallback kuota ke Kosakata
        $targetKosakata = 10 - (count($sampledDokkaiIds) + count($sampledBunpoIds));
        $kosakataPool = Soal::query()
            ->whereHas('quiz', fn ($q) => $q->where('module_day_id', $day->id)->where('type', '!=', 'grammar')->where('status', 'published'))
            ->pluck('id')
            ->all();
        $sampledKosakataIds = $this->sampleWeightedIds($kosakataPool, $targetKosakata, $weakspotIds);

        // 4. Cross-Day Backfill jika total masih < 10 butir
        $currentTotal = count($sampledDokkaiIds) + count($sampledBunpoIds) + count($sampledKosakataIds);
        if ($currentTotal < 10 && $day->module_id) {
            $defisit = 10 - $currentTotal;
            $backfillPool = Soal::query()
                ->whereHas('quiz', fn ($q) => $q->where('module_id', $day->module_id)->where('status', 'published'))
                ->whereNotIn('id', array_merge($sampledKosakataIds, $sampledBunpoIds))
                ->pluck('id')
                ->all();
            $backfillIds = $this->sampleWeightedIds($backfillPool, $defisit, $weakspotIds);
            $sampledKosakataIds = array_merge($sampledKosakataIds, $backfillIds);
        }

        // 5. Hydrate Soal & Normalisasi Kontrak (Single-Query Preload)
        $soalPool = Soal::query()
            ->whereIn('id', array_merge($sampledKosakataIds, $sampledBunpoIds))
            ->get()
            ->keyBy('id');

        $kosakataItems = collect($sampledKosakataIds)
            ->map(fn ($id) => isset($soalPool[$id]) ? $this->normalizeSoal($soalPool[$id], 'kosakata', 'Kosakata') : null)
            ->filter()
            ->values()
            ->all();

        $bunpoItems = collect($sampledBunpoIds)
            ->map(fn ($id) => isset($soalPool[$id]) ? $this->normalizeSoal($soalPool[$id], 'bunpo', 'Bunpo') : null)
            ->filter()
            ->values()
            ->all();

        $dokkaiItems = DokkaiQuestion::query()
            ->whereIn('id', $sampledDokkaiIds)
            ->with(['passage.paragraphs:id,dokkai_passage_id,paragraph_number,content_raw', 'evidenceParagraph'])
            ->get()
            ->map(fn (DokkaiQuestion $d) => $this->normalizeDokkai($d))
            ->all();

        // 6. Algoritma Interleaved Cognitive Sequencing
        $sequencedQuestions = $this->interleaveQuestions($kosakataItems, $bunpoItems, $dokkaiItems);

        return [
            'quiz_id' => $quiz->id,
            'day_id' => $day->id,
            'day_number' => $day->day_number,
            'title' => "Kuis Campuran: {$day->title}",
            'module_title' => $day->module?->title ?? 'Modul Harian',
            'time_limit' => $quiz->time_limit ?? 600,
            'session_token' => (string) Str::uuid(),
            'total_questions' => count($sequencedQuestions),
            'questions' => $sequencedQuestions,
        ];
    }

    public function submitAttempt(HariModul $day, Pengguna $user, array $data): array
    {
        $quiz = $day->checkpointQuiz ?? $day->quizzes()->firstOrFail();
        $submissionToken = $data['submission_token'] ?? (string) Str::uuid();

        return DB::transaction(function () use ($user, $quiz, $data, $submissionToken, $day) {
            $existing = PengerjaanKuis::where('user_id', $user->id)
                ->where('quiz_id', $quiz->id)
                ->where('submission_token', $submissionToken)
                ->first();

            if ($existing) {
                return [
                    'score' => $existing->score,
                    'xp_earned' => $existing->xp_earned,
                    'passed' => $existing->score >= ($quiz->passing_score ?? 70),
                    'idempotent' => true,
                ];
            }

            $submittedAnswers = collect($data['answers'] ?? []);
            $evaluated = $this->evaluateAnswers($submittedAnswers, $day->module_id, $user->id);

            $score = $evaluated['score'];
            $passed = $score >= ($quiz->passing_score ?? 70);

            $attempt = PengerjaanKuis::create([
                'user_id' => $user->id,
                'quiz_id' => $quiz->id,
                'submission_token' => $submissionToken,
                'status' => 'completed',
                'score' => $score,
                'xp_earned' => 0,
                'started_at' => now(),
                'completed_at' => now(),
                'attempted_at' => now(),
            ]);

            // Simpan detail jawaban
            foreach ($evaluated['details'] as $item) {
                if ($item['source_type'] === 'dokkai') {
                    DokkaiAttemptAnswer::create([
                        'attempt_id' => $attempt->id,
                        'dokkai_question_id' => $item['raw_id'],
                        'selected_option' => mb_substr((string) ($item['user_answer'] ?? ''), 0, 5),
                        'is_correct' => $item['is_correct'],
                    ]);
                } else {
                    JawabanPengerjaanKuis::create([
                        'attempt_id' => $attempt->id,
                        'question_id' => $item['raw_id'],
                        'answer_text' => $item['user_answer'],
                        'is_correct' => $item['is_correct'],
                        'earned_points' => $item['is_correct'] ? 1 : 0,
                    ]);
                }
            }

            // Gamifikasi & Anti-Farming Policy
            $xpEarned = 0;
            if ($passed) {
                $todayAttemptsCount = PengerjaanKuis::where('user_id', $user->id)
                    ->where('quiz_id', $quiz->id)
                    ->whereDate('created_at', now()->toDateString())
                    ->count();

                // Sesi pertama hari ini = 30 XP, sesi pengulangan = 5 XP
                $xpEarned = ($todayAttemptsCount <= 1) ? 30 : 5;

                $user->increment('xp', $xpEarned);
                LogReward::create([
                    'user_id' => $user->id,
                    'source_type' => 'quiz',
                    'source_id' => $quiz->id,
                    'xp_amount' => $xpEarned,
                    'description' => "Menyelesaikan Kuis Campuran: {$quiz->id}",
                ]);

                $attempt->update(['xp_earned' => $xpEarned]);
            }

            event(new KuisSelesai($user, $quiz->id, $score, $xpEarned));
            $this->summaryService->forget($user);

            return [
                'score' => $score,
                'passed' => $passed,
                'xp_earned' => $xpEarned,
                'attempt_id' => $attempt->id,
                'correct_count' => $evaluated['correct_count'],
                'total_questions' => $evaluated['total_questions'],
                'details' => $evaluated['details'],
                'breakdown' => $evaluated['breakdown'],
                'weakspot_category' => $evaluated['weakspot_category'],
            ];
        });
    }

    public function generateWeakspotPayload(Pengguna $user, ?string $category = null): array
    {
        // 1. Ambil ID Soal biasa yang pernah salah (dari ReviewSoal dan JawabanPengerjaanKuis)
        $fromReviews = ReviewSoal::query()
            ->where('user_id', $user->id)
            ->where(function ($q) {
                $q->where('wrong_count', '>', 0)
                    ->orWhere('last_result', 'incorrect')
                    ->orWhere('last_result', 'wrong');
            })
            ->pluck('question_id')
            ->all();

        $fromAnswers = JawabanPengerjaanKuis::query()
            ->whereHas('attempt', fn ($q) => $q->where('user_id', $user->id))
            ->where('is_correct', false)
            ->pluck('question_id')
            ->all();

        $allFailedSoalIds = array_values(array_unique(array_merge($fromReviews, $fromAnswers)));

        // 2. Ambil ID Dokkai yang pernah salah
        $failedDokkaiIds = DokkaiAttemptAnswer::query()
            ->whereHas('attempt', fn ($q) => $q->where('user_id', $user->id))
            ->where('is_correct', false)
            ->pluck('dokkai_question_id')
            ->unique()
            ->values()
            ->all();

        $kosakataItems = [];
        $bunpoItems = [];
        $dokkaiItems = [];

        $normCategory = $category ? strtolower(trim($category)) : null;

        // Ambil Dokkai jika category 'dokkai' / 'reading' atau tanpa category
        if ((! $normCategory || in_array($normCategory, ['dokkai', 'reading'])) && ! empty($failedDokkaiIds)) {
            $dokkaiItems = DokkaiQuestion::query()
                ->whereIn('id', $failedDokkaiIds)
                ->with(['passage.paragraphs:id,dokkai_passage_id,paragraph_number,content_raw', 'evidenceParagraph'])
                ->get()
                ->map(fn (DokkaiQuestion $d) => $this->normalizeDokkai($d))
                ->all();
        }

        // Ambil Bunpo jika category 'grammar' / 'bunpo' atau tanpa category
        if ((! $normCategory || in_array($normCategory, ['grammar', 'bunpo'])) && ! empty($allFailedSoalIds)) {
            $bunpoItems = Soal::query()
                ->whereIn('id', $allFailedSoalIds)
                ->whereHas('quiz', fn ($q) => $q->where('type', 'grammar'))
                ->get()
                ->map(fn (Soal $s) => $this->normalizeSoal($s, 'bunpo', 'Bunpo'))
                ->all();
        }

        // Ambil Kosakata/Kanji jika category 'vocab' / 'kosakata' / 'kanji' atau tanpa category
        if ((! $normCategory || in_array($normCategory, ['vocab', 'kosakata', 'kanji'])) && ! empty($allFailedSoalIds)) {
            $kosakataItems = Soal::query()
                ->whereIn('id', $allFailedSoalIds)
                ->whereHas('quiz', fn ($q) => $q->where('type', '!=', 'grammar'))
                ->get()
                ->map(fn (Soal $s) => $this->normalizeSoal($s, 'kosakata', 'Kosakata'))
                ->all();
        }

        $allFailedQuestions = array_merge($kosakataItems, $bunpoItems, $dokkaiItems);
        $totalFailed = count($allFailedQuestions);

        if ($totalFailed === 0) {
            return [
                'has_weakspot' => false,
                'is_weakspot' => true,
                'category' => $category,
                'title' => 'Kuis Titik Lemah',
                'message' => 'Luar biasa! Belum ada titik lemah yang perlu dilatih. Kuis ini khusus untuk melatih kembali soal-soal yang pernah kamu jawab salah.',
                'total_questions' => 0,
                'questions' => [],
            ];
        }

        // Acak dan batasi maksimal 10 butir soal
        shuffle($allFailedQuestions);
        $selectedQuestions = array_slice($allFailedQuestions, 0, 10);

        // Ambil fallback quiz untuk konteks
        $firstQuestionRawId = $selectedQuestions[0]['raw_id'] ?? null;
        $firstSourceType = $selectedQuestions[0]['source_type'] ?? null;
        $resolvedQuizId = null;

        if ($firstSourceType === 'dokkai' && $firstQuestionRawId) {
            $resolvedQuizId = DokkaiQuestion::find($firstQuestionRawId)?->passage?->quiz_id;
        } elseif ($firstQuestionRawId) {
            $resolvedQuizId = Soal::find($firstQuestionRawId)?->quiz_id;
        }

        $fallbackQuiz = $resolvedQuizId ? Kuis::find($resolvedQuizId) : Kuis::where('status', 'published')->first();

        $categoryLabels = [
            'kanji' => 'Kanji',
            'vocab' => 'Kosakata',
            'kosakata' => 'Kosakata',
            'grammar' => 'Tata Bahasa (Bunpo)',
            'bunpo' => 'Tata Bahasa (Bunpo)',
            'dokkai' => 'Wacana (Dokkai)',
        ];
        $categoryTitle = $normCategory && isset($categoryLabels[$normCategory])
            ? "Kuis Titik Lemah: {$categoryLabels[$normCategory]}"
            : 'Kuis Titik Lemah: Pemulihan Materi';

        return [
            'has_weakspot' => true,
            'is_weakspot' => true,
            'quiz_id' => $fallbackQuiz?->id ?? 1,
            'category' => $normCategory,
            'title' => $categoryTitle,
            'subtitle' => "Melatih kembali {$totalFailed} butir soal yang sebelumnya dijawab salah.",
            'time_limit' => 600,
            'session_token' => (string) Str::uuid(),
            'total_questions' => count($selectedQuestions),
            'questions' => $selectedQuestions,
        ];
    }

    public function submitWeakspotAttempt(Pengguna $user, array $data): array
    {
        $submissionToken = $data['submission_token'] ?? (string) Str::uuid();

        return DB::transaction(function () use ($user, $data, $submissionToken) {
            $existing = PengerjaanKuis::where('user_id', $user->id)
                ->where('submission_token', $submissionToken)
                ->first();

            if ($existing) {
                return [
                    'score' => $existing->score,
                    'xp_earned' => $existing->xp_earned,
                    'passed' => $existing->score >= 70,
                    'idempotent' => true,
                ];
            }

            $submittedAnswers = collect($data['answers'] ?? []);
            $evaluated = $this->evaluateAnswers($submittedAnswers, null);

            $score = $evaluated['score'];
            $passed = $score >= 70;

            // Cari quiz_id fallback
            $fallbackQuiz = Kuis::where('status', 'published')->first();
            $quizId = $fallbackQuiz?->id ?? 1;

            $attempt = PengerjaanKuis::create([
                'user_id' => $user->id,
                'quiz_id' => $quizId,
                'submission_token' => $submissionToken,
                'status' => 'completed',
                'score' => $score,
                'xp_earned' => 0,
                'started_at' => now(),
                'completed_at' => now(),
                'attempted_at' => now(),
            ]);

            // Simpan detail jawaban & perbaiki status remedial tanpa N+1
            $correctSoalIds = collect($evaluated['details'])
                ->where('source_type', '!=', 'dokkai')
                ->where('is_correct', true)
                ->pluck('raw_id')
                ->all();

            $soalMap = ! empty($correctSoalIds) ? Soal::whereIn('id', $correctSoalIds)->get()->keyBy('id') : collect();
            $reviewMap = ! empty($correctSoalIds) ? ReviewSoal::where('user_id', $user->id)->whereIn('question_id', $correctSoalIds)->get()->keyBy('question_id') : collect();

            foreach ($evaluated['details'] as $item) {
                if ($item['source_type'] === 'dokkai') {
                    DokkaiAttemptAnswer::create([
                        'attempt_id' => $attempt->id,
                        'dokkai_question_id' => $item['raw_id'],
                        'selected_option' => mb_substr((string) ($item['user_answer'] ?? ''), 0, 5),
                        'is_correct' => $item['is_correct'],
                    ]);
                } else {
                    JawabanPengerjaanKuis::create([
                        'attempt_id' => $attempt->id,
                        'question_id' => $item['raw_id'],
                        'answer_text' => $item['user_answer'],
                        'is_correct' => $item['is_correct'],
                        'earned_points' => $item['is_correct'] ? 1 : 0,
                    ]);

                    if ($item['is_correct'] && ($soal = $soalMap->get($item['raw_id']))) {
                        $this->repetisiService->catatJawabanSoal($user, $soal, true);
                        if ($review = $reviewMap->get($soal->id)) {
                            $review->update([
                                'wrong_count' => max(0, (int) $review->wrong_count - 1),
                                'last_result' => 'correct',
                            ]);
                        }
                    }
                }
            }

            // Reward pemulihan XP: +20 XP jika lulus
            $xpEarned = 0;
            if ($passed) {
                $xpEarned = 20;
                $user->increment('xp', $xpEarned);
                LogReward::create([
                    'user_id' => $user->id,
                    'source_type' => 'quiz',
                    'source_id' => $quizId,
                    'xp_amount' => $xpEarned,
                    'description' => 'Menyelesaikan Kuis Titik Lemah (Pemulihan Materi)',
                ]);
                $attempt->update(['xp_earned' => $xpEarned]);
            }

            event(new KuisSelesai($user, $quizId, $score, $xpEarned));
            $this->summaryService->forget($user);

            return [
                'score' => $score,
                'passed' => $passed,
                'xp_earned' => $xpEarned,
                'attempt_id' => $attempt->id,
                'correct_count' => $evaluated['correct_count'],
                'total_questions' => $evaluated['total_questions'],
                'breakdown' => $evaluated['breakdown'],
                'weakspot_category' => $evaluated['weakspot_category'],
                'is_weakspot' => true,
            ];
        });
    }

    public function dashboardSummary(Pengguna $user): array
    {
        $allowedQuizzes = Kuis::query()
            ->with(['module.programPembelajaran:id,title'])
            ->where('status', 'published')
            ->whereHas('questions')
            ->whereHas('module', fn ($query) => $query->where('status', 'published'))
            ->get()
            ->filter(fn (Kuis $quiz) => $quiz->module?->program_pembelajaran_id
                && $this->aksesPremium->bolehAksesModul($user, $quiz->module)
                && $this->aksesKuis->status($user, $quiz)['allowed']);

        $programs = $allowedQuizzes
            ->filter(fn (Kuis $quiz) => $quiz->module?->program_pembelajaran_id)
            ->groupBy(fn (Kuis $quiz) => $quiz->module->program_pembelajaran_id)
            ->map(fn (Collection $items) => [
                'id' => (int) $items->first()->module->program_pembelajaran_id,
                'title' => $items->first()->module->programPembelajaran?->title ?? 'Kelas',
            ])
            ->values()
            ->all();

        return [
            'available' => $allowedQuizzes->isNotEmpty(),
            'program_count' => count($programs),
            'programs' => $programs,
            'start_url' => route('user.kuis-campuran.dashboard'),
            'target_count' => 10,
            'xp_reward' => 30,
        ];
    }

    public function generateDashboardPayload(Pengguna $user, ?int $programId = null): array
    {
        $allowedQuizzes = Kuis::query()
            ->with(['module.programPembelajaran:id,title'])
            ->where('status', 'published')
            ->whereHas('module', fn ($query) => $query->where('status', 'published'))
            ->when($programId, fn ($query) => $query->whereHas(
                'module',
                fn ($mQuery) => $mQuery->where('program_pembelajaran_id', $programId)
            ))
            ->get()
            ->filter(fn (Kuis $quiz) => $quiz->module?->program_pembelajaran_id
                && $this->aksesPremium->bolehAksesModul($user, $quiz->module)
                && $this->aksesKuis->status($user, $quiz)['allowed']);

        abort_if($allowedQuizzes->isEmpty(), 404, 'Belum ada materi atau kuis yang terbuka untuk dikerjakan.');

        $allowedQuizIds = $allowedQuizzes->pluck('id')->all();

        $weakspotIds = ReviewSoal::query()
            ->where('user_id', $user->id)
            ->where('wrong_count', '>', 0)
            ->pluck('question_id')
            ->flip()
            ->all();

        // 1. Ambil Pool ID Dokkai
        $dokkaiPool = DokkaiQuestion::query()
            ->whereHas('passage.quiz', fn ($q) => $q->whereIn('id', $allowedQuizIds)->where('status', 'published'))
            ->pluck('id')
            ->all();
        $sampledDokkaiIds = $this->sampleWeightedIds($dokkaiPool, 3);

        // 2. Ambil Pool ID Bunpo
        $bunpoPool = Soal::query()
            ->whereIn('quiz_id', $allowedQuizIds)
            ->whereHas('quiz', fn ($q) => $q->where('type', 'grammar')->where('status', 'published'))
            ->pluck('id')
            ->all();
        $sampledBunpoIds = $this->sampleWeightedIds($bunpoPool, 3, $weakspotIds);

        // 3. Fallback kuota ke Kosakata
        $targetKosakata = 10 - (count($sampledDokkaiIds) + count($sampledBunpoIds));
        $kosakataPool = Soal::query()
            ->whereIn('quiz_id', $allowedQuizIds)
            ->whereHas('quiz', fn ($q) => $q->where('type', '!=', 'grammar')->where('status', 'published'))
            ->pluck('id')
            ->all();
        $sampledKosakataIds = $this->sampleWeightedIds($kosakataPool, $targetKosakata, $weakspotIds);

        // 4. Backfill jika total masih < 10 butir
        $currentTotal = count($sampledDokkaiIds) + count($sampledBunpoIds) + count($sampledKosakataIds);
        if ($currentTotal < 10) {
            $remainingBunpo = array_diff($bunpoPool, $sampledBunpoIds);
            if (! empty($remainingBunpo)) {
                $extraBunpo = $this->sampleWeightedIds($remainingBunpo, 10 - $currentTotal, $weakspotIds);
                $sampledBunpoIds = array_merge($sampledBunpoIds, $extraBunpo);
                $currentTotal = count($sampledDokkaiIds) + count($sampledBunpoIds) + count($sampledKosakataIds);
            }
        }
        if ($currentTotal < 10) {
            $remainingDokkai = array_diff($dokkaiPool, $sampledDokkaiIds);
            if (! empty($remainingDokkai)) {
                $extraDokkai = $this->sampleWeightedIds($remainingDokkai, 10 - $currentTotal);
                $sampledDokkaiIds = array_merge($sampledDokkaiIds, $extraDokkai);
            }
        }

        // 5. Hydrate Soal & Normalisasi
        $soalPool = Soal::query()
            ->whereIn('id', array_merge($sampledKosakataIds, $sampledBunpoIds))
            ->get()
            ->keyBy('id');

        $kosakataItems = collect($sampledKosakataIds)
            ->map(fn ($id) => isset($soalPool[$id]) ? $this->normalizeSoal($soalPool[$id], 'kosakata', 'Kosakata') : null)
            ->filter()
            ->values()
            ->all();

        $bunpoItems = collect($sampledBunpoIds)
            ->map(fn ($id) => isset($soalPool[$id]) ? $this->normalizeSoal($soalPool[$id], 'bunpo', 'Bunpo') : null)
            ->filter()
            ->values()
            ->all();

        $dokkaiItems = DokkaiQuestion::query()
            ->whereIn('id', $sampledDokkaiIds)
            ->with(['passage.paragraphs:id,dokkai_passage_id,paragraph_number,content_raw', 'evidenceParagraph'])
            ->get()
            ->map(fn (DokkaiQuestion $d) => $this->normalizeDokkai($d))
            ->all();

        $sequencedQuestions = $this->interleaveQuestions($kosakataItems, $bunpoItems, $dokkaiItems);

        $fallbackQuizId = $allowedQuizIds[0] ?? 1;
        $programTitle = null;
        if ($programId) {
            $program = ProgramPembelajaran::find($programId);
            $programTitle = $program?->title;
        }

        return [
            'quiz_id' => $fallbackQuizId,
            'title' => $programTitle ? "Kuis Campuran: {$programTitle}" : 'Kuis Campuran: Seluruh Kelas Aktif',
            'module_title' => $programTitle ?? 'Latihan Harian Dashboard',
            'time_limit' => 600,
            'session_token' => (string) Str::uuid(),
            'total_questions' => count($sequencedQuestions),
            'questions' => $sequencedQuestions,
            'is_dashboard' => true,
            'program_id' => $programId,
        ];
    }

    public function submitDashboardAttempt(Pengguna $user, array $data): array
    {
        $submissionToken = $data['submission_token'] ?? (string) Str::uuid();

        return DB::transaction(function () use ($user, $data, $submissionToken) {
            $existing = PengerjaanKuis::where('user_id', $user->id)
                ->where('submission_token', $submissionToken)
                ->first();

            if ($existing) {
                return [
                    'score' => $existing->score,
                    'xp_earned' => $existing->xp_earned,
                    'passed' => $existing->score >= 70,
                    'idempotent' => true,
                ];
            }

            $submittedAnswers = collect($data['answers'] ?? []);
            $evaluated = $this->evaluateAnswers($submittedAnswers, null, $user->id);

            $score = $evaluated['score'];
            $passed = $score >= 70;

            $firstQuestionRawId = $submittedAnswers->first()['raw_id'] ?? null;
            $firstSourceType = $submittedAnswers->first()['source_type'] ?? null;
            $resolvedQuizId = null;

            if ($firstSourceType === 'dokkai' && $firstQuestionRawId) {
                $resolvedQuizId = DokkaiQuestion::find($firstQuestionRawId)?->passage?->quiz_id;
            } elseif ($firstQuestionRawId) {
                $resolvedQuizId = Soal::find($firstQuestionRawId)?->quiz_id;
            }

            $fallbackQuiz = $resolvedQuizId ? Kuis::find($resolvedQuizId) : Kuis::where('status', 'published')->first();
            $quizId = $fallbackQuiz?->id ?? 1;

            $attempt = PengerjaanKuis::create([
                'user_id' => $user->id,
                'quiz_id' => $quizId,
                'submission_token' => $submissionToken,
                'status' => 'completed',
                'score' => $score,
                'xp_earned' => 0,
                'started_at' => now(),
                'completed_at' => now(),
                'attempted_at' => now(),
            ]);

            $correctSoalIds = collect($evaluated['details'])
                ->where('source_type', '!=', 'dokkai')
                ->where('is_correct', true)
                ->pluck('raw_id')
                ->all();

            $soalMap = ! empty($correctSoalIds) ? Soal::whereIn('id', $correctSoalIds)->get()->keyBy('id') : collect();
            $reviewMap = ! empty($correctSoalIds) ? ReviewSoal::where('user_id', $user->id)->whereIn('question_id', $correctSoalIds)->get()->keyBy('question_id') : collect();

            foreach ($evaluated['details'] as $item) {
                if ($item['source_type'] === 'dokkai') {
                    DokkaiAttemptAnswer::create([
                        'attempt_id' => $attempt->id,
                        'dokkai_question_id' => $item['raw_id'],
                        'selected_option' => mb_substr((string) ($item['user_answer'] ?? ''), 0, 5),
                        'is_correct' => $item['is_correct'],
                    ]);
                } else {
                    JawabanPengerjaanKuis::create([
                        'attempt_id' => $attempt->id,
                        'question_id' => $item['raw_id'],
                        'answer_text' => $item['user_answer'],
                        'is_correct' => $item['is_correct'],
                        'earned_points' => $item['is_correct'] ? 1 : 0,
                    ]);

                    if ($item['is_correct'] && ($soal = $soalMap->get($item['raw_id']))) {
                        $this->repetisiService->catatJawabanSoal($user, $soal, true);
                        if ($review = $reviewMap->get($soal->id)) {
                            $review->update([
                                'wrong_count' => max(0, (int) $review->wrong_count - 1),
                                'last_result' => 'correct',
                            ]);
                        }
                    }
                }
            }

            // Gamifikasi & Anti-Farming Policy: Sesi pertama = 30 XP, pengulangan = 5 XP
            $xpEarned = 0;
            if ($passed) {
                $todayAttemptsCount = PengerjaanKuis::where('user_id', $user->id)
                    ->whereDate('created_at', now()->toDateString())
                    ->where('quiz_id', $quizId)
                    ->count();

                $xpEarned = ($todayAttemptsCount <= 1) ? 30 : 5;

                $user->increment('xp', $xpEarned);
                LogReward::create([
                    'user_id' => $user->id,
                    'source_type' => 'quiz',
                    'source_id' => $quizId,
                    'xp_amount' => $xpEarned,
                    'description' => 'Menyelesaikan Kuis Campuran Harian (Dashboard)',
                ]);

                $attempt->update(['xp_earned' => $xpEarned]);
            }

            event(new KuisSelesai($user, $quizId, $score, $xpEarned));
            $this->summaryService->forget($user);

            return [
                'score' => $score,
                'passed' => $passed,
                'xp_earned' => $xpEarned,
                'attempt_id' => $attempt->id,
                'correct_count' => $evaluated['correct_count'],
                'total_questions' => $evaluated['total_questions'],
                'breakdown' => $evaluated['breakdown'],
                'weakspot_category' => $evaluated['weakspot_category'],
                'is_dashboard' => true,
            ];
        });
    }

    private function sampleWeightedIds(array $ids, int $count, array $weakspotIds = []): array
    {
        $total = count($ids);
        if ($total === 0 || $count <= 0) {
            return [];
        }
        if ($total <= $count) {
            return $ids;
        }

        $weightedPool = [];
        foreach ($ids as $id) {
            $weight = isset($weakspotIds[$id]) ? 4 : 1;
            for ($w = 0; $w < $weight; $w++) {
                $weightedPool[] = $id;
            }
        }

        $selected = [];
        while (count($selected) < $count && ! empty($weightedPool)) {
            $randKey = array_rand($weightedPool);
            $pickedId = $weightedPool[$randKey];
            $selected[$pickedId] = true;
            $weightedPool = array_values(array_filter($weightedPool, fn ($id) => $id !== $pickedId));
        }

        return array_keys($selected);
    }

    private function normalizeSoal(Soal $s, string $categoryKey, string $categoryBadge): array
    {
        $isSentenceBuilder = ($s->type === 'sentence_builder' || $s->stage === 'sentence_builder');
        $optionsData = is_array($s->options) ? $s->options : [];

        if ($isSentenceBuilder) {
            $rawTokens = array_values($optionsData['tokens'] ?? []);
            $shuffledTokens = $this->fisherYatesShuffle($rawTokens);

            return [
                'id' => "soal_{$s->id}",
                'raw_id' => $s->id,
                'type' => 'sentence_builder',
                'source_type' => $categoryKey,
                'category_key' => $categoryKey,
                'category_badge' => $categoryBadge,
                'question_text' => $s->question_text,
                'question_reading' => $s->question_reading,
                'context' => $optionsData['context'] ?? null,
                'passage_text' => null,
                'tokens' => $shuffledTokens,
                'options' => [],
                'explanation' => $s->explanation,
            ];
        }

        $choices = $optionsData['choices'] ?? $optionsData;
        $cleanOptions = [];
        foreach ($choices as $idx => $opt) {
            $text = is_array($opt) ? ($opt['text'] ?? $opt['option_text'] ?? '') : (string) $opt;
            if (trim($text) !== '') {
                $cleanOptions[] = [
                    'id' => (string) ($opt['id'] ?? $idx),
                    'text' => trim($text),
                ];
            }
        }

        return [
            'id' => "soal_{$s->id}",
            'raw_id' => $s->id,
            'type' => 'choice',
            'source_type' => $categoryKey,
            'category_key' => $categoryKey,
            'category_badge' => $categoryBadge,
            'question_text' => $s->question_text,
            'question_reading' => $s->question_reading,
            'passage_text' => null,
            'options' => $this->fisherYatesShuffle($cleanOptions),
            'explanation' => $s->explanation,
        ];
    }

    private function normalizeDokkai(DokkaiQuestion $d): array
    {
        $passage = $d->passage;
        $evidenceParagraph = $d->evidenceParagraph;
        $passageSnippet = $evidenceParagraph?->content_raw;

        if (! $passageSnippet && $passage?->paragraphs) {
            $firstP = $passage->paragraphs->first();
            $passageSnippet = $firstP?->content_raw ? mb_substr($firstP->content_raw, 0, 160) . '...' : null;
        }

        $rawOptions = is_array($d->options) ? $d->options : [];
        $cleanOptions = [];

        foreach ($rawOptions as $idx => $opt) {
            $text = $opt['option_text'] ?? $opt['text'] ?? '';
            if (trim($text) !== '') {
                $cleanOptions[] = [
                    'id' => (string) ($opt['id'] ?? $idx),
                    'text' => trim($text),
                ];
            }
        }

        $shuffledOptions = $this->fisherYatesShuffle($cleanOptions);

        return [
            'id' => "dokkai_{$d->id}",
            'raw_id' => $d->id,
            'type' => 'choice',
            'source_type' => 'dokkai',
            'category_key' => 'dokkai',
            'category_badge' => 'Dokkai',
            'question_text' => $d->question_text,
            'question_reading' => null,
            'passage_title' => $passage?->title,
            'passage_text' => $passageSnippet,
            'options' => $shuffledOptions,
            'explanation' => $d->explanation_correct,
        ];
    }

    private function interleaveQuestions(array $kosakata, array $bunpo, array $dokkai): array
    {
        // Pola Pedagogis: [K, K, B, B, D, K, K, B, D, D]
        $pattern = ['kosakata', 'kosakata', 'bunpo', 'bunpo', 'dokkai', 'kosakata', 'kosakata', 'bunpo', 'dokkai', 'dokkai'];
        $pools = [
            'kosakata' => $kosakata,
            'bunpo' => $bunpo,
            'dokkai' => $dokkai,
        ];

        $result = [];
        foreach ($pattern as $cat) {
            if (! empty($pools[$cat])) {
                $result[] = array_shift($pools[$cat]);
            } else {
                // Ambil dari kategori yang masih punya stok
                foreach (['kosakata', 'bunpo', 'dokkai'] as $fallbackCat) {
                    if (! empty($pools[$fallbackCat])) {
                        $result[] = array_shift($pools[$fallbackCat]);
                        break;
                    }
                }
            }
        }

        // Masukkan sisa jika ada
        foreach ($pools as $remaining) {
            while (! empty($remaining)) {
                $result[] = array_shift($remaining);
            }
        }

        return array_slice($result, 0, 10);
    }

    private function fisherYatesShuffle(array $items): array
    {
        $count = count($items);
        for ($i = $count - 1; $i > 0; $i--) {
            $j = mt_rand(0, $i);
            $temp = $items[$i];
            $items[$i] = $items[$j];
            $items[$j] = $temp;
        }
        return array_values($items);
    }

    private function evaluateAnswers(Collection $submitted, ?int $moduleId, ?int $userId = null): array
    {
        $userId ??= auth()->id();
        $dokkaiIds = $submitted->where('source_type', 'dokkai')->pluck('raw_id')->unique()->all();
        $soalIds = $submitted->where('source_type', '!=', 'dokkai')->pluck('raw_id')->unique()->all();

        $dokkaiMap = ! empty($dokkaiIds) ? DokkaiQuestion::whereIn('id', $dokkaiIds)->get()->keyBy('id') : collect();
        $soalMap = ! empty($soalIds) ? Soal::whereIn('id', $soalIds)->get()->keyBy('id') : collect();

        $details = [];
        $failedReviews = [];
        $counts = [
            'kosakata' => ['correct' => 0, 'total' => 0],
            'bunpo' => ['correct' => 0, 'total' => 0],
            'dokkai' => ['correct' => 0, 'total' => 0],
        ];

        foreach ($submitted as $ans) {
            $sourceType = $ans['source_type'] ?? 'kosakata';
            $rawId = (int) ($ans['raw_id'] ?? 0);
            $rawAnswer = $ans['answer'] ?? null;
            $orderedTokenIds = $ans['ordered_token_ids'] ?? null;
            $isCorrect = false;

            if ($sourceType === 'dokkai') {
                $question = $dokkaiMap->get($rawId);
                $userAnswerStr = trim((string) $rawAnswer);
                if ($question && is_array($question->options)) {
                    foreach ($question->options as $opt) {
                        $optText = trim((string) ($opt['option_text'] ?? $opt['text'] ?? ''));
                        if ($optText === $userAnswerStr && ! empty($opt['is_correct'])) {
                            $isCorrect = true;
                            break;
                        }
                    }
                }
            } else {
                $soal = $soalMap->get($rawId);
                if ($soal) {
                    $isSentenceBuilder = ($soal->type === 'sentence_builder' || $soal->stage === 'sentence_builder');
                    if ($isSentenceBuilder) {
                        $expected = json_decode((string) $soal->correct_answer, true) ?: [];
                        $submittedOrder = is_array($orderedTokenIds)
                            ? $orderedTokenIds
                            : (is_array($rawAnswer)
                                ? $rawAnswer
                                : (json_decode((string) $rawAnswer, true) ?: array_filter(explode(',', (string) $rawAnswer))));
                        $isCorrect = is_array($expected) && ! empty($expected) && array_values($submittedOrder) === array_values($expected);
                    } else {
                        $expected = mb_strtolower(trim((string) $soal->correct_answer));
                        $submittedText = mb_strtolower(trim((string) $rawAnswer));
                        $isCorrect = ($expected === $submittedText);
                    }

                    if (! $isCorrect && $moduleId && $userId) {
                        $failedReviews[] = [
                            'user_id' => $userId,
                            'question_id' => $soal->id,
                            'quiz_id' => $soal->quiz_id,
                            'module_id' => $moduleId,
                        ];
                    }
                }
            }

            if (isset($counts[$sourceType])) {
                $counts[$sourceType]['total']++;
                if ($isCorrect) {
                    $counts[$sourceType]['correct']++;
                }
            }

            $details[] = [
                'raw_id' => $rawId,
                'source_type' => $sourceType,
                'user_answer' => is_array($rawAnswer) ? json_encode($rawAnswer) : (string) $rawAnswer,
                'is_correct' => $isCorrect,
            ];
        }

        foreach ($failedReviews as $rev) {
            ReviewSoal::updateOrCreate(
                ['user_id' => $rev['user_id'], 'question_id' => $rev['question_id']],
                [
                    'quiz_id' => $rev['quiz_id'],
                    'module_id' => $rev['module_id'],
                    'last_result' => 'incorrect',
                    'last_answered_at' => now(),
                    'wrong_count' => DB::raw('wrong_count + 1'),
                    'review_count' => DB::raw('review_count + 1'),
                ]
            );
        }

        $totalQuestions = count($details);
        $totalCorrect = array_sum(array_column($counts, 'correct'));
        $score = $totalQuestions > 0 ? (int) round(($totalCorrect / $totalQuestions) * 100) : 0;

        $breakdown = [];
        $lowestAccuracy = 101;
        $weakspotCat = null;

        foreach ($counts as $cat => $stat) {
            $pct = $stat['total'] > 0 ? (int) round(($stat['correct'] / $stat['total']) * 100) : 100;
            $breakdown[$cat] = [
                'correct' => $stat['correct'],
                'total' => $stat['total'],
                'percentage' => $pct,
            ];

            if ($pct < 70 && $pct < $lowestAccuracy) {
                $lowestAccuracy = $pct;
                $weakspotCat = $cat;
            }
        }

        return [
            'score' => $score,
            'correct_count' => $totalCorrect,
            'total_questions' => $totalQuestions,
            'details' => $details,
            'breakdown' => $breakdown,
            'weakspot_category' => $weakspotCat,
        ];
    }
}
