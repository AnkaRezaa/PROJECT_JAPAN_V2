<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->web(append: [
            \App\Http\Middleware\HandleInertiaRequests::class,
            \Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets::class,
            \App\Http\Middleware\SearchEngineIndexing::class,
        ]);

        $middleware->validateCsrfTokens(except: [
            'payments/midtrans/notification',
        ]);

        $middleware->alias([
            'role' => \App\Http\Middleware\CheckRole::class,
            'subscribed' => \App\Http\Middleware\SubscriptionMiddleware::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || ($request->expectsJson() && ! $request->header('X-Inertia')),
        );

        $exceptions->respond(function (Response $response, \Throwable $exception, Request $request) {
            if ($request->is('api/*') || ($request->expectsJson() && ! $request->header('X-Inertia'))) {
                return $response;
            }

            if ($response->getStatusCode() === 419) {
                return back()->with('error', 'Sesi Anda telah berakhir. Silakan coba lagi.');
            }

            if (! in_array($response->getStatusCode(), [403, 404, 429, 500, 503], true)
                || ! in_array($request->method(), ['GET', 'HEAD'], true)
                || (app()->environment(['local', 'testing']) && in_array($response->getStatusCode(), [500, 503], true))) {
                return $response;
            }

            $homeUrl = match ($request->user()?->role) {
                'superadmin' => route('superadmin.dashboard'),
                'admin' => route('admin.dashboard'),
                'user' => route('user.dashboard'),
                default => route('dashboard'),
            };

            return Inertia::render('Errors/Status', [
                'status' => $response->getStatusCode(),
                'home_url' => $homeUrl,
            ])->toResponse($request)->setStatusCode($response->getStatusCode());
        });
    })->create();
