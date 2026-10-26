<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Models\HariModul;
use App\Services\AksesKuisPenggunaService;
use App\Services\KuisCampuranService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class KuisCampuranController extends Controller
{
    public function __construct(
        private readonly KuisCampuranService $kuisCampuranService,
        private readonly AksesKuisPenggunaService $aksesKuis
    ) {}

    public function show(Request $request, HariModul $moduleDay): Response
    {
        $quiz = $moduleDay->checkpointQuiz ?? $moduleDay->quizzes()->firstOrFail();
        $this->aksesKuis->abortJikaTerkunci($request->user(), $quiz);

        $payload = $this->kuisCampuranService->generatePayload($moduleDay, $request->user());

        $moduleDay->loadMissing('module.programPembelajaran');
        $backUrl = $moduleDay->module?->programPembelajaran
            ? route('user.modul.program', $moduleDay->module->programPembelajaran->slug)
            : ($moduleDay->module ? route('user.modul.lesson', $moduleDay->module->id) : route('user.kelas.index'));

        return Inertia::render('User/Kuis/KuisCampuranRunner', [
            'quiz' => $payload,
            'submitUrl' => route('user.kuis-campuran.submit', $moduleDay->id),
            'backUrl' => $backUrl,
            'restartUrl' => route('user.kuis-campuran.restart', $moduleDay->id),
        ]);
    }

    public function submit(Request $request, HariModul $moduleDay): JsonResponse
    {
        $validated = $request->validate([
            'submission_token' => ['required', 'uuid'],
            'answers' => ['present', 'array'],
            'answers.*.raw_id' => ['required', 'integer'],
            'answers.*.source_type' => ['required', 'string', 'in:kosakata,bunpo,dokkai'],
            'answers.*.answer' => ['nullable'],
            'answers.*.ordered_token_ids' => ['nullable', 'array'],
        ]);

        $quiz = $moduleDay->checkpointQuiz ?? $moduleDay->quizzes()->firstOrFail();
        $this->aksesKuis->abortJikaTerkunci($request->user(), $quiz);

        $result = $this->kuisCampuranService->submitAttempt($moduleDay, $request->user(), $validated);

        return response()->json($result);
    }

    public function showWeakspot(Request $request): Response
    {
        $category = $request->query('category');
        $from = $request->query('from');
        $backUrl = ($from === 'beranda' || $from === 'dashboard')
            ? route('user.dashboard')
            : route('user.progress');

        $payload = $this->kuisCampuranService->generateWeakspotPayload($request->user(), $category);

        return Inertia::render('User/Kuis/KuisCampuranRunner', [
            'quiz' => $payload,
            'submitUrl' => route('user.weakspot.submit'),
            'backUrl' => $backUrl,
            'isWeakspot' => true,
        ]);
    }

    public function restart(Request $request, HariModul $moduleDay): JsonResponse|RedirectResponse
    {
        $quiz = $moduleDay->checkpointQuiz ?? $moduleDay->quizzes()->firstOrFail();
        $this->aksesKuis->abortJikaTerkunci($request->user(), $quiz);
        $this->kuisCampuranService->generatePayload($moduleDay, $request->user(), true);

        if ($request->expectsJson()) {
            return response()->json(['redirect_url' => route('user.kuis-campuran.show', $moduleDay->id)]);
        }

        return to_route('user.kuis-campuran.show', $moduleDay->id, 303);
    }

    public function restartDashboard(Request $request): JsonResponse|RedirectResponse
    {
        $validated = $request->validate(['program_id' => ['nullable', 'integer', 'exists:program_pembelajaran,id']]);
        $programId = isset($validated['program_id']) ? (int) $validated['program_id'] : null;
        $this->kuisCampuranService->generateDashboardPayload($request->user(), $programId, true);

        if ($request->expectsJson()) {
            return response()->json(['redirect_url' => route('user.kuis-campuran.dashboard', array_filter(['program_id' => $programId]))]);
        }

        return to_route('user.kuis-campuran.dashboard', array_filter(['program_id' => $programId]), 303);
    }

    public function submitWeakspot(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'submission_token' => ['required', 'string'],
            'answers' => ['present', 'array'],
            'answers.*.raw_id' => ['required', 'integer'],
            'answers.*.source_type' => ['required', 'string', 'in:kosakata,bunpo,dokkai'],
            'answers.*.answer' => ['nullable'],
            'answers.*.ordered_token_ids' => ['nullable', 'array'],
        ]);

        $result = $this->kuisCampuranService->submitWeakspotAttempt($request->user(), $validated);

        return response()->json($result);
    }

    public function showDashboard(Request $request): Response
    {
        $programId = $request->query('program_id') ? (int) $request->query('program_id') : null;
        $payload = $this->kuisCampuranService->generateDashboardPayload($request->user(), $programId);

        return Inertia::render('User/Kuis/KuisCampuranRunner', [
            'quiz' => $payload,
            'submitUrl' => route('user.kuis-campuran.dashboard.submit'),
            'backUrl' => route('user.dashboard'),
            'isDashboard' => true,
            'restartUrl' => route('user.kuis-campuran.dashboard.restart'),
        ]);
    }

    public function submitDashboard(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'submission_token' => ['required', 'uuid'],
            'answers' => ['present', 'array'],
            'answers.*.raw_id' => ['required', 'integer'],
            'answers.*.source_type' => ['required', 'string', 'in:kosakata,bunpo,dokkai'],
            'answers.*.answer' => ['nullable'],
            'answers.*.ordered_token_ids' => ['nullable', 'array'],
        ]);

        $result = $this->kuisCampuranService->submitDashboardAttempt($request->user(), $validated);

        return response()->json($result);
    }
}
