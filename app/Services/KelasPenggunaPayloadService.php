<?php

namespace App\Services;

use App\Models\AnggotaKloter;
use App\Models\PaketPembayaran;
use App\Models\Pengguna;
use App\Models\ProgramPembelajaran;
use Illuminate\Support\Collection;

class KelasPenggunaPayloadService
{
    public function __construct(
        private readonly AksesPremiumService $aksesPremium,
        private readonly KloterBelajarService $kloterService,
    ) {
    }

    public function forProgram(Pengguna $user, ProgramPembelajaran $program): array
    {
        $program->loadMissing([
            'level:id,level_name',
            'paymentPlans' => fn ($query) => $query
                ->where('is_active', true)
                ->where('price', '>', 0)
                ->whereIn('scope_type', [
                    AksesLanggananService::SCOPE_PROGRAM,
                    AksesLanggananService::SCOPE_KLOTER,
                ])
                ->orderBy('price'),
        ]);

        $plans = $program->paymentPlans;
        $firstPlan = $plans->first();
        $hasMentoredPlan = $plans->contains(
            fn (PaketPembayaran $plan) => $plan->scope_type === AksesLanggananService::SCOPE_KLOTER
        );
        $enrollmentStates = AnggotaKloter::query()
            ->with(['kloterBelajar.admin:id,username', 'transaction:id,transaction_code'])
            ->where('user_id', $user->id)
            ->whereIn('status', ['paid_pending_approval', 'rejected'])
            ->whereHas('kloterBelajar', fn ($query) => $query
                ->where('program_pembelajaran_id', $program->id))
            ->whereHas('transaction', fn ($query) => $query->where('status', 'success'))
            ->latest('updated_at')
            ->get();
        $kloterAktif = $this->kloterService->kloterAktifUser($user, $program->id);
        $pendingEnrollment = $enrollmentStates->firstWhere('status', 'paid_pending_approval');
        $rejectedEnrollment = $enrollmentStates->firstWhere('status', 'rejected');
        $mode = $firstPlan?->scope_type;
        $hasClassAccess = $this->aksesPremium->punyaAksesKelas($user, $program->id);

        return [
            'thumbnail_url' => $this->thumbnailUrl($program->thumbnail_url),
            'instructor_name' => $program->instructor_name,
            'level' => $program->level?->level_name,
            'type' => $program->level?->level_name ? 'Kelas '.$program->level->level_name : 'Kelas utama',
            'status' => $hasClassAccess ? 'Aktif' : 'Preview',
            'has_class_access' => $hasClassAccess,
            'waiting_for_kloter' => false,
            'waiting_for_approval' => (bool) $pendingEnrollment,
            'refund_required' => (bool) $rejectedEnrollment,
            'access_mode' => $mode,
            'access_mode_label' => ($mode !== null ? $mode === AksesLanggananService::SCOPE_KLOTER : $program->isMentor()) ? 'Kelas Mentor' : 'Kelas Mandiri',
            'kloter' => $kloterAktif ? [
                'id' => $kloterAktif->id,
                'nama' => $kloterAktif->nama,
                'kode' => $kloterAktif->kode,
                'admin_name' => $kloterAktif->admin?->username,
                'tanggal_mulai' => optional($kloterAktif->tanggal_mulai)->toDateString(),
                'tanggal_mulai_label' => optional($kloterAktif->tanggal_mulai)->format('d M Y'),
                'minggu_aktif' => $this->kloterService->mingguAktif($kloterAktif),
            ] : null,
            'payment_plan' => $firstPlan ? $this->planPayload($firstPlan, $user) : null,
            'payment_plans' => $plans->map(fn (PaketPembayaran $plan) => $this->planPayload($plan, $user))->values(),
            'available_kloters' => $hasMentoredPlan
                ? $this->kloterPayloads($this->kloterService->kloterTersediaUntukCheckout($program->id))
                : [],
            'pending_enrollment' => $pendingEnrollment ? [
                'kloter_name' => $pendingEnrollment->kloterBelajar?->nama,
                'mentor_name' => $pendingEnrollment->kloterBelajar?->admin?->username,
                'transaction_code' => $pendingEnrollment->transaction?->transaction_code,
            ] : null,
            'rejected_enrollment' => $rejectedEnrollment ? [
                'kloter_name' => $rejectedEnrollment->kloterBelajar?->nama,
                'mentor_name' => $rejectedEnrollment->kloterBelajar?->admin?->username,
                'transaction_code' => $rejectedEnrollment->transaction?->transaction_code,
            ] : null,
        ];
    }

    private function planPayload(PaketPembayaran $plan, ?Pengguna $user = null): array
    {
        $discount = $user
            ? app(ReferralService::class)->discountForCheckout($user, (int) $plan->price)
            : null;

        return [
            'id' => $plan->id,
            'name' => $plan->name,
            'price' => $plan->price,
            'price_formatted' => 'Rp '.number_format($plan->price),
            'discounted_price' => $discount && $discount['discount_amount'] > 0 ? $discount['final_amount'] : null,
            'discounted_price_formatted' => $discount && $discount['discount_amount'] > 0 ? 'Rp '.number_format($discount['final_amount']) : null,
            'referral_discount_percent' => $discount && $discount['discount_amount'] > 0 ? $discount['percent'] : 0,
            'duration_days' => $plan->duration_days,
            'scope_type' => $plan->scope_type,
        ];
    }

    private function kloterPayloads(Collection $kloters): array
    {
        return $kloters->map(fn ($kloter) => [
            'id' => $kloter->id,
            'name' => $kloter->nama,
            'mentor_name' => $kloter->admin?->username,
            'start_date' => optional($kloter->tanggal_mulai)->toDateString(),
            'start_date_label' => optional($kloter->tanggal_mulai)->format('d M Y'),
            'max_students' => $kloter->max_siswa,
            'remaining_seats' => $kloter->remaining_seats,
        ])->values()->all();
    }

    public function thumbnailUrl(?string $thumbnailUrl): ?string
    {
        if (! $thumbnailUrl || str_starts_with($thumbnailUrl, 'http://') || str_starts_with($thumbnailUrl, 'https://')) {
            return $thumbnailUrl;
        }

        $relativePath = '/'.ltrim($thumbnailUrl, '/');
        $publicFile = public_path(ltrim($relativePath, '/'));

        return is_file($publicFile) ? $relativePath.'?v='.filemtime($publicFile) : $relativePath;
    }
}
