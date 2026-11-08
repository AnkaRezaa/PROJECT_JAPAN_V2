<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Http\Requests\User\AutosaveExamAnswersRequest;
use App\Http\Requests\User\StartExamAttemptRequest;
use App\Models\Exam;
use App\Models\ExamAttempt;
use App\Models\ExamSession;
use App\Services\ExamAccessService;
use App\Services\ExamAttemptService;
use App\Services\ExamPortalDataService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ExamPortalController extends Controller
{
    public function __construct(private readonly ExamPortalDataService $portal, private readonly ExamAccessService $access, private readonly ExamAttemptService $attempts) {}

    public function index(Request $request): Response
    {
        return Inertia::render('User/Ujian/Portal/Index', $this->portal->userPortal($request->user(), $request));
    }

    public function library(Request $request): Response
    {
        return Inertia::render('User/Ujian/Portal/Library', $this->portal->userPortal($request->user(), $request));
    }

    public function ranking(Request $request): Response
    {
        return Inertia::render('User/Ujian/Portal/Ranking', $this->portal->userPortal($request->user(), $request));
    }

    public function history(Request $request): Response
    {
        return Inertia::render('User/Ujian/Portal/History', $this->portal->userPortal($request->user(), $request));
    }

    public function show(Request $request, Exam $exam): Response
    {
        abort_unless($this->access->canViewExam($request->user(), $exam), 403);
        $data = $this->portal->userPortal($request->user(), $request);
        $selected = collect($data['exam_packages'])->firstWhere('id', $exam->id);
        if (! $selected) {
            $exam->loadMissing([
                'level:id,level_name',
                'versions' => fn ($query) => $query
                    ->where('status', 'published')
                    ->with([
                        'sections' => fn ($sections) => $sections->select('id', 'exam_version_id', 'key', 'title', 'short_title', 'sort_order', 'time_limit_seconds', 'estimated_max_score')->withCount('questions'),
                        'sessions' => fn ($sessions) => $sessions
                            ->whereIn('status', ['active', 'scheduled', 'closed'])
                            ->orderBy('starts_at'),
                    ]),
            ]);
            $versionIds = $exam->versions->pluck('id');
            $attempts = ExamAttempt::query()
                ->where('user_id', $request->user()->id)
                ->whereIn('exam_version_id', $versionIds)
                ->whereIn('status', ['submitted', 'timed_out'])
                ->selectRaw('exam_version_id, count(*) as attempt_count')
                ->groupBy('exam_version_id')
                ->get()->keyBy('exam_version_id');
            $releasedScores = ExamAttempt::query()
                ->join('exam_versions', 'exam_versions.id', '=', 'exam_attempts.exam_version_id')
                ->join('exams', 'exams.id', '=', 'exam_versions.exam_id')
                ->leftJoin('exam_sessions', 'exam_sessions.id', '=', 'exam_attempts.exam_session_id')
                ->where('exam_attempts.user_id', $request->user()->id)
                ->whereIn('exam_attempts.exam_version_id', $versionIds)
                ->whereIn('exam_attempts.status', ['submitted', 'timed_out'])
                ->where(fn ($query) => $query->where('exam_versions.result_release_policy', 'immediate')
                    ->orWhere('exams.type', 'practice')
                    ->orWhere(fn ($query) => $query->where('exam_versions.result_release_policy', 'after_session')->where('exam_sessions.ends_at', '<', now()))
                    ->orWhere('exam_sessions.result_released_at', '<', now()))
                ->selectRaw('exam_attempts.exam_version_id, max(exam_attempts.estimated_score) as last_score')
                ->groupBy('exam_attempts.exam_version_id')->get()->keyBy('exam_version_id');
            $selected = $this->portal->examPayload($exam, $attempts, $releasedScores);
        }
        abort_unless($selected, 404);

        return Inertia::render('User/Ujian/Portal/Show', [...$data, 'exam' => $selected]);
    }

    public function start(StartExamAttemptRequest $request, Exam $exam): JsonResponse
    {
        $session = ExamSession::findOrFail($request->validated('session_id'));
        abort_unless($session->version()->where('exam_id', $exam->id)->exists(), 404);
        $attempt = $this->attempts->start($request->user(), $session, $request->validated());

        return response()->json(['attempt' => $this->attempts->state($attempt)], 201);
    }

    public function attempt(Request $request, ExamAttempt $attempt): JsonResponse
    {
        $this->assertOwner($request, $attempt);

        return response()->json(['attempt' => $this->attempts->state($attempt)]);
    }

    public function autosave(AutosaveExamAnswersRequest $request, ExamAttempt $attempt): JsonResponse
    {
        return response()->json($this->attempts->autosave($attempt, $request->validated()));
    }

    public function advance(Request $request, ExamAttempt $attempt): JsonResponse
    {
        $this->assertOwner($request, $attempt);
        $data = $request->validate(['client_revision' => ['required', 'integer', 'min:0']]);

        return response()->json(['attempt' => $this->attempts->advanceJft($attempt, (int) $data['client_revision'])]);
    }

    public function submit(Request $request, ExamAttempt $attempt): JsonResponse
    {
        $this->assertOwner($request, $attempt);
        $attempt = $this->attempts->submit($attempt);
        $available = $this->access->resultReleased($attempt);

        return response()->json(['result_available' => $available, 'result' => $available ? $this->attempts->result($attempt) : null]);
    }

    public function result(Request $request, ExamAttempt $attempt): JsonResponse
    {
        $this->assertOwner($request, $attempt);

        return response()->json(['result' => $this->attempts->result($attempt)]);
    }

    private function assertOwner(Request $request, ExamAttempt $attempt): void
    {
        abort_unless((int) $attempt->user_id === (int) $request->user()->id, 404);
    }
}
