<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Models\AnggotaKloter;
use App\Models\KloterBelajar;
use App\Models\Langganan;
use App\Models\LogAktivitas;
use App\Models\Modul;
use App\Models\PengerjaanKuis;
use App\Models\Pengguna;
use App\Models\Progres;
use App\Models\RiwayatLogin;
use App\Models\Transaksi;
use App\Models\UmpanBalikPembelajaran;
use App\Services\ChartDataService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;

class SuperAdminBerandaController extends SuperAdminDasarController
{
    public function __invoke(Request $request, ChartDataService $chartData)
    {
        $period = $chartData->resolvePeriod($request);
        $operations = Cache::remember('superadmin.dashboard.operations', 60, fn () => $this->operations());

        return Inertia::render('SuperAdmin/Beranda/Beranda', [
            'metrics' => Cache::remember("superadmin.dashboard.metrics.{$period}", 60, fn () => $this->metrics($period, $chartData)),
            'attentionQueue' => $operations['attention_queue'],
            'cohortPulse' => $operations['cohort_pulse'],
            'activities' => LogAktivitas::with('actor:id,username')
                ->latest()
                ->take(6)
                ->get()
                ->map(fn (LogAktivitas $log) => [
                    'actor' => $log->actor?->username ?? 'System',
                    'action' => $log->description ?: str($log->action)->replace(['.', '_'], ' ')->title()->toString(),
                    'target' => $log->target_type ? $log->target_type.' #'.$log->target_id : 'Platform',
                    'time' => $log->created_at?->diffForHumans() ?? '-',
                ])
                ->values(),
            'learningBars' => Cache::remember("superadmin.dashboard.learning_bars.{$period}", 60, fn () => $this->learningBars($period, $chartData)),
            'studentAccessDistribution' => Cache::remember('superadmin.dashboard.student_access_distribution', 60, fn () => $this->studentAccessDistribution()),
            'learningFeedback' => Cache::remember("superadmin.dashboard.learning_feedback.{$period}", 60, fn () => $this->learningFeedback($period, $chartData)),
            'quickActions' => $this->quickActions(),
            'filters' => ['period' => $period],
        ]);
    }

    /** @return array<int, array<string, mixed>> */
    private function metrics(int $period, ChartDataService $chartData): array
    {
        $from = $chartData->fromDate($period);
        $previousFrom = $from->copy()->subDays($period);
        $previousUntil = $from->copy()->subSecond();
        $successfulTransactions = fn ($start, $until = null) => Transaksi::query()
            ->where('status', 'success')
            ->whereRaw('COALESCE(processed_at, created_at) >= ?', [$start])
            ->when($until, fn (Builder $query) => $query->whereRaw('COALESCE(processed_at, created_at) <= ?', [$until]));

        $revenue = (int) (clone $successfulTransactions($from))->sum('amount');
        $previousRevenue = (int) (clone $successfulTransactions($previousFrom, $previousUntil))->sum('amount');
        $activeLearners = Pengguna::query()
            ->where('role', 'user')
            ->whereDate('last_activity_date', '>=', $from->toDateString())
            ->count();
        $previousActiveLearners = Pengguna::query()
            ->where('role', 'user')
            ->whereBetween('last_activity_date', [$previousFrom->toDateString(), $previousUntil->toDateString()])
            ->count();
        $payments = (clone $successfulTransactions($from))->count();
        $previousPayments = (clone $successfulTransactions($previousFrom, $previousUntil))->count();
        $premiumUsers = Langganan::query()
            ->where('status', 'active')
            ->whereDate('end_date', '>=', today())
            ->distinct('user_id')
            ->count('user_id');

        return [
            $this->metric('Pendapatan', 'Rp '.number_format($revenue), 'payments', route('superadmin.payments'), $this->comparison($revenue, $previousRevenue)),
            $this->metric('Premium aktif', number_format($premiumUsers), 'premium', route('superadmin.payments'), ['change' => '', 'changeType' => 'up']),
            $this->metric("Siswa aktif {$period} hari", number_format($activeLearners), 'learners', route('superadmin.users'), $this->comparison($activeLearners, $previousActiveLearners)),
            $this->metric('Pembayaran sukses', number_format($payments), 'success', route('superadmin.payments'), $this->comparison($payments, $previousPayments)),
        ];
    }

    /** @return array{attention_queue:array<int, array<string,mixed>>,cohort_pulse:array<int, array<string,mixed>>} */
    private function operations(): array
    {
        $activeKloters = KloterBelajar::query()
            ->with(['programPembelajaran:id,title', 'admin:id,username,status,admin_scope'])
            ->withCount(['anggota as active_members_count' => fn (Builder $query) => $query->where('status', 'active')])
            ->where('status', 'active')
            ->where(function (Builder $query) {
                $query->whereNull('tanggal_selesai')
                    ->orWhereDate('tanggal_selesai', '>=', today());
            })
            ->orderBy('tanggal_mulai')
            ->get();
        $weekByKloter = $activeKloters->mapWithKeys(function (KloterBelajar $kloter) {
            $week = $kloter->tanggal_mulai && ! $kloter->tanggal_mulai->isFuture()
                ? max(1, (int) floor($kloter->tanggal_mulai->copy()->startOfDay()->diffInDays(now()->startOfDay()) / 7) + 1)
                : 0;

            return [$kloter->id => $week];
        });
        $programWeeks = $activeKloters
            ->map(fn (KloterBelajar $kloter) => [(int) $kloter->program_pembelajaran_id, (int) $weekByKloter->get($kloter->id)])
            ->filter(fn (array $context) => $context[1] > 0)
            ->values();
        $currentModules = Modul::query()
            ->whereIn('program_pembelajaran_id', $programWeeks->pluck(0)->unique())
            ->whereIn('week_number', $programWeeks->pluck(1)->unique())
            ->get(['id', 'program_pembelajaran_id', 'week_number', 'status'])
            ->keyBy(fn (Modul $module) => $module->program_pembelajaran_id.':'.$module->week_number);
        $cohortPulse = $activeKloters->take(6)->map(function (KloterBelajar $kloter) use ($weekByKloter, $currentModules) {
            $week = (int) $weekByKloter->get($kloter->id);
            $module = $week > 0 ? $currentModules->get($kloter->program_pembelajaran_id.':'.$week) : null;
            $mentorReady = $kloter->admin
                && $kloter->admin->status === 'active'
                && $kloter->admin->admin_scope === Pengguna::ADMIN_SCOPE_KLOTER;
            $capacity = $kloter->max_siswa
                ? "{$kloter->active_members_count} / {$kloter->max_siswa}"
                : "{$kloter->active_members_count} siswa";

            return [
                'id' => $kloter->id,
                'name' => $kloter->nama,
                'program' => $kloter->programPembelajaran?->title ?? 'Tanpa program',
                'mentor' => $kloter->admin?->username ?? 'Belum ditugaskan',
                'mentor_ready' => $mentorReady,
                'week' => $week === 0 ? 'Belum mulai' : "Minggu {$week}",
                'capacity' => $capacity,
                'content_ready' => $module?->status === 'published',
                'content_label' => $module ? ($module->status === 'published' ? 'Modul siap' : 'Modul belum publish') : 'Modul belum tersedia',
            ];
        })->values();
        $pendingPayments = Transaksi::query()->where('status', 'pending')->count();
        $failedPayments = Transaksi::query()->where('status', 'failed')->where('created_at', '>=', now()->subDays(7))->count();
        $paidWithoutCohort = Pengguna::query()
            ->where('role', 'user')
            ->whereHas('subscriptions', fn (Builder $query) => $query
                ->where('status', 'active')
                ->whereDate('end_date', '>=', today()))
            ->whereDoesntHave('anggotaKloter', fn (Builder $query) => $query->where('status', 'active'))
            ->count();
        $withoutMentor = $activeKloters->filter(fn (KloterBelajar $kloter) => ! $kloter->admin || $kloter->admin->status !== 'active' || $kloter->admin->admin_scope !== Pengguna::ADMIN_SCOPE_KLOTER)->count();
        $nearCapacity = $activeKloters->filter(fn (KloterBelajar $kloter) => $kloter->max_siswa && $kloter->active_members_count / $kloter->max_siswa >= 0.85)->count();
        $contentNotReady = $cohortPulse->filter(fn (array $cohort) => $cohort['week'] !== 'Belum mulai' && ! $cohort['content_ready'])->count();

        $attentionQueue = [
            $this->attentionItem('Pembayaran menunggu', $pendingPayments, 'Transaksi belum memiliki status final.', 'warning', route('superadmin.payments')),
            $this->attentionItem('Bayar, belum masuk kloter', $paidWithoutCohort, 'Siswa premium aktif tetapi belum menjadi anggota kloter.', 'danger', route('superadmin.kloters')),
            $this->attentionItem('Kloter tanpa mentor', $withoutMentor, 'Kloter aktif harus memiliki Mentor Kelas yang aktif.', 'danger', route('superadmin.kloters')),
            $this->attentionItem('Kloter hampir penuh', $nearCapacity, 'Kapasitas sudah mencapai minimal 85%.', 'warning', route('superadmin.kloters')),
            $this->attentionItem('Materi minggu ini belum siap', $contentNotReady, 'Modul aktif belum tersedia atau belum dipublikasikan.', 'info', route('superadmin.content')),
            $this->attentionItem('Pembayaran gagal 7 hari', $failedPayments, 'Periksa bila pola kegagalan meningkat.', 'info', route('superadmin.payments')),
        ];

        return [
            'attention_queue' => $attentionQueue,
            'cohort_pulse' => $cohortPulse->all(),
        ];
    }

    /** @return array<int, array<string, float|string>> */
    private function learningBars(int $period, ChartDataService $chartData): array
    {
        $fromDate = $chartData->fromDate($period);

        return $chartData->dailySeries($period, [
            'modules_completed' => Progres::query()
                ->whereNotNull('completed_at')
                ->where('completed_at', '>=', $fromDate)
                ->selectRaw('DATE(completed_at) as day, COUNT(*) as total')
                ->groupBy('day')
                ->pluck('total', 'day'),
            'quiz_attempts' => PengerjaanKuis::query()
                ->where('attempted_at', '>=', $fromDate)
                ->selectRaw('DATE(attempted_at) as day, COUNT(*) as total')
                ->groupBy('day')
                ->pluck('total', 'day'),
        ]);
    }

    /** @return array<int, array<string, int|string>> */
    private function studentAccessDistribution(): array
    {
        $base = Pengguna::query()->where('role', 'user');
        $suspended = (clone $base)->where('status', 'suspended')->count();
        $premium = (clone $base)
            ->where('status', 'active')
            ->whereHas('subscriptions', fn (Builder $query) => $query
                ->where('status', 'active')
                ->whereDate('end_date', '>=', today()))
            ->count();
        $free = max(0, (clone $base)->where('status', 'active')->count() - $premium);

        return [
            ['label' => 'Premium aktif', 'value' => $premium, 'fill' => 'var(--color-premium)'],
            ['label' => 'Gratis / berakhir', 'value' => $free, 'fill' => 'var(--color-free)'],
            ['label' => 'Ditangguhkan', 'value' => $suspended, 'fill' => 'var(--color-suspended)'],
        ];
    }

    /** @return array<int, array{label:string,value:int,tone:string}> */
    private function learningFeedback(int $period, ChartDataService $chartData): array
    {
        $counts = UmpanBalikPembelajaran::query()
            ->where('feedback_date', '>=', $chartData->fromDate($period)->toDateString())
            ->selectRaw('rating, COUNT(*) as total')
            ->groupBy('rating')
            ->pluck('total', 'rating');

        return [
            ['label' => 'Perlu diulang', 'value' => (int) ($counts->get('repeat') ?? 0), 'tone' => 'red'],
            ['label' => 'Pas', 'value' => (int) ($counts->get('just_right') ?? 0), 'tone' => 'amber'],
            ['label' => 'Terlalu mudah', 'value' => (int) ($counts->get('easy') ?? 0), 'tone' => 'emerald'],
        ];
    }

    /** @return array<int, array<string, string>> */
    private function quickActions(): array
    {
        return [
            ['label' => 'Pembayaran', 'description' => 'Transaksi, paket, dan access key.', 'href' => route('superadmin.payments'), 'icon' => 'payments'],
            ['label' => 'Kloter', 'description' => 'Mentor, siswa, kapasitas, dan jadwal.', 'href' => route('superadmin.kloters'), 'icon' => 'cohorts'],
            ['label' => 'Pengguna', 'description' => 'Status akun dan akses belajar.', 'href' => route('superadmin.users'), 'icon' => 'users'],
            ['label' => 'Konten', 'description' => 'Berita dan status konten platform.', 'href' => route('superadmin.content'), 'icon' => 'content'],
            ['label' => 'Gamifikasi', 'description' => 'XP, liga, dan pencapaian.', 'href' => route('superadmin.gamification'), 'icon' => 'gamification'],
            ['label' => 'Aktivitas', 'description' => 'Audit log serta riwayat login.', 'href' => route('superadmin.activity'), 'icon' => 'activity'],
        ];
    }

    /** @return array{title:string,value:string,icon:string,href:string,change:string,changeType:string} */
    private function metric(string $title, string $value, string $icon, string $href, array $comparison): array
    {
        return [...compact('title', 'value', 'icon', 'href'), ...$comparison];
    }

    /** @return array{change:string,changeType:string} */
    private function comparison(int $current, int $previous): array
    {
        if ($previous === 0) {
            return ['change' => $current > 0 ? 'Periode baru' : '', 'changeType' => 'up'];
        }

        return [
            'change' => number_format(abs(($current - $previous) / $previous * 100), 0).'% vs sebelumnya',
            'changeType' => $current >= $previous ? 'up' : 'down',
        ];
    }

    /** @return array{label:string,value:int,description:string,tone:string,href:string} */
    private function attentionItem(string $label, int $value, string $description, string $tone, string $href): array
    {
        return compact('label', 'value', 'description', 'tone', 'href');
    }
}
