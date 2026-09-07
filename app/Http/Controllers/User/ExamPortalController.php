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
