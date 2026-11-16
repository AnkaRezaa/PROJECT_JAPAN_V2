<?php

namespace App\Http\Middleware;

use App\Services\BetaAccessService;
use Closure;
use Illuminate\Http\Request;

class EnsureBetaAccess
{
    public function handle(Request $request, Closure $next)
    {
        // Public pages are readable; every authenticated application action is denied by default.
        $public = ['home', 'public.*', 'about', 'pricing', 'katalog', 'roadmap', 'privacy-policy', 'terms', 'cookie-policy', 'robots', 'sitemap'];
        $account = ['user.beta.waiting', 'profile.edit', 'profile.update', 'profile.learning-preferences.update', 'profile.destroy', 'profile.delete.google.redirect', 'logout', 'verification.*', 'password.*', 'login', 'register', 'auth.google.*'];
        if (! $request->routeIs(...$public) && ! $request->routeIs(...$account)
            && app(BetaAccessService::class)->pending($request->user())) {
            if ($request->expectsJson() && ! $request->header('X-Inertia')) {
                return response()->json(['message' => 'Akses beta belum dibuka.', 'url' => route('user.beta.waiting')], 423);
            }

            return redirect()->route('user.beta.waiting', [], 303);
        }

        return $next($request);
    }
}
