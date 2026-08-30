<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Models\LogAktivitas;
use App\Models\Pengguna;
use App\Models\RiwayatLogin;
use App\Models\UmpanBalikProduk;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\StreamedResponse;

class SuperAdminAktivitasController extends SuperAdminDasarController
{
    public function __invoke(Request $request)
    {
        $filters = [
            'view' => $request->string('view')->value() === 'feedback' ? 'feedback' : 'activity',
            'date_from' => $request->date('date_from')?->toDateString(),
            'date_to' => $request->date('date_to')?->toDateString(),
            'actor_id' => $request->integer('actor_id') ?: null,
            'action' => $request->string('action')->value() ?: 'all',
            'login_status' => $request->string('login_status')->value() ?: 'all',
            'feedback_category' => $request->string('feedback_category')->value() ?: 'all',
            'feedback_status' => $request->string('feedback_status')->value() ?: 'all',
            'feedback_role' => $request->string('feedback_role')->value() ?: 'all',
            'feedback_search' => trim($request->string('feedback_search')->value()),
        ];

        $timeline = LogAktivitas::with('actor:id,username')
            ->when($filters['date_from'], fn ($query, $date) => $query->whereDate('created_at', '>=', $date))
            ->when($filters['date_to'], fn ($query, $date) => $query->whereDate('created_at', '<=', $date))
            ->when($filters['actor_id'], fn ($query, $actorId) => $query->where('actor_id', $actorId))
            ->when($filters['action'] !== 'all', fn ($query) => $query->where('action', $filters['action']))
            ->latest()
            ->paginate(15, ['*'], 'timeline_page')
            ->withQueryString()
            ->through(fn (LogAktivitas $log) => [
                'actor' => $log->actor?->username ?? 'System',
                'action' => $this->displayAction($log->action),
                'target' => $log->target_type ? $log->target_type . ' #' . $log->target_id : '-',
                'time' => $log->created_at?->diffForHumans() ?? '-',
                'tone' => $this->toneForAction($log->action),
            ]);

        $logins = RiwayatLogin::with('user:id,username')
            ->when($filters['date_from'], fn ($query, $date) => $query->whereDate('logged_in_at', '>=', $date))
            ->when($filters['date_to'], fn ($query, $date) => $query->whereDate('logged_in_at', '<=', $date))
            ->when($filters['login_status'] !== 'all', fn ($query) => $query->where('status', $filters['login_status']))
            ->latest('logged_in_at')
            ->paginate(10, ['*'], 'login_page')
            ->withQueryString()
            ->through(fn (RiwayatLogin $history) => [
                'user' => $history->user?->username ?? $history->email ?? 'Unknown',
                'role' => ucfirst($history->role ?? '-'),
                'status' => $history->status === 'success' ? 'Berhasil' : 'Ditolak',
                'location' => $history->ip_address ?? '-',
                'device' => str($history->user_agent ?? '-')->limit(48)->toString(),
            ]);

        $feedback = $this->feedbackQuery($filters)
            ->with(['user:id,username,email', 'handler:id,username'])
            ->latest()
            ->paginate(15, ['*'], 'feedback_page')
            ->withQueryString()
            ->through(fn (UmpanBalikProduk $item) => [
                'id' => $item->id,
                'reporter' => $item->user?->username ?? 'Akun dihapus',
                'email' => $item->user?->email,
                'role' => $item->role_snapshot,
                'category' => $item->category,
                'status' => $item->status,
                'message' => $item->message,
                'page_url' => $item->page_url,
                'device' => Str::limit((string) $item->user_agent, 80),
                'resolution_note' => $item->resolution_note,
                'handler' => $item->handler?->username,
                'created_at' => $item->created_at?->format('d M Y H:i'),
                'handled_at' => $item->handled_at?->format('d M Y H:i'),
            ]);

        return Inertia::render('SuperAdmin/Aktivitas/Aktivitas', [
            'activityStats' => [
                $this->stat('Aksi Hari Ini', number_format(LogAktivitas::whereDate('created_at', today())->count()), 'L'),
                $this->stat('Login Berhasil', number_format(RiwayatLogin::where('status', 'success')->whereDate('logged_in_at', today())->count()), 'IN'),
                $this->stat('Perubahan Status', number_format(LogAktivitas::where('action', 'like', '%.status_changed')->count()), 'S'),
                $this->stat('Login Ditolak', number_format(RiwayatLogin::where('status', 'failed')->whereDate('logged_in_at', today())->count()), '!', '0', 'down'),
            ],
            'timeline' => $timeline,
            'logins' => $logins,
            'productFeedback' => $feedback,
            'feedbackStats' => [
                'new' => UmpanBalikProduk::where('status', 'new')->count(),
                'reviewing' => UmpanBalikProduk::where('status', 'reviewing')->count(),
                'resolved' => UmpanBalikProduk::where('status', 'resolved')->count(),
            ],
            'riskyEvents' => $this->riskyEvents(),
            'filters' => $filters,
            'filterOptions' => [
                'actors' => Pengguna::query()
                    ->whereIn('role', ['admin', 'superadmin'])
                    ->orderBy('username')
                    ->get(['id', 'username'])
                    ->map(fn (Pengguna $user) => ['id' => $user->id, 'name' => $user->username]),
                'actions' => LogAktivitas::query()
                    ->select('action')
                    ->distinct()
                    ->orderBy('action')
                    ->limit(50)
                    ->pluck('action')
                    ->map(fn (string $action) => ['value' => $action, 'label' => $this->displayAction($action)])
                    ->values(),
            ],
        ]);
    }

    public function updateFeedback(Request $request, UmpanBalikProduk $feedback): RedirectResponse
    {
        $validated = $request->validate([
            'status' => ['required', Rule::in(['new', 'reviewing', 'resolved'])],
            'resolution_note' => ['nullable', 'string', 'max:3000'],
        ]);

        $feedback->update([
            'status' => $validated['status'],
            'resolution_note' => trim((string) ($validated['resolution_note'] ?? '')) ?: null,
            'handled_by' => $validated['status'] === 'new' ? null : $request->user()->id,
            'handled_at' => $validated['status'] === 'new' ? null : now(),
        ]);

        $this->logActivity(
            $request,
            'product_feedback.status_changed',
            'product_feedback',
            $feedback->id,
            "Mengubah status feedback #{$feedback->id} menjadi {$validated['status']}"
        );

        return back()->with('success', 'Status feedback berhasil diperbarui.');
    }

    public function exportFeedback(Request $request): StreamedResponse
    {
        $filters = [
            'feedback_category' => $request->string('feedback_category')->value() ?: 'all',
            'feedback_status' => $request->string('feedback_status')->value() ?: 'all',
            'feedback_role' => $request->string('feedback_role')->value() ?: 'all',
            'feedback_search' => trim($request->string('feedback_search')->value()),
        ];

        $fileName = 'feedback-toku-up-'.now()->format('Ymd-His').'.csv';

        return response()->streamDownload(function () use ($filters): void {
            $handle = fopen('php://output', 'wb');
            fwrite($handle, "\xEF\xBB\xBF");
            fputcsv($handle, ['ID', 'Tanggal', 'Pelapor', 'Role', 'Kategori', 'Status', 'Halaman', 'Pesan', 'Catatan Penyelesaian', 'Ditangani Oleh']);

            $this->feedbackQuery($filters)
                ->with(['user:id,username', 'handler:id,username'])
                ->oldest()
                ->chunkById(250, function ($items) use ($handle): void {
                    foreach ($items as $item) {
                        fputcsv($handle, array_map([$this, 'safeCsvCell'], [
                            $item->id,
                            $item->created_at?->format('Y-m-d H:i:s'),
                            $item->user?->username ?? 'Akun dihapus',
                            $item->role_snapshot,
                            $item->category,
                            $item->status,
                            $item->page_url,
                            $item->message,
                            $item->resolution_note,
                            $item->handler?->username,
                        ]));
                    }
                });

            fclose($handle);
        }, $fileName, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    private function feedbackQuery(array $filters): Builder
    {
        return UmpanBalikProduk::query()
            ->when(($filters['feedback_category'] ?? 'all') !== 'all', fn (Builder $query) => $query->where('category', $filters['feedback_category']))
            ->when(($filters['feedback_status'] ?? 'all') !== 'all', fn (Builder $query) => $query->where('status', $filters['feedback_status']))
            ->when(($filters['feedback_role'] ?? 'all') !== 'all', fn (Builder $query) => $query->where('role_snapshot', $filters['feedback_role']))
            ->when($filters['feedback_search'] ?? null, function (Builder $query, string $search): void {
                $query->where(function (Builder $inner) use ($search): void {
                    $inner->where('message', 'like', "%{$search}%")
                        ->orWhere('page_url', 'like', "%{$search}%")
                        ->orWhereHas('user', fn (Builder $user) => $user
                            ->where('username', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%"));
                });
            });
    }

    public function safeCsvCell(mixed $value): string
    {
        $value = str_replace(["\r\n", "\r"], "\n", (string) ($value ?? ''));

        return preg_match('/^[=+\-@]/', ltrim($value)) ? "'{$value}" : $value;
    }

    private function displayAction(string $action): string
    {
        return Str::of($action)
            ->replace(['.', '_'], ' ')
            ->title()
            ->toString();
    }

    private function toneForAction(string $action): string
    {
        if (Str::contains($action, ['delete', 'destroy', 'suspend', 'reset'])) {
            return 'red';
        }

        if (Str::contains($action, ['update', 'changed', 'archive'])) {
            return 'amber';
        }

        if (Str::contains($action, ['created', 'store', 'publish'])) {
            return 'emerald';
        }

        return 'blue';
    }

    private function riskyEvents(): array
    {
        $events = [];
        $failedLoginCount = RiwayatLogin::where('status', 'failed')->whereDate('logged_in_at', today())->count();
        $resetCount = LogAktivitas::where('action', 'like', '%.password_reset')->whereDate('created_at', today())->count();

        if ($failedLoginCount > 0) {
            $events[] = "{$failedLoginCount} login ditolak hari ini. Cek IP dan akun terkait.";
        }

        if ($resetCount > 0) {
            $events[] = "{$resetCount} reset password dilakukan hari ini.";
        }

        if (empty($events)) {
            $events[] = 'Tidak ada aktivitas berisiko tinggi hari ini.';
        }

        return $events;
    }
}
