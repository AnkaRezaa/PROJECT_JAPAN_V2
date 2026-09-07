<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ImportExamQuestionsRequest;
use App\Http\Requests\Admin\InvalidateExamAttemptRequest;
use App\Http\Requests\Admin\StoreExamRequest;
use App\Http\Requests\Admin\StoreExamSessionRequest;
use App\Http\Requests\Admin\SyncExamQuestionsRequest;
use App\Http\Requests\Admin\SyncExamSectionsRequest;
use App\Http\Requests\Admin\UpdateExamRequest;
use App\Http\Requests\Admin\UpdateExamVersionRequest;
use App\Models\Exam;
use App\Models\ExamAttempt;
use App\Models\ExamSection;
use App\Models\ExamSession;
use App\Models\ExamVersion;
use App\Services\ExamAttemptService;
use App\Services\ExamAuditService;
use App\Services\ExamAuthoringService;
use App\Services\ExamImportService;
use App\Services\ExamPortalDataService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class AdminExamPortalController extends Controller
{
    public function __construct(
        private readonly ExamPortalDataService $portal,
        private readonly ExamAuthoringService $authoring,
        private readonly ExamImportService $imports,
        private readonly ExamAttemptService $attempts,
        private readonly ExamAuditService $audit,
    ) {}

    public function index(Request $request): Response
    {
        return Inertia::render('Admin/Ujian/Index', $this->portal->adminPortal($request));
    }

    public function create(Request $request): Response
    {
        return Inertia::render('Admin/Ujian/Editor', [...$this->portal->adminPortal($request), 'exam' => null, 'mode' => 'create']);
    }

    public function edit(Request $request, Exam $exam): Response
    {
        $data = $this->portal->adminPortal($request, $exam);

        return Inertia::render('Admin/Ujian/Editor', [...$data, 'exam' => collect($data['exam_packages'])->firstWhere('id', $exam->id), 'mode' => 'edit']);
    }

    public function sessions(Request $request): Response
    {
        return Inertia::render('Admin/Ujian/Sessions', $this->portal->adminPortal($request, includeSessions: true));
    }

    public function results(Request $request): Response
    {
        return Inertia::render('Admin/Ujian/Results', $this->portal->adminPortal($request, includeResults: true));
    }

    public function sessionResults(Request $request, ExamSession $session): JsonResponse
    {
        return response()->json($this->portal->sessionResults($session, $request));
    }

    public function preview(Request $request, Exam $exam): Response
    {
        $data = $this->portal->adminPortal($request, $exam);

        return Inertia::render('Admin/Ujian/Preview', [...$data, 'exam' => collect($data['exam_packages'])->firstWhere('id', $exam->id)]);
    }

    public function store(StoreExamRequest $request): RedirectResponse
    {
        $exam = $this->authoring->create($request->validated(), $request->user());

        return redirect()->route('admin.exams.edit', $exam)->with('success', 'Draft ujian berhasil dibuat.');
    }

    public function update(UpdateExamRequest $request, Exam $exam): RedirectResponse
    {
        $this->authoring->update($exam, $request->validated(), $request->user());

        return back()->with('success', 'Identitas ujian diperbarui.');
    }

    public function createVersion(Request $request, Exam $exam): JsonResponse
    {
        return response()->json(['version' => $this->authoring->createDraftVersion($exam, $request->user())], 201);
    }

    public function updateVersion(UpdateExamVersionRequest $request, ExamVersion $version): JsonResponse
    {
        return response()->json(['version' => $this->authoring->updateVersion($version, $request->validated())]);
    }

    public function syncSections(SyncExamSectionsRequest $request, ExamVersion $version): JsonResponse
    {
        return response()->json(['version' => $this->authoring->syncSections($version, $request->validated('sections'))]);
    }

    public function syncQuestions(SyncExamQuestionsRequest $request, ExamSection $section): JsonResponse
    {
        return response()->json(['section' => $this->authoring->syncQuestions($section, $request->validated('questions'))]);
    }

    public function validateVersion(ExamVersion $version): JsonResponse
    {
        return response()->json($this->authoring->readiness($version));
    }

    public function publish(Request $request, ExamVersion $version): JsonResponse
    {
        return response()->json(['version' => $this->authoring->publish($version, $request->user())]);
    }

    public function template(): BinaryFileResponse
    {
        return $this->imports->template();
    }

    public function importPreview(ImportExamQuestionsRequest $request, ExamVersion $version): JsonResponse
    {
        return response()->json($this->imports->preview($version, $request->file('file')));
    }

    public function import(ImportExamQuestionsRequest $request, ExamVersion $version): JsonResponse
    {
        return response()->json(['version' => $this->imports->commit($version, $request->file('file'))]);
    }

    public function storeSession(StoreExamSessionRequest $request, ExamVersion $version): JsonResponse
    {
        return response()->json(['session' => $this->authoring->createSession($version, $request->validated(), $request->user())], 201);
    }

    public function updateSession(StoreExamSessionRequest $request, ExamSession $session): JsonResponse
    {
        abort_if($session->starts_at?->isPast() || $session->attempts()->exists(), 409, 'Sesi yang sudah dimulai tidak dapat diubah.');
        $data = $request->validated();
        $cohorts = $data['cohort_ids'] ?? [];
        unset($data['cohort_ids']);
        $session->update($data);
        $session->cohorts()->sync($cohorts);
        $this->audit->record($session, 'updated', $request->user());
        Cache::forget('exam:ranking:'.$session->id);

        return response()->json(['session' => $session->load('cohorts')]);
    }

    public function closeSession(Request $request, ExamSession $session): JsonResponse
    {
        $session->attempts()->where('status', 'in_progress')->chunkById(100, fn ($items) => $items->each(fn ($attempt) => $this->attempts->submit($attempt, 'timeout')));
        $session->update(['status' => 'closed', 'ends_at' => $session->ends_at ?? now()]);
        $this->audit->record($session, 'closed', $request->user());

        return response()->json(['session' => $session->refresh()]);
    }

    public function releaseResults(Request $request, ExamSession $session): JsonResponse
    {
        $session->update(['result_released_at' => now()]);
        $this->audit->record($session, 'results_released', $request->user());

        return response()->json(['released_at' => $session->result_released_at]);
    }

    public function invalidate(InvalidateExamAttemptRequest $request, ExamAttempt $attempt): JsonResponse
    {
        abort_if($attempt->status === 'invalidated', 409, 'Attempt sudah dibatalkan.');
        $attempt->update(['status' => 'invalidated', 'ranking_eligible' => false, 'invalidated_at' => now(), 'invalidated_by' => $request->user()->id, 'invalidation_reason' => $request->validated('reason')]);
        $this->audit->record($attempt, 'invalidated', $request->user(), ['reason' => $request->validated('reason')]);
        Cache::forget('exam:ranking:'.$attempt->exam_session_id);

        return response()->json(['attempt' => $attempt->refresh()]);
    }
}
