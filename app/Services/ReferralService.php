<?php

namespace App\Services;

use App\Models\Pengguna;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ReferralService
{
    private const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

    public function eligible(Pengguna $user): bool
    {
        return $user->role === 'user' && $user->status === 'active' && $user->hasVerifiedEmail();
    }

    public function normalize(?string $code): string
    {
        return strtoupper(trim($code ?? ''));
    }

    public function issue(Pengguna $user): string
    {
        abort_unless(config('referrals.enabled'), 403);
        for ($attempt = 0; $attempt < 5; $attempt++) {
            try {
                return DB::transaction(function () use ($user) {
                    $locked = Pengguna::whereKey($user->id)->lockForUpdate()->firstOrFail();
                    abort_unless($this->eligible($locked), 403);
                    if ($locked->referral_code) {
                        return $locked->referral_code;
                    }
                    $code = '';
                    for ($i = 0; $i < 8; $i++) {
                        $code .= self::ALPHABET[random_int(0, strlen(self::ALPHABET) - 1)];
                    }
                    $locked->forceFill(['referral_code' => $code])->save();

                    return $code;
                });
            } catch (UniqueConstraintViolationException $exception) {
                if (! str_contains($exception->getMessage(), 'users_referral_code_unique') || $attempt === 4) {
                    throw $exception;
                }
            }
        }
        throw new \RuntimeException('Tidak dapat membuat kode referral.');
    }

    // Called inside the account creation transaction; never trusts a client-supplied user ID.
    public function resolve(?string $code): ?int
    {
        $code = $this->normalize($code);
        if ($code === '') {
            return null;
        }
        if (! config('referrals.enabled')) {
            throw ValidationException::withMessages(['referral_code' => 'Referral belum tersedia. Hapus kode untuk melanjutkan.']);
        }
        $owner = Pengguna::where('referral_code', $code)->lockForUpdate()->first();
        if (! $owner || ! $this->eligible($owner)) {
            throw ValidationException::withMessages(['referral_code' => 'Kode referral tidak berlaku.']);
        }

        return $owner->id;
    }

    public function summary(Pengguna $user): array
    {
        $query = Pengguna::where('referred_by_user_id', $user->id);

        return [
            'registered' => (clone $query)->count(),
            'verified' => (clone $query)->whereNotNull('email_verified_at')->count(),
        ];
    }
}
