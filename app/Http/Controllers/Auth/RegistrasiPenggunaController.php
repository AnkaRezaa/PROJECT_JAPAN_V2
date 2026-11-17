<?php

namespace App\Http\Controllers\Auth;

use App\Exceptions\EmailDeliveryUnavailable;
use App\Http\Controllers\Controller;
use App\Models\Pengguna;
use App\Services\BetaAccessService;
use App\Services\ReferralService;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\Rules;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class RegistrasiPenggunaController extends Controller
{
    /**
     * Display the registration view.
     */
    public function create(Request $request): Response
    {
        $request->validate(['ref' => ['nullable', 'string', 'max:32']]);

        return Inertia::render('Auth/Register', [
            'beta' => app(BetaAccessService::class)->payload(),
            'referralsEnabled' => (bool) config('referrals.enabled'),
            'referralCode' => config('referrals.enabled') ? app(ReferralService::class)->normalize($request->query('ref')) : '',
        ]);
    }

    /**
     * Handle an incoming registration request.
     *
     * @throws ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        $betaOnly = $request->routeIs('public.beta.register.store');
        $request->validate([
            'name' => 'required_without:username|string|max:255',
            'username' => 'nullable|string|max:255',
            'email' => 'required|email|max:255|unique:'.Pengguna::class,
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
            'referral_code' => ['nullable', 'string', 'max:32'],
            'terms_accepted' => $betaOnly ? ['required', 'accepted'] : ['sometimes', 'boolean'],
        ], $betaOnly ? [
            'name.required_without' => 'Nama wajib diisi.',
            'name.max' => 'Nama maksimal 255 karakter.',
            'email.required' => 'Email wajib diisi.',
            'email.email' => 'Masukkan alamat email yang valid.',
            'email.unique' => 'Email sudah terdaftar. Gunakan kirim ulang verifikasi dari halaman konfirmasi sebelumnya atau hubungi admin.',
            'password.required' => 'Kata sandi wajib diisi.',
            'password.min' => 'Kata sandi minimal 8 karakter.',
            'password.confirmed' => 'Konfirmasi kata sandi belum sesuai.',
            'terms_accepted.required' => 'Setujui ketentuan dan kebijakan privasi untuk melanjutkan.',
            'terms_accepted.accepted' => 'Setujui ketentuan dan kebijakan privasi untuk melanjutkan.',
        ] : []);

        $username = $request->input('username') ?: $request->input('name');

        $user = DB::transaction(function () use ($request, $username, $betaOnly) {
            $betaTimestamp = app(BetaAccessService::class)->registrationTimestamp($betaOnly);
            $referrerId = app(ReferralService::class)->resolve($request->input('referral_code'));
            $user = Pengguna::create([
                'username' => $username,
                'email' => $request->email,
                'password' => Hash::make($request->password),
                'password_login_enabled' => true,
            ]);
            $user->forceFill(['referred_by_user_id' => $referrerId, 'beta_registered_at' => $betaTimestamp])->save();

            return $user;
        });

        $emailUnavailable = false;
        try {
            event(new Registered($user));
        } catch (EmailDeliveryUnavailable) {
            $emailUnavailable = true;
        }

        if ($betaOnly) {
            $request->session()->regenerate();
            $request->session()->put('beta_registration_user_id', $user->id);
            $response = redirect()->route('public.beta.confirmation');
            if ($emailUnavailable) {
                $request->session()->forget('beta_registration_sent_at');

                return $response->withErrors(['verification' => EmailDeliveryUnavailable::USER_MESSAGE]);
            }

            RateLimiter::hit('email-verification:resend:cooldown:'.$user->id, 180);
            RateLimiter::hit('email-verification:resend:window:'.$user->id, 7200);
            $request->session()->put('beta_registration_sent_at', now()->toIso8601String());

            return $response->with('status', 'verification-link-sent');
        }

        if ($emailUnavailable) {
            // The account is already committed; allow verification retry without registering twice.
            Auth::login($user);

            return redirect()->route('verification.notice')->withErrors([
                'verification' => 'Akun Anda sudah tersimpan. '.EmailDeliveryUnavailable::USER_MESSAGE,
            ]);
        }

        Auth::login($user);

        if ($user->role === 'superadmin') {
            return redirect(route('superadmin.dashboard', absolute: false));
        } elseif ($user->role === 'admin') {
            return redirect(route('admin.dashboard', absolute: false));
        }

        return redirect(route('user.dashboard', absolute: false));
    }
}
