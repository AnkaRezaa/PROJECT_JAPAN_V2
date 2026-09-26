<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next, ...$roles): Response
    {
        if (! $request->user() || !in_array($request->user()->role, $roles)) {
            abort(403, 'Unauthorized action.');
        }

        if ($request->user()->status === 'suspended') {
            $reason = $request->user()->suspended_reason ? " Alasan: {$request->user()->suspended_reason}." : '';
            auth()->guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return redirect()->route('login')->withErrors([
                'email' => "Akun Anda telah ditangguhkan (disuspend).{$reason} Silakan hubungi admin jika merasa ini adalah kekeliruan.",
            ]);
        }

        return $next($request);
    }
}
