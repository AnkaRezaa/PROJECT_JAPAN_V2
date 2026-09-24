<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Models\Pengguna;
use App\Models\Modul;
use App\Models\LevelPembelajaran;
use App\Models\LogReward;
use App\Models\PengerjaanKuis;
use App\Models\Progres;
use App\Services\AccountSuspensionService;
use App\Services\AccountDeletionService;
use App\Services\ChartDataService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Inertia\Inertia;

class SuperAdminPenggunaController extends SuperAdminDasarController
{
    public function __invoke(Request $request, AccountDeletionService $deletions)
    {
        $filters = [
            'search' => (string) $request->string('search'),
            'status' => $request->string('status')->value() ?: 'all',
        ];

        $totalPublishedModules = max(1, Modul::where('status', 'published')->count());

        $students = Pengguna::query()
            ->where('role', 'user')
            ->withCount([
                'progress as completed_modules_count' => fn ($query) => $query->whereNotNull('completed_at'),
            ])
            ->when($filters['search'], function ($query, $search) {
                $query->where(function ($inner) use ($search) {
                    $inner->where('username', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                });
            })
            ->when($filters['status'] !== 'all', fn ($query) => $query->where('status', $filters['status']))
            ->latest()
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('SuperAdmin/DataUser/DataUser', [
            'stats' => [
                $this->stat('Total Student', number_format(Pengguna::where('role', 'user')->count()), 'U'),
                $this->stat('Aktif Mingguan', number_format(Pengguna::where('role', 'user')->whereDate('last_activity_date', '>=', now()->subDays(7)->toDateString())->count()), 'A'),
                $this->stat('Perlu Review', number_format(Pengguna::where('role', 'user')->whereNull('last_activity_date')->count()), 'R', '0', 'down'),
                $this->stat('Akun Suspended', number_format(Pengguna::where('role', 'user')->where('status', 'suspended')->count()), 'S', '0', 'down'),
            ],
            'users' => $students->through(fn (Pengguna $user) => [
                'id' => $user->id,
                'name' => $user->username,
                'email' => $user->email,
                'raw_status' => $user->status,
                'status' => $this->displayStatus($user->status),
                'xp' => number_format($user->xp),
                'level' => 'Lv ' . $user->level,
                'streak' => $user->streak_count . ' hari',
                'progress' => min(100, (int) round(($user->completed_modules_count / $totalPublishedModules) * 100)) . '%',
                'can_permanently_delete' => $deletions->canPermanentlyDelete($user, $request->user()),
                'can_anonymize' => $deletions->canAnonymize($user, $request->user()),
                'deletion_blockers' => $deletions->blockers($user, $request->user()),
            ]),
            'filters' => $filters,
        ]);
    }

    public function updateStatus(Request $request, Pengguna $user, AccountSuspensionService $suspensions)
    {
        abort_if($user->role !== 'user', 404);

        $validated = $request->validate([
            'status' => ['required', 'in:active,suspended'],
            'reason' => ['nullable', 'string', 'max:255'],
        ]);

        $oldStatus = $user->status ?? 'active';

        $suspensions->changeStatus($user, $validated['status'], $validated['reason'] ?? null, $request->user());

        $this->logActivity(
            $request,
            'user.status_changed',
            'user',
            $user->id,
            "Mengubah status user {$user->username} dari {$oldStatus} ke {$validated['status']}",
            ['old_status' => $oldStatus, 'new_status' => $validated['status']]
        );

        return redirect()->back()->with('success', 'Status user berhasil diperbarui');
    }

    public function show(Request $request, Pengguna $user, ChartDataService $chartData)
    {
        abort_if($user->role !== 'user', 404);

        $period = $chartData->resolvePeriod($request);
        $fromDate = $chartData->fromDate($period);
        $user->load([
            'progress.module.level',
            'attempts.quiz.module.level',
            'kloterBelajar.programPembelajaran',
            'subscriptions.paymentPlan',
        ]);

        $completedModuleIds = $user->progress->pluck('module_id')->all();
        $levels = LevelPembelajaran::with(['modules' => fn ($query) => $query->where('status', 'published')])
            ->orderBy('stage')
            ->get();

        $activity = $chartData->dailySeries($period, [
            'progress' => Progres::query()->where('user_id', $user->id)->where('updated_at', '>=', $fromDate)
                ->selectRaw('DATE(updated_at) as day, COUNT(*) as total')->groupBy('day')->pluck('total', 'day'),
            'quiz_attempts' => PengerjaanKuis::query()->where('user_id', $user->id)->where('attempted_at', '>=', $fromDate)
                ->selectRaw('DATE(attempted_at) as day, COUNT(*) as total')->groupBy('day')->pluck('total', 'day'),
        ]);

        return Inertia::render('Admin/DataUser/DetailUser', [
            'backHref' => route('superadmin.users'),
            'backLabel' => 'Kembali ke Data User',
            'activityRouteName' => 'superadmin.users.show',
            'filters' => ['period' => $period],
            'studentActivitySeries' => $activity,
            'student' => [
                'id' => $user->id,
                'username' => $user->username,
                'email' => $user->email,
                'avatar' => $user->avatar,
                'status' => $user->status,
                'subscription_status' => $user->subscription_status,
                'xp' => (int) $user->xp,
                'level' => (int) $user->level,
                'streak_count' => (int) $user->streak_count,
                'lessons_done' => $user->progress->count(),
                'quizzes_done' => $user->attempts->count(),
                'average_score' => round((float) $user->attempts->avg('score'), 1),
                'kloters' => $user->kloterBelajar->map(fn ($kloter) => [
                    'id' => $kloter->id,
                    'name' => $kloter->nama,
                    'program' => $kloter->programPembelajaran?->title,
                    'status' => $kloter->pivot?->status,
                    'joined_at' => $kloter->pivot?->joined_at
                        ? \Illuminate\Support\Carbon::parse($kloter->pivot->joined_at)->format('d M Y')
                        : null,
                ])->values(),
                'subscriptions' => $user->subscriptions->map(fn ($subscription) => [
                    'id' => $subscription->id,
                    'plan' => $subscription->paymentPlan?->name,
                    'scope' => $subscription->scope_type,
                    'status' => $subscription->status,
                    'ends_at' => optional($subscription->end_date)->format('d M Y'),
                ])->values(),
            ],
            'levelProgress' => $levels->map(function (LevelPembelajaran $level) use ($completedModuleIds) {
                $total = $level->modules->count();
                $completed = $level->modules->whereIn('id', $completedModuleIds)->count();

                return ['id' => $level->id, 'name' => $level->level_name, 'total_lessons' => $total, 'completed_lessons' => $completed, 'percentage' => $total > 0 ? round(($completed / $total) * 100) : 0];
            }),
            'recentProgress' => $user->progress->sortByDesc('updated_at')->take(10)->values()->map(fn (Progres $progress) => [
                'id' => $progress->id, 'lesson' => $progress->module?->title, 'completed_at' => optional($progress->completed_at ?? $progress->updated_at)->format('d M Y H:i'),
            ]),
            'recentAttempts' => $user->attempts->sortByDesc('attempted_at')->take(10)->values()->map(fn (PengerjaanKuis $attempt) => [
                'id' => $attempt->id, 'quiz' => $attempt->quiz?->type, 'lesson' => $attempt->quiz?->module?->title, 'score' => $attempt->score, 'xp_earned' => $attempt->xp_earned,
            ]),
            'rewardHistory' => LogReward::query()->where('user_id', $user->id)->latest()->take(10)->get()->map(fn (LogReward $log) => [
                'id' => $log->id, 'description' => $log->description, 'source_type' => $log->source_type, 'xp_amount' => $log->xp_amount, 'created_at' => $log->created_at->format('d M Y H:i'),
            ]),
        ]);
    }

    public function resetPassword(Request $request, Pengguna $user)
    {
        abort_if($user->role !== 'user', 404);

        $password = Str::password(10, true, true, false, false);

        $user->update([
            'password' => Hash::make($password),
        ]);

        $this->logActivity($request, 'user.password_reset', 'user', $user->id, "Reset password user {$user->username}");

        return redirect()->back()->with('generated_password', $password);
    }

    public function destroy(Request $request, Pengguna $user, AccountDeletionService $deletions)
    {
        abort_if($user->role !== 'user', 404);
        $name = $user->username;
        $deletions->permanentlyDelete($user, $request->user());
        $this->logActivity($request, 'user.deleted', 'user', $user->id, "Menghapus permanen user {$name}");

        return back()->with('success', 'Akun user berhasil dihapus permanen.');
    }

    public function anonymize(Request $request, Pengguna $user, AccountDeletionService $deletions)
    {
        abort_if($user->role !== 'user', 404);
        $name = $user->username;
        $deletions->anonymize($user, $request->user());
        $this->logActivity($request, 'user.anonymized', 'user', $user->id, "Menganonimkan user {$name}");

        return back()->with('success', 'Identitas user berhasil dianonimkan.');
    }
}
