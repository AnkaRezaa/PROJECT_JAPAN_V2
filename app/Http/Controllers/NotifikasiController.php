<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class NotifikasiController extends Controller
{
    public function index(Request $request)
    {
        if ($request->header('X-Inertia')) {
            return redirect()->route('notifications.page');
        }

        $notifications = $request->user()
            ->unreadNotifications()
            ->latest()
            ->limit(10)
            ->get()
            ->map(fn ($notification) => $this->presentNotification($notification));

        return response()->json([
            'notifications' => $notifications,
            'unread_count' => $request->user()->unreadNotifications()->count(),
        ]);
    }

    public function page(Request $request): Response
    {
        $filter = $request->string('filter')->toString() === 'unread' ? 'unread' : 'all';

        $notifications = $request->user()
            ->notifications()
            ->when($filter === 'unread', fn ($query) => $query->whereNull('read_at'))
            ->latest()
            ->paginate(15)
            ->withQueryString()
            ->through(fn ($notification) => $this->presentNotification($notification));

        return Inertia::render('Notifikasi/Index', [
            'notifications' => $notifications,
            'unreadCount' => $request->user()->unreadNotifications()->count(),
            'filters' => ['filter' => $filter],
        ]);
    }

    public function markAsRead(Request $request, $id)
    {
        $notification = $request->user()->notifications()->where('id', $id)->first();

        if ($notification) {
            $notification->markAsRead();
        }

        return back();
    }

    public function markAllAsRead(Request $request)
    {
        $request->user()->unreadNotifications()->update(['read_at' => now()]);

        return back();
    }

    private function presentNotification($notification): array
    {
        return [
            'id' => $notification->id,
            'type' => class_basename($notification->type),
            'data' => $notification->data,
            'category' => $notification->data['category'] ?? 'system',
            'severity' => $notification->data['severity'] ?? 'info',
            'created_at' => $notification->created_at?->diffForHumans() ?? 'Baru saja',
            'read_at' => $notification->read_at?->toISOString(),
        ];
    }
}
