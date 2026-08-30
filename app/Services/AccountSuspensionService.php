<?php

namespace App\Services;

use App\Models\Pengguna;
use App\Models\RiwayatStatusPengguna;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AccountSuspensionService
{
    public function changeStatus(Pengguna $user, string $status, ?string $reason, ?Pengguna $actor = null): void
    {
        if ($status === 'suspended' && $user->isMentor() && $user->kloterDikelola()->exists()) {
            throw ValidationException::withMessages([
                'status' => 'Pindahkan seluruh kloter yang diampu sebelum menangguhkan Mentor Kelas ini.',
            ]);
        }

        $oldStatus = $user->status ?? 'active';

        $user->update([
            'status' => $status,
            'suspended_at' => $status === 'suspended' ? now() : null,
            'suspended_reason' => $status === 'suspended' ? $reason : null,
            'scheduled_anonymization_at' => $status === 'suspended' ? now()->addDays(30) : null,
        ]);

        RiwayatStatusPengguna::create([
            'user_id' => $user->id,
            'changed_by' => $actor?->id,
            'old_status' => $oldStatus,
            'new_status' => $status,
            'reason' => $reason,
        ]);
    }

    public function anonymizeDueAccounts(): int
    {
        $count = 0;

        Pengguna::query()
            ->where('status', 'suspended')
            ->whereNull('anonymized_at')
            ->whereNotNull('scheduled_anonymization_at')
            ->where('scheduled_anonymization_at', '<=', now())
            ->orderBy('id')
            ->chunkById(100, function ($users) use (&$count): void {
                foreach ($users as $user) {
                    $this->anonymize($user);
                    $count++;
                }
            });

        return $count;
    }

    public function anonymize(Pengguna $user): void
    {
        $marker = "anon-{$user->id}-".Str::lower(Str::random(10));

        $user->forceFill([
            'username' => $marker,
            'email' => "{$marker}@anonymized.invalid",
            'email_verified_at' => null,
            'password' => Hash::make(Str::random(64)),
            'password_login_enabled' => false,
            'auth_provider' => 'email',
            'google_id' => null,
            'avatar' => null,
            'status' => 'anonymized',
            'suspended_at' => null,
            'suspended_reason' => null,
            'scheduled_anonymization_at' => null,
            'anonymized_at' => now(),
            'remember_token' => null,
        ])->save();
    }
}
