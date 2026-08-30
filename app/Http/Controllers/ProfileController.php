<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Auth\LoginSosialController;
use App\Services\AccountDeletionService;
use App\Http\Requests\ProfileUpdateRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Validation\ValidationException;
use Throwable;

class ProfileController extends Controller
{
    /**
     * Update the user's profile information.
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $request->user()->fill($request->validated());

        if ($request->user()->isDirty('email')) {
            $request->user()->email_verified_at = null;
        }

        $request->user()->save();

        return Redirect::route('profile.edit');
    }

    public function updateLearningPreferences(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'show_romaji' => ['required', 'boolean'],
            'show_indonesian_translation' => ['required', 'boolean'],
        ]);

        $request->user()->update($validated);

        return back()->with('success', 'Pengaturan bantuan baca berhasil disimpan.');
    }

    /**
     * Delete the user's account.
     */
    public function destroy(Request $request, AccountDeletionService $deletions): RedirectResponse
    {
        $user = $request->user();
        $passwordLoginEnabled = $user->password_login_enabled !== false;

        $request->validate([
            'confirmation_username' => ['required', 'string'],
            'password' => $passwordLoginEnabled
                ? ['required', 'current_password']
                : ['nullable'],
        ]);

        if (! hash_equals($user->username, (string) $request->input('confirmation_username'))) {
            throw ValidationException::withMessages([
                'confirmation_username' => 'Username tidak cocok dengan akun Anda.',
            ]);
        }

        if (! $passwordLoginEnabled && ! $this->hasRecentGoogleConfirmation($request)) {
            throw ValidationException::withMessages([
                'google_confirmation' => 'Verifikasi ulang akun Google sebelum menghapus akun.',
            ]);
        }

        $this->revokeGoogleAccess($request);
        Auth::logout();

        // Logout rotates the remember token. It must happen before deletion,
        // otherwise Laravel can persist the deleted model again.
        $result = $deletions->deleteSelf($user);

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return Redirect::to('/')->with('success', $result === 'anonymized'
            ? 'Identitas akun telah dihapus. Riwayat pembayaran tetap disimpan tanpa data pribadi.'
            : 'Akun telah dihapus permanen.');
    }

    private function hasRecentGoogleConfirmation(Request $request): bool
    {
        $confirmedAt = (int) $request->session()->get(LoginSosialController::ACCOUNT_DELETION_CONFIRMED_AT, 0);
        $confirmedUserId = (int) $request->session()->get(LoginSosialController::ACCOUNT_DELETION_CONFIRMED_USER_ID, 0);

        return filled($request->user()->google_id)
            && $confirmedUserId === (int) $request->user()->id
            && $confirmedAt >= now()->subMinutes(5)->timestamp;
    }

    private function revokeGoogleAccess(Request $request): void
    {
        $encryptedToken = $request->session()->pull(LoginSosialController::ACCOUNT_DELETION_GOOGLE_TOKEN);

        if (blank($encryptedToken)) {
            return;
        }

        try {
            $token = Crypt::decryptString((string) $encryptedToken);

            Http::asForm()
                ->connectTimeout(2)
                ->timeout(5)
                ->post('https://oauth2.googleapis.com/revoke', ['token' => $token])
                ->throw();
        } catch (Throwable $exception) {
            report($exception);
        }
    }
}
