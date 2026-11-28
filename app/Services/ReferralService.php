<?php

namespace App\Services;

use App\Models\Pengguna;
use App\Models\Transaksi;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ReferralService
{
    private const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    private const DISCOUNT_SETTINGS_KEY = 'referral_discount_settings';
    private const DISCOUNT_SETTINGS_CACHE = 'referral_discount_settings_v1';

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

    /**
     * @return array{enabled: bool, inviter_percent_per_referral: int, invitee_percent: int, max_discount_percent: int, min_payable_amount: int}
     */
    public function discountSettings(): array
    {
        return Cache::remember(self::DISCOUNT_SETTINGS_CACHE, now()->addMinutes(5), static function (): array {
            $raw = DB::table('app_settings')->where('key', self::DISCOUNT_SETTINGS_KEY)->value('value');
            $stored = $raw ? json_decode($raw, true) : [];
            $stored = is_array($stored) ? $stored : [];

            return [
                'enabled' => (bool) ($stored['enabled'] ?? true),
                'inviter_percent_per_referral' => max(0, min(100, (int) ($stored['inviter_percent_per_referral'] ?? 5))),
                'invitee_percent' => max(0, min(100, (int) ($stored['invitee_percent'] ?? 5))),
                'max_discount_percent' => max(0, min(100, (int) ($stored['max_discount_percent'] ?? 50))),
                'min_payable_amount' => max(0, (int) ($stored['min_payable_amount'] ?? 10000)),
            ];
        });
    }

    public function saveDiscountSettings(array $input): array
    {
        $clean = [
            'enabled' => (bool) ($input['enabled'] ?? true),
            'inviter_percent_per_referral' => max(0, min(100, (int) ($input['inviter_percent_per_referral'] ?? 5))),
            'invitee_percent' => max(0, min(100, (int) ($input['invitee_percent'] ?? 5))),
            'max_discount_percent' => max(0, min(100, (int) ($input['max_discount_percent'] ?? 50))),
            'min_payable_amount' => max(0, (int) ($input['min_payable_amount'] ?? 10000)),
        ];

        $exists = DB::table('app_settings')->where('key', self::DISCOUNT_SETTINGS_KEY)->exists();
        DB::table('app_settings')->updateOrInsert(['key' => self::DISCOUNT_SETTINGS_KEY], [
            'value' => json_encode($clean),
            'updated_at' => now(),
            ...($exists ? [] : ['created_at' => now()]),
        ]);
        DB::afterCommit(static fn () => Cache::forget(self::DISCOUNT_SETTINGS_CACHE));
        Cache::forget(self::DISCOUNT_SETTINGS_CACHE);

        return $clean;
    }

    /**
     * Computes server-side referral discount for a user's first qualifying checkout.
     *
     * @return array{original_amount: int, discount_amount: int, final_amount: int, percent: int, meta: array<string, mixed>|null}
     */
    public function discountForCheckout(Pengguna $user, int $basePrice): array
    {
        $none = [
            'original_amount' => $basePrice,
            'discount_amount' => 0,
            'final_amount' => $basePrice,
            'percent' => 0,
            'meta' => null,
        ];

        $settings = $this->discountSettings();
        if (! config('referrals.enabled') || ! $settings['enabled'] || $basePrice <= 0) {
            return $none;
        }

        $alreadyUsed = Transaksi::query()
            ->where('user_id', $user->id)
            ->where('discount_amount', '>', 0)
            ->whereIn('status', ['pending', 'success'])
            ->exists();

        if ($alreadyUsed) {
            return $none;
        }

        $verifiedReferrals = Pengguna::query()
            ->where('referred_by_user_id', $user->id)
            ->whereNotNull('email_verified_at')
            ->count();

        $inviterPercent = $verifiedReferrals * $settings['inviter_percent_per_referral'];
        $inviteePercent = $user->referred_by_user_id ? $settings['invitee_percent'] : 0;
        $rawPercent = $inviterPercent + $inviteePercent;
        $effectivePercent = min($settings['max_discount_percent'], $rawPercent);

        if ($effectivePercent <= 0) {
            return $none;
        }

        $rawDiscount = (int) floor(($basePrice * $effectivePercent) / 100);
        $minPayable = $basePrice >= $settings['min_payable_amount'] ? $settings['min_payable_amount'] : $basePrice;
        $maxAllowedDiscount = max(0, $basePrice - $minPayable);
        $discountAmount = min($rawDiscount, $maxAllowedDiscount);

        if ($discountAmount <= 0) {
            return $none;
        }

        return [
            'original_amount' => $basePrice,
            'discount_amount' => $discountAmount,
            'final_amount' => $basePrice - $discountAmount,
            'percent' => $effectivePercent,
            'meta' => [
                'source' => 'referral',
                'percent' => $effectivePercent,
                'verified_referrals' => $verifiedReferrals,
                'inviter_percent' => $inviterPercent,
                'invitee_percent' => $inviteePercent,
            ],
        ];
    }
}
