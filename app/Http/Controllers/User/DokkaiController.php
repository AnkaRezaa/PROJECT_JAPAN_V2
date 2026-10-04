<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Models\Kuis;
use App\Services\AksesKuisPenggunaService;
use App\Services\KuisDokkaiService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class DokkaiController extends Controller
{
    public function __construct(
        private readonly KuisDokkaiService $dokkaiService,
        private readonly ?AksesKuisPenggunaService $aksesKuis = null
    ) {}

    public function index(Request $request): Response
    {
        $user = Auth::user();
        $dokkais = Kuis::query()
            ->where('type', 'dokkai')
            ->where('status', 'published')
            ->with(['dokkaiPassage', 'module.programPembelajaran', 'attempts' => function ($q) use ($user) {
                if ($user) {
                    $q->where('user_id', $user->id)->where('status', 'completed')->orderByDesc('score');
                }
            }])
            ->get()
            ->map(function (Kuis $quiz) use ($user) {
                $passage = $quiz->dokkaiPassage;
                $bestAttempt = $quiz->attempts->first();

                $isLocked = false;
                $lockReason = null;
                $lockMessage = null;

                if ($user && $this->aksesKuis) {
                    $status = $this->aksesKuis->status($user, $quiz);
                    $isLocked = ! $status['allowed'];
                    $lockReason = $status['reason'];
                    $lockMessage = $status['message'];
                } elseif (! $user) {
                    $level = $passage?->jlpt_level ?? 'N3';
                    if ($level !== 'N5') {
                        $isLocked = true;
                        $lockReason = 'subscription_required';
                        $lockMessage = 'Wacana ini membutuhkan akun siswa atau paket langganan.';
                    }
                }

                return [
                    'id' => $quiz->id,
                    'title' => $passage?->title ?? 'Wacana Dokkai',
                    'sub_title' => $passage?->sub_title,
                    'theme_category' => $passage?->theme_category ?? 'Budaya & Bahasa',
                    'jlpt_level' => $passage?->jlpt_level ?? 'N3',
                    'estimated_reading_time' => $passage?->estimated_reading_time ?? 5,
                    'xp_reward' => $passage?->xp_reward ?? 80,
                    'is_completed' => (bool) ($bestAttempt && $bestAttempt->score >= ($quiz->passing_score ?? 70)),
                    'score' => $bestAttempt?->score ?? null,
                    'is_locked' => $isLocked,
                    'lock_reason' => $lockReason,
                    'lock_message' => $lockMessage,
                    'start_url' => route('user.dokkai.show', $quiz->id),
                ];
            })
            ->values()
            ->all();

        return Inertia::render('User/Dokkai/Index', [
            'dokkais' => $dokkais,
            'levels' => ['N5', 'N4', 'N3', 'N2', 'N1'],
            'paywallAlert' => session('paywall_alert'),
        ]);
    }

    public function payload(Request $request, string $quiz): JsonResponse
    {
        $quizModel = $this->resolveQuiz($quiz);
        $user = Auth::user();
        if ($user && $this->aksesKuis) {
            $this->aksesKuis->abortJikaTerkunci($user, $quizModel);
        }

        return response()->json($this->dokkaiService->payload($quizModel, false, $user));
    }

    public function show(Request $request, string $quiz): Response|\Illuminate\Http\RedirectResponse
    {
        $quizModel = $this->resolveQuiz($quiz);
        $user = Auth::user();
        if ($user && $this->aksesKuis) {
            $status = $this->aksesKuis->status($user, $quizModel);
            if (! $status['allowed']) {
                return redirect()->route('user.dokkai.index')->with('paywall_alert', [
                    'quiz_id' => $quizModel->id,
                    'title' => $quizModel->dokkaiPassage?->title ?? 'Wacana Dokkai',
                    'level' => $quizModel->dokkaiPassage?->jlpt_level ?? 'N3',
                    'message' => $status['message'],
                    'reason' => $status['reason'],
                ]);
            }
        }

        $payload = $this->dokkaiService->payload($quizModel, false, $user);

        return Inertia::render('User/Dokkai/PreviewDemo', [
            ...$payload,
            'quizId' => $quizModel->id,
            'persist' => (bool) $user,
        ]);
    }

    public function submit(Request $request, string $quiz): JsonResponse
    {
        $validated = $request->validate([
            'answers' => ['present', 'array'],
            'submission_token' => ['nullable', 'uuid'],
        ]);

        $quizModel = $this->resolveQuiz($quiz);
        $user = Auth::user();
        abort_unless($user, 401, 'Silakan login terlebih dahulu untuk menyimpan pengerjaan.');

        if ($this->aksesKuis) {
            $this->aksesKuis->abortJikaTerkunci($user, $quizModel);
        }

        $result = $this->dokkaiService->evaluateAttempt(
            $quizModel,
            $user,
            $validated['answers'],
            $validated['submission_token'] ?? null
        );

        return response()->json($result);
    }

    private function resolveQuiz(string $quiz): Kuis
    {
        if (is_numeric($quiz)) {
            return Kuis::where('type', 'dokkai')->findOrFail($quiz);
        }

        $dokkai = Kuis::where('type', 'dokkai')->where('status', 'published')->first();
        if (! $dokkai) {
            abort(404, 'Materi wacana Dokkai belum tersedia di database. Silakan jalankan seeder Dokkai terlebih dahulu.');
        }

        return $dokkai;
    }
}
