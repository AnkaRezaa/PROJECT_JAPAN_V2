<?php

namespace App\Http\Controllers\Auth;

use App\Exceptions\EmailDeliveryUnavailable;
use App\Http\Controllers\Controller;
use App\Models\Pengguna;
use App\Services\BetaAccessService;
use App\Services\ReferralService;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class BetaRegistrationController extends Controller
{
    public function create(Request $request, BetaAccessService $beta): Response|RedirectResponse
    {
        $settings = $beta->payload();
        if (! $settings['enabled'] || $settings['released']) {
            return redirect()->route('home');
        }

        $request->validate(['ref' => ['nullable', 'string', 'max:32']]);

        return Inertia::render('Public/Beta/Register', [
            'beta' => $settings,
            'referralsEnabled' => (bool) config('referrals.enabled'),
            'referralCode' => config('referrals.enabled')
                ? app(ReferralService::class)->normalize($request->query('ref')) : '',
        ]);
    }

    public function confirmation(Request $request, BetaAccessService $beta): Response|RedirectResponse
    {
        $user = $this->sessionUser($request);
        if (! $user) {
            return redirect()->route('public.beta.register');
        }

        return Inertia::render('Public/Beta/Confirmation', [
            'registration' => ['email' => $user->email, 'verified' => $user->hasVerifiedEmail()],
            'released' => ! $beta->pending($user),
            'status' => session('status'),
            'sentAt' => session('beta_registration_sent_at'),
        ]);
    }

    public function resend(Request $request): RedirectResponse
    {
        $user = $this->sessionUser($request);
        abort_unless($user, 403);
        if ($user->hasVerifiedEmail()) {
            return redirect()->route('public.beta.confirmation');
        }

        $cooldown = 'email-verification:resend:cooldown:'.$user->id;
        $window = 'email-verification:resend:window:'.$user->id;
        if (RateLimiter::tooManyAttempts($cooldown, 1) || RateLimiter::tooManyAttempts($window, 5)) {
            throw ValidationException::withMessages([
                'verification' => 'Terlalu banyak permintaan. Silakan kirim ulang nanti.',
            ]);
        }

        try {
            $user->sendEmailVerificationNotification();
        } catch (EmailDeliveryUnavailable) {
            throw ValidationException::withMessages(['verification' => EmailDeliveryUnavailable::USER_MESSAGE]);
        }

        RateLimiter::hit($cooldown, 180);
        RateLimiter::hit($window, 7200);
        $request->session()->put('beta_registration_sent_at', now()->toIso8601String());

        return redirect()->route('public.beta.confirmation')
            ->with('status', 'verification-link-sent');
    }

    public function verify(Request $request, int $id, string $hash): RedirectResponse
    {
        $user = DB::transaction(function () use ($id, $hash) {
            $user = Pengguna::whereNotNull('beta_registered_at')->where('role', 'user')
                ->lockForUpdate()->findOrFail($id);
            abort_unless(hash_equals(sha1($user->getEmailForVerification()), $hash), 403);

            if (! $user->hasVerifiedEmail() && $user->markEmailAsVerified()) {
                DB::afterCommit(fn () => event(new Verified($user)));
            }

            return $user;
        });
        $request->session()->regenerate();
        $request->session()->put('beta_registration_user_id', $user->id);

        return redirect()->route('public.beta.confirmation');
    }

    private function sessionUser(Request $request): ?Pengguna
    {
        $id = $request->session()->get('beta_registration_user_id');

        return $id ? Pengguna::whereNotNull('beta_registered_at')->where('role', 'user')->find($id) : null;
    }
}
