<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);

        RateLimiter::for('access-keys', fn (Request $request) => Limit::perMinute(5)
            ->by(($request->user()?->id ?? 'guest').':'.$request->ip()));
        RateLimiter::for('payments-checkout', fn (Request $request) => Limit::perMinute(5)
            ->by((string) ($request->user()?->id ?? $request->ip())));
        RateLimiter::for('payments-sync', fn (Request $request) => Limit::perMinute(10)
            ->by((string) ($request->user()?->id ?? $request->ip())));
        RateLimiter::for('payments-cancel', fn (Request $request) => Limit::perMinute(3)
            ->by((string) ($request->user()?->id ?? $request->ip())));
        RateLimiter::for('learning-actions', fn (Request $request) => Limit::perMinute(60)
            ->by(($request->user()?->id ?? 'guest').':'.$request->ip()));
        RateLimiter::for('contextual-feedback', fn (Request $request) => [
            Limit::perMinute(10)->by((string) ($request->user()?->id ?? $request->ip())),
            Limit::perHour(60)->by((string) ($request->user()?->id ?? $request->ip())),
        ]);
        RateLimiter::for('quick-quiz', fn (Request $request) => Limit::perMinute(60)
            ->by(($request->user()?->id ?? 'guest').':'.$request->ip()));
        RateLimiter::for('live-room-create', fn (Request $request) => Limit::perMinute(5)
            ->by(($request->user()?->id ?? 'guest').':'.$request->ip()));
        RateLimiter::for('live-room-token', fn (Request $request) => Limit::perMinute(15)
            ->by(($request->user()?->id ?? 'guest').':'.$request->ip()));
        RateLimiter::for('live-room-user-token', function (Request $request): array {
            $session = $request->route('session');
            $sessionKey = is_object($session) && method_exists($session, 'getRouteKey')
                ? $session->getRouteKey()
                : (string) $session;
            $key = ($request->user()?->id ?? 'guest').':'.$sessionKey;
            $response = static fn (Request $request, array $headers) => response()->json([
                'message' => 'Ruang kelas sedang disiapkan. Kami akan mencoba menyambungkan kembali secara otomatis.',
            ], 429, $headers);

            return [
                Limit::perMinute(12)->by($key)->response($response),
                Limit::perHour(120)->by($key)->response($response),
            ];
        });
        RateLimiter::for('live-room-state', fn (Request $request) => Limit::perMinute(30)
            ->by(($request->user()?->id ?? 'guest').':'.$request->ip()));
        RateLimiter::for('live-room-control', fn (Request $request) => Limit::perMinute(30)
            ->by(($request->user()?->id ?? 'guest').':'.$request->ip()));
        RateLimiter::for('admin-imports', fn (Request $request) => Limit::perMinutes(10, 3)
            ->by(($request->user()?->id ?? 'guest').':'.$request->ip()));
        RateLimiter::for('admin-uploads', fn (Request $request) => Limit::perMinutes(10, 20)
            ->by(($request->user()?->id ?? 'guest').':'.$request->ip()));
        RateLimiter::for('exam-admin', fn (Request $request) => Limit::perMinute(20)
            ->by(($request->user()?->id ?? 'guest').':'.$request->ip()));
        RateLimiter::for('exam-start', fn (Request $request) => Limit::perMinute(10)
            ->by(($request->user()?->id ?? 'guest').':'.$request->ip()));
        RateLimiter::for('exam-autosave', fn (Request $request) => Limit::perMinute(30)
            ->by(($request->user()?->id ?? 'guest').':'.$request->ip()));
        RateLimiter::for('exam-submit', fn (Request $request) => Limit::perMinute(10)
            ->by(($request->user()?->id ?? 'guest').':'.$request->ip()));
        RateLimiter::for('exam-ranking', fn (Request $request) => Limit::perMinute(30)
            ->by(($request->user()?->id ?? 'guest').':'.$request->ip()));
        RateLimiter::for('guest-sensitive', fn (Request $request) => Limit::perMinute(5)
            ->by(strtolower((string) $request->input('email')).':'.$request->ip()));
    }
}
