<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Pengguna;
use App\Models\RiwayatLogin;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;

class LoginSosialController extends Controller
{
    public const OAUTH_INTENT = 'auth.google.intent';

    public const OAUTH_INTENT_USER_ID = 'auth.google.intent_user_id';

    public const OAUTH_INTENT_LOGIN = 'login';

    public const OAUTH_INTENT_DELETE_ACCOUNT = 'delete_account';

    public const ACCOUNT_DELETION_CONFIRMED_AT = 'profile.account_deletion.google_confirmed_at';

    public const ACCOUNT_DELETION_CONFIRMED_USER_ID = 'profile.account_deletion.google_confirmed_user_id';

    public const ACCOUNT_DELETION_GOOGLE_TOKEN = 'profile.account_deletion.google_token';

    public function redirectToGoogle(Request $request): RedirectResponse
    {
        $request->session()->put(self::OAUTH_INTENT, self::OAUTH_INTENT_LOGIN);
        $request->session()->forget(self::OAUTH_INTENT_USER_ID);

        return Socialite::driver('google')
            ->with(['prompt' => 'select_account'])
            ->redirect();
    }

    public function handleGoogleCallback(Request $request): RedirectResponse
    {
        $intent = (string) $request->session()->get(self::OAUTH_INTENT, '');
        $intentUserId = (int) $request->session()->get(self::OAUTH_INTENT_USER_ID, 0);

        if (! in_array($intent, [self::OAUTH_INTENT_LOGIN, self::OAUTH_INTENT_DELETE_ACCOUNT], true)) {
            return $this->oauthContextFailure();
        }

        try {
            $googleUser = Socialite::driver('google')->user();
        } catch (\Throwable $exception) {
            report($exception);
            $this->clearOAuthIntent($request);

            return $this->oauthFailure($intent, 'Verifikasi Google gagal. Silakan coba kembali.');
        }

        $this->clearOAuthIntent($request);

        if ($intent === self::OAUTH_INTENT_DELETE_ACCOUNT) {
            return $this->confirmAccountDeletion($request, $googleUser, $intentUserId);
        }

        $email = $googleUser->getEmail();
        $emailVerified = (bool) data_get($googleUser->user, 'email_verified');

        if (! $email || ! $emailVerified) {
            return redirect()->route('login')->withErrors([
                'email' => 'Akun Google harus memiliki email yang sudah terverifikasi.',
            ]);
        }

        $user = Pengguna::where('google_id', $googleUser->getId())->first();

        if (! $user) {
            $user = Pengguna::where('email', $email)->first();
        }

        if ($user) {
            if (filled($user->google_id) && ! hash_equals((string) $user->google_id, (string) $googleUser->getId())) {
                return redirect()->route('login')->withErrors([
                    'email' => 'Email ini sudah terhubung dengan akun Google lain.',
                ]);
            }

            $user->forceFill([
                'google_id' => $user->google_id ?: $googleUser->getId(),
                'avatar' => $googleUser->getAvatar(),
                'email_verified_at' => $user->email_verified_at ?: now(),
            ])->save();
        } else {
            $user = new Pengguna([
                'username' => $this->usernameFromGoogle($googleUser->getName(), $googleUser->getEmail()),
                'email' => $email,
                'password' => Hash::make(Str::random(40)),
                'password_login_enabled' => false,
                'role' => 'user',
                'subscription_status' => 'free',
                'status' => 'active',
                'auth_provider' => 'google',
                'google_id' => $googleUser->getId(),
                'avatar' => $googleUser->getAvatar(),
            ]);

            $user->forceFill(['email_verified_at' => now()])->save();
        }

        if ($user->status !== 'active') {
            RiwayatLogin::create([
                'user_id' => $user->id,
                'email' => $user->email,
                'role' => $user->role,
                'status' => 'failed',
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'logged_in_at' => now(),
            ]);

            return redirect()->route('login')->withErrors([
                'email' => $user->status === 'suspended'
                    ? 'Akun Anda sedang ditangguhkan.'
                    : 'Akun ini tidak lagi aktif.',
            ]);
        }

        Auth::login($user, true);
        $request->session()->regenerate();

        RiwayatLogin::create([
            'user_id' => $user->id,
            'email' => $user->email,
            'role' => $user->role,
            'status' => 'success',
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'logged_in_at' => now(),
        ]);

        if ($user->role === 'superadmin') {
            return redirect()->route('superadmin.dashboard');
        }

        if ($user->role === 'admin') {
            return redirect()->route('admin.dashboard');
        }

        return redirect()->route('user.dashboard');
    }

    public function redirectForAccountDeletion(Request $request): RedirectResponse
    {
        $user = $request->user();

        abort_unless(filled($user->google_id), 403);

        $request->session()->put([
            self::OAUTH_INTENT => self::OAUTH_INTENT_DELETE_ACCOUNT,
            self::OAUTH_INTENT_USER_ID => $user->id,
        ]);
        $request->session()->forget([
            self::ACCOUNT_DELETION_CONFIRMED_AT,
            self::ACCOUNT_DELETION_CONFIRMED_USER_ID,
            self::ACCOUNT_DELETION_GOOGLE_TOKEN,
        ]);

        return Socialite::driver('google')
            ->with([
                'prompt' => 'select_account',
                'login_hint' => $user->email,
            ])
            ->redirect();
    }

    private function confirmAccountDeletion(Request $request, mixed $googleUser, int $intentUserId): RedirectResponse
    {
        $user = $request->user();
        $email = $googleUser->getEmail();
        $emailVerified = (bool) data_get($googleUser->user, 'email_verified');
        $userMatches = $user && $intentUserId === (int) $user->id;
        $googleIdMatches = $userMatches && filled($user->google_id)
            && hash_equals((string) $user->google_id, (string) $googleUser->getId());
        $emailMatches = $userMatches && filled($email)
            && hash_equals(Str::lower($user->email), Str::lower($email));

        if (! $userMatches || ! $emailVerified || ! $googleIdMatches || ! $emailMatches) {
            return $this->oauthFailure(
                self::OAUTH_INTENT_DELETE_ACCOUNT,
                'Gunakan akun Google yang terhubung dengan akun TOKU-UP ini.'
            );
        }

        $request->session()->put([
            self::ACCOUNT_DELETION_CONFIRMED_AT => now()->timestamp,
            self::ACCOUNT_DELETION_CONFIRMED_USER_ID => $user->id,
            self::ACCOUNT_DELETION_GOOGLE_TOKEN => Crypt::encryptString((string) $googleUser->token),
        ]);

        return redirect()->route('profile.edit')
            ->with('reopen_delete_dialog', true)
            ->with('success', 'Identitas Google berhasil diverifikasi. Konfirmasi berlaku selama lima menit.');
    }

    private function oauthFailure(string $intent, string $message): RedirectResponse
    {
        if ($intent === self::OAUTH_INTENT_DELETE_ACCOUNT && Auth::check()) {
            return redirect()->route('profile.edit')
                ->with('reopen_delete_dialog', true)
                ->withErrors(['google_confirmation' => $message]);
        }

        return redirect()->route('login')->withErrors([
            'email' => 'Login Google gagal. Coba lagi atau gunakan email dan password.',
        ]);
    }

    private function oauthContextFailure(): RedirectResponse
    {
        if (Auth::check()) {
            return redirect()->route('profile.edit')
                ->with('reopen_delete_dialog', true)
                ->withErrors([
                    'google_confirmation' => 'Sesi verifikasi Google tidak ditemukan atau sudah kedaluwarsa. Mulai ulang dari tombol hapus akun.',
                ]);
        }

        return redirect()->route('login')->withErrors([
            'email' => 'Sesi login Google tidak ditemukan atau sudah kedaluwarsa. Silakan mulai ulang.',
        ]);
    }

    private function clearOAuthIntent(Request $request): void
    {
        $request->session()->forget([
            self::OAUTH_INTENT,
            self::OAUTH_INTENT_USER_ID,
        ]);
    }

    private function usernameFromGoogle(?string $name, ?string $email): string
    {
        $fallback = $email ? Str::before($email, '@') : 'google-user';

        return Str::limit(trim($name ?: $fallback), 100, '');
    }
}
