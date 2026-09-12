<?php

namespace App\Services;

use App\Models\Exam;
use App\Models\ExamAttempt;
use App\Models\ExamSession;
use App\Models\KloterBelajar;
use App\Models\LevelPembelajaran;
use App\Models\Pengguna;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;

class ExamPortalDataService
{
    public function __construct(private readonly ExamAccessService $access) {}

    public function userPortal(Pengguna $user, Request $request): array
    {
        $exams = Exam::query()
            ->where('status', 'published')
            ->with(['level:id,level_name', 'versions' => fn ($query) => $query
                ->where('status', 'published')
                ->with(['sections' => fn ($sections) => $sections->select('id', 'exam_version_id', 'key', 'title', 'short_title', 'sort_order', 'time_limit_seconds', 'estimated_max_score')->withCount('questions'), 'sessions' => fn ($sessions) => $sessions
                    ->whereIn('status', ['active', 'scheduled'])
                    ->orderBy('starts_at')])])
            ->when($request->filled('level'), fn ($query) => $query->whereHas('level', fn ($level) => $level->where('level_name', (string) $request->string('level'))))
            ->when($request->filled('type'), fn ($query) => $query->where('type', (string) $request->string('type')))
            ->orderByDesc('updated_at')
            ->limit(100)
            ->get()
            ->filter(fn (Exam $exam) => $this->access->canViewExam($user, $exam));

        $attempts = ExamAttempt::query()
            ->where('user_id', $user->id)
            ->whereIn('exam_version_id', $exams->flatMap(fn ($exam) => $exam->versions)->pluck('id'))
            ->whereIn('status', ['submitted', 'timed_out'])
            ->selectRaw('exam_version_id, count(*) as attempt_count, max(estimated_score) as last_score')
            ->groupBy('exam_version_id')
            ->get()->keyBy('exam_version_id');

        $packages = $exams->map(fn (Exam $exam) => $this->examPayload($exam, $attempts))->values();
        $historyPaginator = ExamAttempt::query()
            ->where('user_id', $user->id)
            ->whereIn('status', ['submitted', 'timed_out'])
            ->with(['version.exam.level', 'sections.section', 'session'])
            ->latest('submitted_at')
            ->paginate(20, ['*'], 'history_page')
            ->withQueryString();

        return [
            'is_prototype' => false,
            'active_exam' => $packages->first(),
            'exam_packages' => $packages,
            'sessions' => $packages->pluck('session')->filter()->unique()->values(),
            'levels' => LevelPembelajaran::query()->orderBy('stage')->pluck('level_name'),
            'sections' => $this->sectionTemplates(),
            'latest_result' => $historyPaginator->getCollection()->first() ? $this->latestResult($historyPaginator->getCollection()->first()) : null,
            'ranking' => $this->ranking($request),
            'history' => $historyPaginator->getCollection()->map(fn (ExamAttempt $attempt) => $this->historyPayload($attempt))->values(),
            'history_pagination' => ['current_page' => $historyPaginator->currentPage(), 'last_page' => $historyPaginator->lastPage(), 'next_page_url' => $historyPaginator->nextPageUrl(), 'prev_page_url' => $historyPaginator->previousPageUrl()],
            'viewer' => ['name' => $user->username, 'email' => $user->email, 'current_level' => null],
        ];
    }

    public function adminPortal(Request $request, ?Exam $selectedExam = null, bool $includeSessions = false, bool $includeResults = false): array
    {
        $exams = Exam::query()
            ->with([
                'level:id,level_name',
                'latestVersion.sections' => fn ($query) => $query->withCount('questions'),
                'publishedVersion',
            ])
            ->withCount(['attempts' => fn ($query) => $query->whereIn('exam_attempts.status', ['submitted', 'timed_out'])])
            ->latest('updated_at')->limit(100)->get();
        $sessions = $includeSessions
            ? ExamSession::query()->with(['version.exam.level', 'cohorts:id,nama'])->withCount('attempts')->latest('starts_at')->paginate(30)
            : null;
        $results = $includeResults
            ? ExamAttempt::query()->whereIn('status', ['submitted', 'timed_out', 'invalidated'])->with(['user:id,username', 'version.exam.level', 'sections.section'])->latest('submitted_at')->paginate(30)
            : null;
        $selectedExam?->load(['latestVersion.sections.questions']);

        return [
            'is_prototype' => false,
            'exam_packages' => $exams->map(fn ($exam) => $this->adminExamPayload($exam))->values(),
            'levels' => LevelPembelajaran::query()->orderBy('stage')->pluck('level_name'),
            'level_options' => LevelPembelajaran::query()->orderBy('stage')->get(['id', 'level_name']),
            'section_templates' => $this->sectionTemplates(true),
            'cohort_options' => $includeSessions
                ? KloterBelajar::query()->where('status', 'active')->orderBy('nama')->get(['id', 'nama', 'kode'])
                : collect(),
            'sessions' => $sessions?->getCollection()->map(fn ($session) => [
                'id' => $session->id,
                'name' => $session->name,
                'exam_slug' => $session->version->exam->slug,
                'exam_title' => $session->version->exam->title,
                'exam_version_id' => $session->exam_version_id,
                'access' => $session->version->exam->access_type,
                'level' => $session->version->exam->level->level_name,
                'starts_at_value' => $session->starts_at?->format('Y-m-d\TH:i'),
                'ends_at_value' => $session->ends_at?->format('Y-m-d\TH:i'),
                'starts_at' => $session->starts_at?->format('d M Y, H.i'),
                'ends_at' => $session->ends_at?->format('d M Y, H.i'),
                'status' => $session->status,
                'attempt_limit_override' => $session->attempt_limit_override,
                'ranking_enabled' => $session->ranking_enabled,
                'result_released_at' => $session->result_released_at?->toIso8601String(),
                'cohort_ids' => $session->cohorts->pluck('id')->values(),
                'participants' => $session->attempts_count,
            ])->values() ?? collect(),
            'results' => $results?->getCollection()->map(fn ($attempt) => $this->adminResultPayload($attempt))->values() ?? collect(),
            'question_samples' => $this->questionSamples($selectedExam),
            'pagination' => ['sessions' => $sessions?->toArray()['links'] ?? [], 'results' => $results?->toArray()['links'] ?? []],
        ];
    }

    public function sessionResults(ExamSession $session, Request $request): array
    {
        $results = ExamAttempt::query()
            ->where('exam_session_id', $session->id)
            ->whereIn('status', ['submitted', 'timed_out', 'invalidated'])
            ->when($request->filled('status'), function ($query) use ($request) {
                $status = (string) $request->string('status');
                if ($status === 'passed') {
                    $query->where('estimated_passed', true)->where('status', '!=', 'invalidated');
                } elseif ($status === 'failed') {
                    $query->where('estimated_passed', false)->where('status', '!=', 'invalidated');
                } elseif ($status === 'invalidated') {
                    $query->where('status', 'invalidated');
                }
            })
            ->when($request->filled('search'), fn ($query) => $query->whereHas('user', fn ($user) => $user->where('username', 'like', '%'.addcslashes((string) $request->string('search'), '%_\\').'%')))
            ->with(['user:id,username', 'version.exam.level', 'sections.section'])
            ->latest('submitted_at')
            ->paginate(50)
            ->withQueryString();

        return [
            'data' => $results->getCollection()->map(fn ($attempt) => $this->adminResultPayload($attempt))->values(),
            'pagination' => [
                'current_page' => $results->currentPage(),
                'last_page' => $results->lastPage(),
                'next_page_url' => $results->nextPageUrl(),
                'prev_page_url' => $results->previousPageUrl(),
                'total' => $results->total(),
            ],
        ];
    }

    public function ranking(Request $request): Collection
    {
        $sessionId = $request->integer('session_id');
        if (! $sessionId) {
            $sessionId = ExamSession::where('ranking_enabled', true)->whereIn('status', ['active', 'closed'])->latest('starts_at')->value('id');
        }
        if (! $sessionId) {
            return collect();
        }

        $cacheKey = 'exam:ranking:'.$sessionId;
        $cachedRanking = Cache::get($cacheKey);

        if ($cachedRanking !== null && ! is_array($cachedRanking)) {
            Cache::forget($cacheKey);
        }

        $ranking = Cache::remember($cacheKey, now()->addMinutes(2), fn () => ExamAttempt::query()
            ->where('exam_session_id', $sessionId)
            ->where('ranking_eligible', true)
            ->whereIn('status', ['submitted', 'timed_out'])
            ->with(['user:id,username', 'version.exam.level', 'sections.section'])
            ->orderByDesc('estimated_score')
            ->orderByRaw('TIMESTAMPDIFF(SECOND, started_at, submitted_at) asc')
            ->orderBy('submitted_at')
            ->limit(100)
            ->get()
            ->values()
            ->map(function ($attempt, $index) {
                $sectionScores = $attempt->sections->mapWithKeys(fn ($section) => [$section->section->key => $section->estimated_score]);

                return ['rank' => $index + 1, 'name' => $attempt->user->username, 'level' => $attempt->version->exam->level->level_name, 'vocabulary' => $sectionScores['vocabulary'] ?? null, 'grammar_reading' => $sectionScores['grammar_reading'] ?? null, 'listening' => $sectionScores['listening'] ?? null, 'total' => $attempt->estimated_score, 'duration' => $this->duration($attempt)];
            })
            ->all());

        return collect($ranking);
    }

    public function examPayload(Exam $exam, Collection $attempts): array
    {
        $version = $exam->versions->sortByDesc('version_number')->first();
        $session = $version?->sessions->first(fn ($item) => $item->status === 'active') ?? $version?->sessions->first();
        $attempt = $version ? $attempts->get($version->id) : null;
        $sections = $version?->sections ?? collect();

        return [
            'id' => $exam->id,
            'slug' => $exam->slug,
            'title' => $exam->title,
            'description' => $exam->description,
            'type' => $exam->type,
            'level' => $exam->level->level_name,
            'session' => $session?->name,
            'session_id' => $session?->id,
            'duration_minutes' => (int) ceil($sections->sum('time_limit_seconds') / 60),
            'question_count' => (int) $sections->sum(fn ($section) => $section->questions_count ?? $section->questions()->count()),
            'section_count' => $sections->count(),
            'status' => $session?->status === 'active' ? ($attempt ? 'completed' : 'available') : 'locked',
            'attempt_count' => (int) ($attempt?->attempt_count ?? 0),
            'last_score' => $attempt?->last_score !== null ? (int) $attempt->last_score : null,
            'max_score' => (int) $sections->sum('estimated_max_score'),
            'scheduled_at' => $session?->starts_at?->format('d F Y'),
            'sections' => $sections->map(fn ($section) => ['key' => $section->key, 'label' => $section->title, 'short_label' => $section->short_title ?: $section->title, 'duration_minutes' => (int) ceil($section->time_limit_seconds / 60), 'question_count' => $section->questions_count ?? $section->questions()->count()])->values(),
        ];
    }

    private function adminExamPayload(Exam $exam): array
    {
        $version = $exam->latestVersion;
        $sections = $version?->sections ?? collect();

        return [
            'id' => $exam->id,
            'slug' => $exam->slug,
            'title' => $exam->title,
            'description' => $exam->description,
            'level_id' => $exam->level_id,
            'type' => $exam->type,
            'level' => $exam->level->level_name,
            'duration_minutes' => (int) ceil($sections->sum('time_limit_seconds') / 60),
            'question_count' => (int) $sections->sum('questions_count'),
            'status' => $exam->status,
            'access' => $exam->access_type,
            'attempt_count' => (int) $exam->attempt_count,
            'updated_at' => $exam->updated_at->format('d F Y, H.i'),
            'version_id' => $version?->id,
            'version_status' => $version?->status,
            'published_version_id' => $exam->publishedVersion?->id,
            'attempt_limit' => $version?->attempt_limit,
            'result_release_policy' => $version?->result_release_policy,
            'review_policy' => $version?->review_policy,
            'ranking_policy' => $version?->ranking_policy,
            'estimated_total_pass_score' => $version?->estimated_total_pass_score,
            'sections' => $sections->map(fn ($section) => [
                'id' => $section->id,
                'key' => $section->key,
                'label' => $section->title,
                'short_label' => $section->short_title ?: $section->title,
                'duration_minutes' => (int) ceil($section->time_limit_seconds / 60),
                'question_count' => (int) $section->questions_count,
                'estimated_max_score' => $section->estimated_max_score,
                'estimated_pass_score' => $section->estimated_pass_score,
            ])->values(),
        ];
    }

    private function historyPayload(ExamAttempt $attempt): array
    {
        return ['id' => $attempt->id, 'exam_slug' => $attempt->version->exam->slug, 'title' => $attempt->version->exam->title, 'session' => $attempt->session?->name, 'level' => $attempt->version->exam->level->level_name, 'attempt' => $attempt->attempt_number, 'score' => $attempt->estimated_score, 'max_score' => $attempt->sections->sum(fn ($item) => $item->section->estimated_max_score), 'status' => $attempt->estimated_passed === null ? 'completed' : ($attempt->estimated_passed ? 'passed' : 'failed'), 'duration' => $this->duration($attempt), 'completed_at' => $attempt->submitted_at?->format('d F Y'), 'sections' => $attempt->sections->mapWithKeys(fn ($item) => [$item->section->key => $item->estimated_score])];
    }

    private function adminResultPayload(ExamAttempt $attempt): array
    {
        return [
            'id' => $attempt->id,
            'name' => $attempt->user->username,
            'exam' => $attempt->version->exam->title,
            'level' => $attempt->version->exam->level->level_name,
            'score' => $attempt->estimated_score,
            'max_score' => $attempt->sections->sum(fn ($section) => $section->section->estimated_max_score),
            'status' => $attempt->status === 'invalidated' ? 'invalidated' : ($attempt->estimated_passed === null ? 'completed' : ($attempt->estimated_passed ? 'passed' : 'failed')),
            'duration' => $this->duration($attempt),
            'completed_at' => $attempt->submitted_at?->format('d M Y, H.i'),
        ];
    }

    private function latestResult(ExamAttempt $attempt): array
    {
        return ['exam_title' => $attempt->version->exam->title, 'score' => $attempt->estimated_score, 'max_score' => $attempt->sections->sum(fn ($item) => $item->section->estimated_max_score), 'status' => $attempt->estimated_passed ? 'Estimasi lulus' : 'Belum memenuhi estimasi', 'completed_at' => $attempt->submitted_at?->format('d F Y')];
    }

    private function duration(ExamAttempt $attempt): string
    {
        $seconds = $attempt->submitted_at ? (int) $attempt->started_at->diffInSeconds($attempt->submitted_at) : 0;

        return gmdate('H:i:s', $seconds);
    }

    private function sectionTemplates(bool $withNumbers = false): array
    {
        $sections = [
            ['key' => 'vocabulary', 'label' => '言語知識（文字・語彙）', 'short_label' => 'Kosakata & Huruf'],
            ['key' => 'grammar_reading', 'label' => '言語知識（文法）・読解', 'short_label' => 'Tata Bahasa & Membaca'],
            ['key' => 'listening', 'label' => '聴解', 'short_label' => 'Mendengarkan'],
        ];

        return $withNumbers ? array_map(fn ($item) => [...$item, 'duration_minutes' => 30, 'question_count' => 0], $sections) : $sections;
    }

    private function questionSamples(?Exam $exam): Collection
    {
        return $exam?->latestVersion?->sections->flatMap(fn ($section) => $section->questions->map(fn ($question) => [
            'id' => $question->id,
            'code' => $question->code,
            'section_id' => $section->id,
            'section_key' => $section->key,
            'section' => $section->short_title ?: $section->title,
            'type' => $question->type,
            'sort_order' => $question->sort_order,
            'points' => $question->points,
            'prompt' => $question->question_text,
            'question_reading' => $question->question_reading,
            'options' => $question->options,
            'option_readings' => $question->option_readings,
            'answer' => $question->correct_answer,
            'correct_answer_reading' => $question->correct_answer_reading,
            'explanation' => $question->explanation,
            'explanation_reading' => $question->explanation_reading,
            'audio_path' => $question->audio_path,
            'status' => $question->type === 'listening' && ! $question->audio_path ? 'needs_audio' : 'valid',
        ]))->values() ?? collect();
    }
}
