<?php

namespace App\Services;

use App\Exceptions\EmailDeliveryUnavailable;
use App\Models\Pengguna;
use App\Notifications\PasswordResetOtpNotification;
use Carbon\Carbon;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;

class PasswordResetOtpService
{
    public const EXPIRES_MINUTES = 10;

    public const RESEND_SECONDS = 60;

    public const MAX_VERIFY_ATTEMPTS = 5;

    public function request(string $email, string $ipAddress): void
    {
        $email = $this->normalizeEmail($email);
        $sendKey = $this->sendKey($email, $ipAddress);

        if (RateLimiter::tooManyAttempts($sendKey, 1)) {
            return;
        }

        RateLimiter::hit($sendKey, self::RESEND_SECONDS);

        $user = Pengguna::query()
            ->where('email', $email)
            ->where('password_login_enabled', true)
            ->first();

        if (! $user) {
            return;
        }

        $code = (string) random_int(100000, 999999);

        DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => $email],
            ['token' => Hash::make($code), 'created_at' => now()]
        );

        try {
            app(EmailDeliveryService::class)->send(
                fn () => $user->notify(new PasswordResetOtpNotification($code, self::EXPIRES_MINUTES))
            );
        } catch (EmailDeliveryUnavailable) {
            DB::table('password_reset_tokens')->where('email', $email)->delete();
            RateLimiter::clear($sendKey);

            // Keep the public reset response identical for registered and unknown email addresses.
        }
    }

    public function reset(string $email, string $code, string $password, string $ipAddress): ?Pengguna
    {
        $email = $this->normalizeEmail($email);
        $verifyKey = $this->verifyKey($email, $ipAddress);

        if (RateLimiter::tooManyAttempts($verifyKey, self::MAX_VERIFY_ATTEMPTS)) {
            return null;
        }

        $user = DB::transaction(function () use ($email, $code, $password) {
            $token = DB::table('password_reset_tokens')
                ->where('email', $email)
                ->lockForUpdate()
                ->first();

            if (! $token || ! $this->isValid($token->created_at) || ! Hash::check($code, $token->token)) {
                return null;
            }

            $user = Pengguna::query()
                ->where('email', $email)
                ->where('password_login_enabled', true)
                ->lockForUpdate()
                ->first();

            if (! $user) {
                return null;
            }

            $user->forceFill([
                'password' => Hash::make($password),
                'remember_token' => Str::random(60),
            ])->save();

            DB::table('password_reset_tokens')->where('email', $email)->delete();

            return $user;
        });

        if (! $user) {
            RateLimiter::hit($verifyKey, self::EXPIRES_MINUTES * 60);

            return null;
        }

        RateLimiter::clear($verifyKey);
        event(new PasswordReset($user));

        return $user;
    }

    private function isValid(string $createdAt): bool
    {
        return now()->lessThanOrEqualTo(
            Carbon::parse($createdAt)->addMinutes(self::EXPIRES_MINUTES)
        );
    }

    private function normalizeEmail(string $email): string
    {
        return Str::lower(trim($email));
    }

    private function sendKey(string $email, string $ipAddress): string
    {
        return 'password-reset:send:'.sha1($email.'|'.$ipAddress);
    }

    private function verifyKey(string $email, string $ipAddress): string
    {
        return 'password-reset:verify:'.sha1($email.'|'.$ipAddress);
    }
}
