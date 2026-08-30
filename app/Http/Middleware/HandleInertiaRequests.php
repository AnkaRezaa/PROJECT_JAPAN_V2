<?php

namespace App\Http\Middleware;

use App\Services\AksesPremiumService;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'auth' => [
                'user' => $request->user() ? array_merge(
                    $request->user()->only([
                        'id', 'username', 'email', 'role', 'admin_scope',
                        'xp', 'level', 'streak_count', 'subscription_status', 'avatar',
                        'show_romaji', 'show_indonesian_translation',
                    ]),
                    [
                        'name' => $request->user()->username,
                        'access_status' => app(AksesPremiumService::class)->statusAkses($request->user()),
                        'notifications' => $request->user()->unreadNotifications->map(function ($notification) {
                            return [
                                'id' => $notification->id,
                                'type' => class_basename($notification->type),
                                'data' => $notification->data,
                                'created_at' => $notification->created_at ? $notification->created_at->diffForHumans() : 'Baru saja',
                                'read_at' => $notification->read_at,
                            ];
                        })->take(10) // Tampilkan 10 terbaru
                    ]
                ) : null,
            ],
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
                'warning' => fn () => $request->session()->get('warning'),
                'info' => fn () => $request->session()->get('info'),
                'generated_password' => fn () => $request->session()->get('generated_password'),
                'newAchievements' => fn () => $request->session()->get('newAchievements'),
            ],
        ];
    }
}
