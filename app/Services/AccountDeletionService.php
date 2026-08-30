<?php

namespace App\Services;

use App\Models\Pengguna;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class AccountDeletionService
{
    public function __construct(private readonly AccountSuspensionService $suspensions)
    {
    }

    public function blockers(Pengguna $user, ?Pengguna $actor = null): array
    {
        $blockers = $this->anonymizationBlockers($user, $actor);

        if ($this->hasFinancialHistory($user)) {
            $blockers[] = 'Akun memiliki histori pembayaran atau langganan dan hanya dapat dianonimkan.';
        }

        return $blockers;
    }

    public function anonymizationBlockers(Pengguna $user, ?Pengguna $actor = null): array
    {
        $blockers = [];

        if ($actor?->is($user) && $actor->role === 'superadmin') {
            $blockers[] = 'Akun superadmin yang sedang digunakan tidak dapat dihapus dari panel.';
        }

        if ($user->role === 'superadmin' && Pengguna::query()->where('role', 'superadmin')->where('status', 'active')->count() <= 1) {
            $blockers[] = 'Superadmin aktif terakhir tidak dapat dihapus.';
        }

        if ($user->isMentor() && $user->kloterDikelola()->exists()) {
            $blockers[] = 'Pindahkan seluruh kloter yang masih diampu Mentor Kelas ini.';
        }

        return $blockers;
    }

    public function deleteSelf(Pengguna $user): string
    {
        if ($this->hasFinancialHistory($user)) {
            $this->anonymize($user);

            return 'anonymized';
        }

        $this->permanentlyDelete($user);

        return 'deleted';
    }

    public function permanentlyDelete(Pengguna $user, ?Pengguna $actor = null): void
    {
        $blockers = $this->blockers($user, $actor);

        if ($blockers !== []) {
            throw ValidationException::withMessages(['delete' => $blockers]);
        }

        DB::transaction(function () use ($user): void {
            $this->deleteAvatar($user->avatar);
            $user->delete();
        });
    }

    public function anonymize(Pengguna $user, ?Pengguna $actor = null): void
    {
        $blockers = $this->anonymizationBlockers($user, $actor);

        if ($blockers !== []) {
            throw ValidationException::withMessages(['delete' => $blockers]);
        }

        $this->deleteAvatar($user->avatar);
        $this->suspensions->anonymize($user);
    }

    public function canPermanentlyDelete(Pengguna $user, ?Pengguna $actor = null): bool
    {
        return $this->blockers($user, $actor) === [];
    }

    public function canAnonymize(Pengguna $user, ?Pengguna $actor = null): bool
    {
        return $this->anonymizationBlockers($user, $actor) === [];
    }

    private function hasFinancialHistory(Pengguna $user): bool
    {
        return $user->transactions()->exists() || $user->subscriptions()->exists();
    }

    private function deleteAvatar(?string $path): void
    {
        if (blank($path) || str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return;
        }

        Storage::disk('public')->delete(ltrim($path, '/'));
    }
}
