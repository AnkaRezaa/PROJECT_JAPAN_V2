<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Models\Berita;
use App\Models\BroadcastPopup;
use App\Models\DeckPresentasi;
use App\Models\KodeAkses;
use App\Models\Kosakata;
use App\Models\Kuis;
use App\Models\LogAktivitas;
use App\Models\LogReward;
use App\Models\Modul;
use App\Models\PengerjaanKuis;
use App\Models\PenukaranKodeAkses;
use App\Models\ProgramPembelajaran;
use App\Models\ProgresHariModul;
use App\Services\AksesKuisPenggunaService;
use App\Services\AksesLanggananService;
use App\Services\AksesPremiumService;
use App\Services\KloterBelajarService;
use App\Services\NotifikasiPenggunaService;
use App\Services\QuickQuizSessionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Symfony\Component\HttpKernel\Exception\HttpException;

class BerandaController extends Controller
{
    public function index(
        AksesKuisPenggunaService $aksesKuis,
        AksesPremiumService $aksesPremium,
        KloterBelajarService $kloterBelajar,
        QuickQuizSessionService $quickQuiz
    ) {
        $user = Auth::user();

        $news = Berita::query()
            ->with('attachments')
            ->where('status', 'published')
            ->where(function ($query) {
                $query->whereNull('published_at')->orWhere('published_at', '<=', now());
            })
            ->whereIn('audience', ['all', 'students'])
            ->where(function ($query) {
                $query->whereNull('starts_at')->orWhere('starts_at', '<=', now());
            })
            ->where(function ($query) {
                $query->whereNull('ends_at')->orWhere('ends_at', '>=', now());
            })
            ->orderByDesc('is_pinned')
            ->orderByDesc('published_at')
            ->take(6)
            ->get()
            ->map(function (Berita $news) {
                $thumbnailUrl = $news->thumbnailUrl();

                return [
                    'id' => $news->id,
                    'slug' => $news->slug,
                    'title' => $news->title,
                    'excerpt' => $news->excerpt,
                    'body' => $news->body,
                    'category' => $news->category,
                    'is_pinned' => $news->is_pinned,
                    'published_at' => optional($news->published_at)->toIso8601String(),
                    'thumbnail_url' => $thumbnailUrl,
                    'cover_url' => $thumbnailUrl,
                    'cover_image_alt' => $news->cover_image_alt,
                ];
            });

        $activePopup = BroadcastPopup::query()
            ->active()
            ->forPage('dashboard')
            ->where(function ($query) use ($user) {
                $query->where('target_audience', 'all')
                    ->orWhere('target_audience', 'user')
                    ->when($user->subscription_status !== 'premium', function ($subQuery) {
                        $subQuery->orWhere('target_audience', 'free_user');
                    });
            })
            ->latest()
            ->first();

        return Inertia::render('User/Beranda/Beranda', [
            'user' => $user,
            'activePopup' => $activePopup ? [
                'id' => $activePopup->id,
                'title' => $activePopup->title,
                'description' => $activePopup->description,
                'type' => $activePopup->type,
                'badge' => $activePopup->badge,
                'image' => $activePopup->imageUrl(),
                'cta_label' => $activePopup->cta_label,
                'cta_url' => $activePopup->cta_url,
            ] : null,
            'recentProgress' => $user->progress()->with('module')->latest()->take(5)->get(),
            'learningDashboard' => $this->learningDashboardPayload($user, $aksesPremium, $aksesKuis, $kloterBelajar),
            'rewardHistory' => LogReward::where('user_id', $user->id)->latest()->take(10)->get(),
            'news' => $news,
            'activeSubscription' => $user->subscriptions()
                ->with('paymentPlan:id,name')
                ->where('status', 'active')
                ->latest('end_date')
                ->first(),
            'quickQuiz' => $quickQuiz->summary($user),
            'lastCompletedQuiz' => $this->lastCompletedQuizPayload($user->id),
            'dailyGoal' => $this->dailyGoalPayload($user->id),
        ]);
    }

    private function learningDashboardPayload($user, AksesPremiumService $aksesPremium, AksesKuisPenggunaService $aksesKuis, KloterBelajarService $kloterBelajar): array
    {
        $programs = ProgramPembelajaran::query()
            ->with([
                'level:id,level_name',
                'modules' => fn ($query) => $query
                    ->where('status', 'published')
                    ->with(['days' => fn ($dayQuery) => $dayQuery
                        ->where('status', 'published')
                        ->select(['id', 'module_id', 'day_number', 'title'])])
                    ->orderBy('week_number')
                    ->orderBy('id'),
            ])
            ->where('status', 'published')
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get()
            ->filter(fn (ProgramPembelajaran $program) => $aksesPremium->punyaAksesKelas($user, $program->id))
            ->values();

        $activeAccessByProgram = $user->subscriptions()
            ->where('status', 'active')
            ->whereDate('end_date', '>=', now()->toDateString())
            ->whereIn('scope_type', [
                AksesLanggananService::SCOPE_PROGRAM,
                AksesLanggananService::SCOPE_KLOTER,
            ])
            ->whereIn('program_pembelajaran_id', $programs->pluck('id'))
            ->latest('end_date')
            ->get(['id', 'scope_type', 'program_pembelajaran_id', 'end_date'])
            ->groupBy('program_pembelajaran_id')
            ->map(fn ($subscriptions) => $subscriptions->first());

        $moduleIds = $programs->flatMap(fn (ProgramPembelajaran $program) => $program->modules->pluck('id'));
        $completedModuleIds = $moduleIds->isEmpty()
            ? collect()
            : $user->progress()
                ->whereIn('module_id', $moduleIds)
                ->whereNotNull('completed_at')
                ->pluck('module_id')
                ->unique();
        $dayIds = $programs->flatMap(fn (ProgramPembelajaran $program) => $program->modules->flatMap->days->pluck('id'));
        $completedDayIds = $dayIds->isEmpty()
            ? collect()
            : ProgresHariModul::query()
                ->where('user_id', $user->id)
                ->whereIn('module_day_id', $dayIds)
                ->whereNotNull('completed_at')
                ->pluck('module_day_id')
                ->unique();

        $activePrograms = $programs->map(function (ProgramPembelajaran $program) use ($user, $aksesPremium, $kloterBelajar, $activeAccessByProgram, $completedModuleIds, $completedDayIds) {
            $kloter = $kloterBelajar->kloterAktifUser($user, $program->id);
            $activeAccess = $activeAccessByProgram->get($program->id);
            $waitingForKloter = $activeAccess?->scope_type === AksesLanggananService::SCOPE_KLOTER
                && ! $kloter;
            $modules = $waitingForKloter
                ? collect()
                : $program->modules
                    ->filter(fn (Modul $module) => $aksesPremium->bolehAksesModul($user, $module))
                    ->values();
            $nextModule = $modules->first(fn (Modul $module) => ! $completedModuleIds->contains($module->id))
                ?? $modules->first();
            $nextDay = $nextModule?->days->first(fn ($day) => ! $completedDayIds->contains($day->id))
                ?? $nextModule?->days->first();
            $completedCount = $program->modules->filter(fn (Modul $module) => $completedModuleIds->contains($module->id))->count();

            return [
                'id' => $program->id,
                'title' => $program->title,
                'slug' => $program->slug,
                'level' => $program->level?->level_name,
                'thumbnail_url' => $this->thumbnailProgramUrl($program->thumbnail_url),
                'total_modules' => $program->modules->count(),
                'completed_modules' => $completedCount,
                'progress' => $program->modules->isEmpty() ? 0 : (int) round(($completedCount / $program->modules->count()) * 100),
                'waiting_for_kloter' => $waitingForKloter,
                'kloter_name' => $kloter?->nama,
                'roadmap_url' => route('user.modul.program', $program->slug),
                'next_module' => $nextModule ? [
                    'id' => $nextModule->id,
                    'title' => $nextModule->title,
                    'week_number' => $nextModule->week_number,
                    'current_day' => $nextDay ? [
                        'id' => $nextDay->id,
                        'number' => $nextDay->day_number,
                        'title' => $nextDay->title,
                    ] : null,
                ] : null,
            ];
        });

        $primaryProgram = $activePrograms->first(fn (array $program) => $program['next_module'] !== null)
            ?? $activePrograms->first();

        $primaryModule = $primaryProgram['next_module'] ?? null;

        $resources = $primaryModule
            ? $this->moduleResourcePayload($user, $primaryProgram, $primaryModule['id'], $aksesKuis)
            : [];
        $nextAction = collect(['flashcard', 'kuis', 'presentasi', 'kosakata'])
            ->map(fn (string $category) => collect($resources)->first(fn (array $resource) => $resource['category'] === $category && $resource['available']))
            ->filter()
            ->first();

        return [
            'programs' => $activePrograms,
            'next_module' => $primaryModule ? [
                ...$primaryModule,
                'program_title' => $primaryProgram['title'],
                'roadmap_url' => $primaryProgram['roadmap_url'],
            ] : null,
            'resources' => $resources,
            'next_action' => $nextAction ? [
                'label' => 'Mulai '.$nextAction['title'],
                'href' => $nextAction['href'],
                'category' => $nextAction['category'],
            ] : null,
        ];
    }

    private function dailyGoalPayload(int $userId): array
    {
        $xpTarget = 30;
        $today = today();
        $xpEarned = (int) LogReward::query()
            ->where('user_id', $userId)
            ->whereBetween('created_at', [$today->copy()->startOfDay(), $today->copy()->endOfDay()])
            ->sum('xp_amount');
        $completedSessions = PengerjaanKuis::query()
            ->where('user_id', $userId)
            ->where('status', 'completed')
            ->whereDate('completed_at', $today)
            ->count();

        return [
            'xp_target' => $xpTarget,
            'xp_earned' => $xpEarned,
            'xp_progress' => min(100, (int) round(($xpEarned / $xpTarget) * 100)),
            'sessions_target' => 1,
            'sessions_completed' => $completedSessions,
            'sessions_done' => $completedSessions >= 1,
            'completed' => $xpEarned >= $xpTarget && $completedSessions >= 1,
        ];
    }

    private function thumbnailProgramUrl(?string $thumbnailUrl): ?string
    {
        if (! $thumbnailUrl) {
            return null;
        }

        if (str_starts_with($thumbnailUrl, 'http://') || str_starts_with($thumbnailUrl, 'https://')) {
            return $thumbnailUrl;
        }

        $relativePath = '/'.ltrim($thumbnailUrl, '/');
        $publicFile = public_path(ltrim($relativePath, '/'));

        return is_file($publicFile)
            ? $relativePath.'?v='.filemtime($publicFile)
            : $relativePath;
    }

    private function moduleResourcePayload($user, array $program, int $moduleId, AksesKuisPenggunaService $aksesKuis): array
    {
        $module = Modul::query()->where('status', 'published')->find($moduleId);

        if (! $module) {
            return [];
        }

        $presentationExists = DeckPresentasi::query()
            ->where('module_id', $module->id)
            ->shared()
            ->where('status', 'published')
            ->whereHas('slides')
            ->exists();
        $vocabularyExists = Kosakata::query()
            ->where('status', 'published')
            ->where(function ($query) use ($module) {
                $query->where('module_id', $module->id)
                    ->orWhereHas('flashcards.set', fn ($sets) => $sets
                        ->where('module_id', $module->id)
                        ->where('status', 'published'));
            })
            ->exists();
        $quiz = Kuis::query()
            ->where('module_id', $module->id)
            ->where('status', 'published')
            ->whereHas('questions')
            ->orderBy('id')
            ->first();
        $quizAccess = $quiz ? $aksesKuis->status($user, $quiz) : null;

        return [
            [
                'category' => 'presentasi',
                'title' => 'Presentasi',
                'description' => 'Materi visual untuk Week '.$module->week_number.'.',
                'available' => $presentationExists,
                'href' => $presentationExists ? route('user.modul.program.presentasi', ['program' => $program['slug'], 'module' => $module->id]) : null,
                'message' => $presentationExists ? null : 'Presentasi belum tersedia untuk minggu ini.',
            ],
            [
                'category' => 'kosakata',
                'title' => 'Kosakata',
                'description' => 'Review kata dan makna dari Week '.$module->week_number.'.',
                'available' => $vocabularyExists,
                'href' => $vocabularyExists ? route('user.modul.program.kosakata', ['program' => $program['slug'], 'module' => $module->id]) : null,
                'message' => $vocabularyExists ? null : 'Kosakata belum tersedia untuk minggu ini.',
            ],
            [
                'category' => 'kuis',
                'title' => 'Kuis',
                'description' => 'Evaluasi pemahaman setelah materi selesai.',
                'available' => (bool) ($quizAccess['allowed'] ?? false),
                'href' => ($quizAccess['allowed'] ?? false) ? route('user.quizzes.show', $quiz->id) : null,
                'message' => $quiz
                    ? ($quizAccess['message'] ?? 'Kuis belum dapat dibuka.')
                    : 'Kuis belum tersedia untuk minggu ini.',
            ],
        ];
    }

    private function lastCompletedQuizPayload(int $userId): ?array
    {
        $attempt = PengerjaanKuis::query()
            ->with([
                'quiz' => fn ($query) => $query
                    ->withCount('questions')
                    ->with([
                        'module:id,title,week_number,status',
                    ]),
            ])
            ->where('user_id', $userId)
            ->whereHas('quiz', fn ($query) => $query
                ->where('status', 'published')
                ->whereHas('questions')
                ->whereHas('module', fn ($moduleQuery) => $moduleQuery->where('status', 'published')))
            ->latest('attempted_at')
            ->first();

        if (! $attempt?->quiz) {
            return null;
        }

        $quiz = $attempt->quiz;
        $module = $quiz->module;
        $title = $module
            ? 'Week '.($module->week_number ?? '-').' - '.$module->title
            : 'Kuis Terakhir';

        return [
            'id' => $quiz->id,
            'title' => $title,
            'score' => $attempt->score,
            'xp_earned' => $attempt->xp_earned,
            'attempted_at' => optional($attempt->attempted_at)->toIso8601String(),
            'questions_count' => $quiz->questions_count,
            'url' => route('user.quizzes.show', $quiz->id),
        ];
    }

    public function redeemAccessKey(Request $request, AksesLanggananService $aksesLangganan)
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'max:64'],
        ]);

        $user = $request->user();
        $code = strtoupper(trim($validated['code']));

        try {
            DB::transaction(function () use ($request, $user, $code, $aksesLangganan) {
                $accessKey = KodeAkses::where('code', $code)->lockForUpdate()->first();

                if (! $accessKey || ! $accessKey->isRedeemable()) {
                    abort(422, 'Access key tidak valid, sudah habis, atau sudah kedaluwarsa.');
                }

                if (($accessKey->scope_type ?? AksesLanggananService::SCOPE_GLOBAL) === AksesLanggananService::SCOPE_GLOBAL) {
                    abort(422, 'Access key global sudah tidak berlaku. Gunakan access key yang terkait kelas.');
                }

                $alreadyRedeemed = PenukaranKodeAkses::where('access_key_id', $accessKey->id)
                    ->where('user_id', $user->id)
                    ->exists();

                if ($alreadyRedeemed) {
                    abort(422, 'Access key ini sudah pernah digunakan oleh akun Anda.');
                }

                $subscription = $aksesLangganan->activateFromAccessKey($user, $accessKey);

                PenukaranKodeAkses::create([
                    'access_key_id' => $accessKey->id,
                    'user_id' => $user->id,
                    'subscription_id' => $subscription->id,
                    'kloter_belajar_id' => $subscription->kloter_belajar_id,
                    'redeemed_at' => now(),
                    'ip_address' => $request->ip(),
                ]);

                $accessKey->increment('used_count');

                LogAktivitas::create([
                    'actor_id' => $user->id,
                    'action' => 'access_key.redeemed',
                    'target_type' => 'access_key',
                    'target_id' => $accessKey->id,
                    'description' => "Redeem access key {$accessKey->code}",
                    'ip_address' => $request->ip(),
                    'user_agent' => $request->userAgent(),
                ]);

                app(NotifikasiPenggunaService::class)->kirimKePengguna(
                    $user,
                    'access_key_redeemed',
                    'Access key berhasil digunakan',
                    'Akses belajar kamu sudah aktif dari access key.',
                    route('user.kelas.index'),
                    [
                        'access_key_id' => $accessKey->id,
                        'subscription_id' => $subscription->id,
                        'kloter_id' => $subscription->kloter_belajar_id,
                    ],
                    'access',
                    'success',
                    true
                );

                app(NotifikasiPenggunaService::class)->kirimKeRole(
                    'superadmin',
                    'access_key_redeemed',
                    'Access key digunakan',
                    "{$user->username} menggunakan access key {$accessKey->code}.",
                    route('superadmin.payments'),
                    [
                        'access_key_id' => $accessKey->id,
                        'user_id' => $user->id,
                        'subscription_id' => $subscription->id,
                    ],
                    'access',
                    'success',
                    true
                );
            });
        } catch (HttpException $exception) {
            return back()->withErrors(['access_key' => $exception->getMessage()]);
        }

        return back()->with('success', 'Access key berhasil digunakan. Akses belajar sudah aktif.');
    }
}
