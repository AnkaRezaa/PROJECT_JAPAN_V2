<?php

namespace App\Services;

use App\Models\AnggotaKloter;
use App\Models\KloterBelajar;
use App\Models\KodeAkses;
use App\Models\Langganan;
use App\Models\Pengguna;
use App\Models\Modul;
use App\Models\ProgramPembelajaran;
use App\Models\Transaksi;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

class KloterBelajarService
{
    public function kloterDikelola(Pengguna $admin): Builder
    {
        abort_unless($admin->role === 'admin', 403);

        return KloterBelajar::query()
            ->when($admin->isMentor(), fn (Builder $query) => $query->where('admin_id', $admin->id));
    }

    public function resolveKloterDikelola(Pengguna $admin, ?int $kloterId): ?KloterBelajar
    {
        if (! $kloterId) {
            return null;
        }

        return $this->kloterDikelola($admin)->findOrFail($kloterId);
    }

    public function pilihanKloterAdmin(Pengguna $admin): Collection
    {
        return $this->kloterDikelola($admin)
            ->with('programPembelajaran:id,title')
            ->withCount(['anggota as anggota_aktif_count' => fn (Builder $query) => $query->where('status', 'active')])
            ->orderByRaw("CASE status WHEN 'active' THEN 0 WHEN 'draft' THEN 1 ELSE 2 END")
            ->orderByDesc('tanggal_mulai')
            ->get()
            ->map(fn (KloterBelajar $kloter) => [
                'id' => $kloter->id,
                'name' => $kloter->nama,
                'program_name' => $kloter->programPembelajaran?->title,
                'program_id' => $kloter->program_pembelajaran_id,
                'status' => $kloter->status,
                'tanggal_mulai' => optional($kloter->tanggal_mulai)->format('Y-m-d'),
                'tanggal_selesai' => optional($kloter->tanggal_selesai)->format('Y-m-d'),
                'anggota_aktif_count' => (int) $kloter->anggota_aktif_count,
                'max_siswa' => $kloter->max_siswa,
                'is_read_only' => $kloter->status === 'archived',
            ]);
    }

    public function programIdsDikelola(Pengguna $admin, ?KloterBelajar $kloter = null): ?Collection
    {
        if ($kloter) {
            return collect([(int) $kloter->program_pembelajaran_id]);
        }

        if ($admin->isAdminGlobal()) {
            return null;
        }

        return $this->kloterDikelola($admin)
            ->distinct()
            ->pluck('program_pembelajaran_id')
            ->map(fn ($id) => (int) $id)
            ->values();
    }

    public function batasiProgramDikelola(Builder $query, Pengguna $admin): Builder
    {
        $programIds = $this->programIdsDikelola($admin);

        return $programIds === null ? $query : $query->whereIn('id', $programIds);
    }

    public function abortJikaProgramDiLuarCakupan(Pengguna $admin, ProgramPembelajaran|int $program): void
    {
        $programId = $program instanceof ProgramPembelajaran ? $program->id : $program;
        $allowed = $this->batasiProgramDikelola(ProgramPembelajaran::query()->whereKey($programId), $admin)->exists();

        abort_unless($allowed, 403, 'Kelas ini berada di luar cakupan Mentor Kelas Anda.');
    }

    public function abortJikaModulDiLuarCakupan(Pengguna $admin, Modul|int $module): void
    {
        $model = $module instanceof Modul ? $module : Modul::query()->findOrFail($module);
        $this->abortJikaProgramDiLuarCakupan($admin, (int) $model->program_pembelajaran_id);
    }

    public function batasiSiswaDikelola(Builder $query, Pengguna $admin, ?KloterBelajar $kloter = null): Builder
    {
        if ($admin->isAdminGlobal() && ! $kloter) {
            return $query;
        }

        return $query->whereHas('anggotaKloter', function (Builder $anggotaQuery) use ($admin, $kloter) {
            $anggotaQuery
                ->where('status', 'active')
                ->whereHas('kloterBelajar', function (Builder $kloterQuery) use ($admin, $kloter) {
                    $kloterQuery
                        ->when($admin->isMentor(), fn (Builder $query) => $query->where('admin_id', $admin->id))
                        ->when($kloter, fn (Builder $query) => $query->whereKey($kloter->id));
                });
        });
    }

    public function abortJikaSiswaDiLuarCakupan(Pengguna $admin, Pengguna $student): void
    {
        abort_unless($student->role === 'user', 404);

        $allowed = $this->batasiSiswaDikelola(
            Pengguna::query()->whereKey($student->id),
            $admin
        )->exists();

        abort_unless($allowed, 403, 'Siswa ini bukan anggota kloter yang Anda kelola.');
    }

    public function abortJikaKloterDiLuarCakupan(Pengguna $admin, KloterBelajar $kloter): void
    {
        abort_unless(
            $admin->isAdminGlobal() || ($admin->isMentor() && $kloter->admin_id === $admin->id),
            403,
            'Kloter ini berada di luar cakupan akun Anda.'
        );
    }

    public function kloterUntukPembayaran(?int $programPembelajaranId): ?KloterBelajar
    {
        $query = KloterBelajar::query()
            ->where('status', 'active')
            ->whereDate('tanggal_mulai', '<=', now()->toDateString())
            ->where(function ($query) {
                $query->whereNull('tanggal_selesai')
                    ->orWhereDate('tanggal_selesai', '>=', now()->toDateString());
            });

        if ($programPembelajaranId) {
            $query->where('program_pembelajaran_id', $programPembelajaranId);
        }

        return $query
            ->withCount(['anggota as anggota_aktif_count' => fn ($query) => $query->where('status', 'active')])
            ->orderByDesc('is_default')
            ->orderByDesc('tanggal_mulai')
            ->orderByDesc('id')
            ->get()
            ->first(fn (KloterBelajar $kloter) => $this->masihAdaKapasitas($kloter));
    }

    public function kloterTersediaUntukCheckout(int $programPembelajaranId): Collection
    {
        return KloterBelajar::query()
            ->with(['admin:id,username', 'programPembelajaran:id,title'])
            ->where('program_pembelajaran_id', $programPembelajaranId)
            ->where('status', 'active')
            ->whereNotNull('admin_id')
            ->where(function (Builder $query) {
                $query->whereNull('tanggal_selesai')
                    ->orWhereDate('tanggal_selesai', '>=', now()->toDateString());
            })
            ->orderByDesc('is_default')
            ->orderBy('tanggal_mulai')
            ->get()
            ->filter(function (KloterBelajar $kloter) {
                $remainingSeats = $this->sisaKapasitas($kloter);
                $kloter->setAttribute('remaining_seats', $remainingSeats);

                return $remainingSeats === null || $remainingSeats > 0;
            })
            ->values();
    }

    public function validasiKloterCheckout(KloterBelajar $kloter, int $programPembelajaranId): void
    {
        if ((int) $kloter->program_pembelajaran_id !== $programPembelajaranId) {
            throw ValidationException::withMessages([
                'kloter_belajar_id' => 'Kloter tidak sesuai dengan kelas yang dipilih.',
            ]);
        }

        if ($kloter->status !== 'active' || ($kloter->tanggal_selesai && $kloter->tanggal_selesai->isPast())) {
            throw ValidationException::withMessages([
                'kloter_belajar_id' => 'Kloter tidak aktif atau masa pendaftarannya sudah berakhir.',
            ]);
        }

        $mentorValid = $kloter->admin()
            ->where('role', 'admin')
            ->where('status', 'active')
            ->exists();

        if (! $mentorValid) {
            throw ValidationException::withMessages([
                'kloter_belajar_id' => 'Kloter belum memiliki mentor aktif.',
            ]);
        }

        if (! $this->masihAdaKapasitas($kloter)) {
            throw ValidationException::withMessages([
                'kloter_belajar_id' => 'Kapasitas kloter sudah penuh.',
            ]);
        }
    }

    public function reservePaymentSeat(Pengguna $user, KloterBelajar $kloter, Transaksi $transaction): AnggotaKloter
    {
        $existingActive = AnggotaKloter::query()
            ->where('user_id', $user->id)
            ->where('status', 'active')
            ->whereHas('kloterBelajar', fn (Builder $query) => $query
                ->where('program_pembelajaran_id', $kloter->program_pembelajaran_id))
            ->exists();

        if ($existingActive) {
            throw ValidationException::withMessages([
                'payment_plan_id' => 'Kamu sudah memiliki akses aktif untuk kelas ini.',
            ]);
        }

        if (! $this->masihAdaKapasitas($kloter, $user->id)) {
            throw ValidationException::withMessages([
                'kloter_belajar_id' => 'Kapasitas kloter sudah penuh.',
            ]);
        }

        $anggota = AnggotaKloter::firstOrNew([
            'kloter_belajar_id' => $kloter->id,
            'user_id' => $user->id,
        ]);

        if (
            $anggota->exists
            && $anggota->status === 'rejected'
            && $anggota->transaction?->status === 'success'
        ) {
            throw ValidationException::withMessages([
                'payment_plan_id' => 'Refund pendaftaran sebelumnya masih diproses. Tunggu sampai refund selesai sebelum checkout lagi.',
            ]);
        }

        if ($anggota->exists && in_array($anggota->status, ['active', 'paid_pending_approval'], true)) {
            throw ValidationException::withMessages([
                'payment_plan_id' => 'Pendaftaran kelas ini sudah aktif atau sedang menunggu persetujuan.',
            ]);
        }

        $anggota->fill([
            'transaction_id' => $transaction->id,
            'subscription_id' => null,
            'access_key_id' => null,
            'joined_at' => $anggota->joined_at ?: now(),
            'status' => 'pending_payment',
            'catatan' => 'Kursi dicadangkan saat checkout Midtrans dibuat.',
        ])->save();

        return $anggota;
    }

    public function releasePaymentReservation(Transaksi $transaction, string $status = 'cancelled'): void
    {
        AnggotaKloter::query()
            ->where('transaction_id', $transaction->id)
            ->whereIn('status', ['pending_payment', 'paid_pending_approval'])
            ->update([
                'status' => $status,
                'catatan' => 'Reservasi ditutup karena status pembayaran '.$transaction->status.'.',
            ]);
    }

    public function assignUser(
        Pengguna $user,
        KloterBelajar $kloter,
        ?Langganan $subscription = null,
        ?Transaksi $transaction = null,
        ?KodeAkses $accessKey = null,
        ?string $catatan = null
    ): AnggotaKloter {
        if (! $this->masihAdaKapasitas($kloter, $user->id)) {
            throw ValidationException::withMessages([
                'kloter' => 'Kapasitas kloter sudah penuh.',
            ]);
        }

        $anggota = AnggotaKloter::firstOrNew([
            'kloter_belajar_id' => $kloter->id,
            'user_id' => $user->id,
        ]);
        $shouldNotify = ! $anggota->exists || $anggota->status !== 'active';

        $anggota->fill([
            'subscription_id' => $subscription?->id ?: $anggota->subscription_id,
            'transaction_id' => $transaction?->id ?: $anggota->transaction_id,
            'access_key_id' => $accessKey?->id ?: $anggota->access_key_id,
            'joined_at' => $anggota->exists ? $anggota->joined_at : now(),
            'status' => 'active',
            'catatan' => $catatan ?: $anggota->catatan,
        ]);

        $anggota->save();

        if ($subscription && $subscription->kloter_belajar_id !== $kloter->id) {
            $subscription->update(['kloter_belajar_id' => $kloter->id]);
        }

        if ($transaction && $transaction->kloter_belajar_id !== $kloter->id) {
            $transaction->update(['kloter_belajar_id' => $kloter->id]);
        }

        if ($shouldNotify) {
            app(NotifikasiPenggunaService::class)->kirimKePengguna(
                $user,
                'kloter_assigned',
                'Kamu masuk kloter belajar',
                "Kamu sekarang masuk ke kloter {$kloter->nama}. Roadmap mingguan akan mengikuti jadwal kloter ini.",
                route('user.kelas.index'),
                ['kloter_id' => $kloter->id, 'program_id' => $kloter->program_pembelajaran_id]
            );
        }

        return $anggota;
    }

    public function kloterAktifUser(Pengguna $user, ?int $programPembelajaranId = null): ?KloterBelajar
    {
        return KloterBelajar::query()
            ->whereHas('anggota', fn ($query) => $query
                ->where('user_id', $user->id)
                ->where('status', 'active'))
            ->when($programPembelajaranId, fn ($query) => $query->where('program_pembelajaran_id', $programPembelajaranId))
            ->where('status', 'active')
            ->orderByDesc('tanggal_mulai')
            ->orderByDesc('id')
            ->first();
    }

    public function mingguAktif(?KloterBelajar $kloter): ?int
    {
        if (! $kloter?->tanggal_mulai) {
            return null;
        }

        if ($kloter->tanggal_mulai->isFuture()) {
            return 0;
        }

        return max(1, (int) floor($kloter->tanggal_mulai->copy()->startOfDay()->diffInDays(now()->startOfDay()) / 7) + 1);
    }

    public function masihAdaKapasitas(KloterBelajar $kloter, ?int $userId = null): bool
    {
        if ($userId && AnggotaKloter::where('kloter_belajar_id', $kloter->id)->where('user_id', $userId)->whereIn('status', ['active', 'paid_pending_approval'])->exists()) {
            return true;
        }

        if (! $kloter->max_siswa) {
            return true;
        }

        return $this->jumlahKursiTerpakai($kloter) < $kloter->max_siswa;
    }

    public function sisaKapasitas(KloterBelajar $kloter): ?int
    {
        if (! $kloter->max_siswa) {
            return null;
        }

        return max(0, (int) $kloter->max_siswa - $this->jumlahKursiTerpakai($kloter));
    }

    private function jumlahKursiTerpakai(KloterBelajar $kloter): int
    {
        return AnggotaKloter::query()
            ->where('kloter_belajar_id', $kloter->id)
            ->where(function (Builder $query) {
                $query->whereIn('status', ['active', 'paid_pending_approval'])
                    ->orWhere(function (Builder $query) {
                        $query->where('status', 'pending_payment')
                            ->whereHas('transaction', fn (Builder $transactionQuery) => $transactionQuery
                                ->where('status', 'pending')
                                ->where('created_at', '>=', now()->subHours(48)));
                    });
            })
            ->count();
    }
}
