<?php

namespace App\Http\Controllers\Auth;

use App\Exceptions\EmailDeliveryUnavailable;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;

class NotifikasiVerifikasiEmailController extends Controller
{
    private const COOLDOWN_SECONDS = 180;

    private const MAX_SENDS_PER_WINDOW = 5;

    private const LOCK_SECONDS = 7200;

    /**
     * Send a new email verification notification.
     */
    public function store(Request $request): RedirectResponse
    {
        if ($request->user()->hasVerifiedEmail()) {
            return redirect()->intended(route('dashboard', absolute: false));
        }

        $user = $request->user();
        $cooldownKey = $this->cooldownKey($user->id);
        $windowKey = $this->windowKey($user->id);
        $lockKey = $this->lockKey($user->id);

        if (RateLimiter::tooManyAttempts($lockKey, 1)) {
            throw ValidationException::withMessages([
                'verification' => ['Terlalu banyak permintaan. Coba lagi dalam '.$this->minutesUntil($lockKey).' menit.'],
            ]);
        }

        if (RateLimiter::tooManyAttempts($cooldownKey, 1)) {
            throw ValidationException::withMessages([
                'verification' => ['Tautan baru dapat dikirim lagi dalam '.$this->secondsUntil($cooldownKey).' detik.'],
            ]);
        }

        if (RateLimiter::tooManyAttempts($windowKey, self::MAX_SENDS_PER_WINDOW)) {
            RateLimiter::hit($lockKey, self::LOCK_SECONDS);

            throw ValidationException::withMessages([
                'verification' => ['Anda telah meminta tautan verifikasi lebih dari lima kali. Coba lagi dalam 2 jam.'],
            ]);
        }

        try {
            $user->sendEmailVerificationNotification();
        } catch (EmailDeliveryUnavailable) {
            throw ValidationException::withMessages([
                'verification' => EmailDeliveryUnavailable::USER_MESSAGE,
            ]);
        }
        RateLimiter::hit($cooldownKey, self::COOLDOWN_SECONDS);
        RateLimiter::hit($windowKey, self::LOCK_SECONDS);

        return back()
            ->with('status', 'verification-link-sent')
            ->with('verification_email_sent_at', now()->toIso8601String());
    }

    private function cooldownKey(int $userId): string
    {
        return 'email-verification:resend:cooldown:'.$userId;
    }

    private function windowKey(int $userId): string
    {
        return 'email-verification:resend:window:'.$userId;
    }

    private function lockKey(int $userId): string
    {
        return 'email-verification:resend:lock:'.$userId;
    }

    private function secondsUntil(string $key): int
    {
        return max(1, RateLimiter::availableIn($key));
    }

    private function minutesUntil(string $key): int
    {
        return max(1, (int) ceil(RateLimiter::availableIn($key) / 60));
    }
}
