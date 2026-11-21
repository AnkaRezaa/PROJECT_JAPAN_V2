<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Models\RiwayatLogin;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class SesiAutentikasiController extends Controller
{
    /**
     * Display the login view.
     */
    public function create(): Response
    {
        return Inertia::render('Auth/Login', [
            'canResetPassword' => Route::has('password.request'),
            'status' => session('status'),
        ]);
    }

    /**
     * Handle an incoming authentication request.
     */
    public function store(LoginRequest $request): RedirectResponse
    {
        $request->authenticate();

        $request->session()->regenerate();

        $user = Auth::user();

        if ($user->status === 'suspended') {
            RiwayatLogin::create([
                'user_id' => $user->id,
                'email' => $user->email,
                'role' => $user->role,
                'status' => 'failed',
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'logged_in_at' => now(),
            ]);

            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            $reasonText = $user->suspended_reason ? " Alasan: {$user->suspended_reason}." : '';
            throw ValidationException::withMessages([
                'email' => "Akun Anda telah ditangguhkan (disuspend).{$reasonText} Silakan hubungi admin jika merasa ini adalah kekeliruan.",
            ]);
        }

        RiwayatLogin::create([
            'user_id' => $user->id,
            'email' => $user->email,
            'role' => $user->role,
            'status' => 'success',
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'logged_in_at' => now(),
        ]);

        $panel = match ($user->role) {
            'superadmin' => 'superadmin',
            'admin' => 'admin',
            default => 'user',
        };
        $destination = $request->session()->pull('url.intended');

        return redirect()->to($this->localDestination($request, $destination, $panel)
            ?? route("{$panel}.dashboard", absolute: false));
    }

    private function localDestination(Request $request, mixed $destination, string $panel): ?string
    {
        if (! is_string($destination) || preg_match('/[\x00-\x20\x7f\\\\]/', $destination)) {
            return null;
        }

        $origin = $request->getSchemeAndHttpHost();
        if (str_starts_with($destination, $origin.'/')) {
            $destination = substr($destination, strlen($origin));
        }

        $path = rawurldecode((string) parse_url($destination, PHP_URL_PATH));
        if (! str_starts_with($destination, '/') || str_starts_with($destination, '//') || ! str_starts_with($path, '/')
            || str_starts_with($path, '//') || str_contains($path, '\\')
            || preg_match('~(?:^|/)\.{1,2}(?:/|$)~', $path)) {
            return null;
        }

        $prefix = explode('/', $path)[1];
        if (in_array($prefix, ['admin', 'superadmin', 'user'], true) && $prefix !== $panel) {
            return null;
        }

        return $destination;
    }

    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request): RedirectResponse
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();

        $request->session()->regenerateToken();

        return redirect('/')->withHeaders([
            'Cache-Control' => 'no-cache, no-store, max-age=0, must-revalidate',
            'Pragma' => 'no-cache',
            'Expires' => 'Sat, 01 Jan 2000 00:00:00 GMT'
        ]);
    }
}
