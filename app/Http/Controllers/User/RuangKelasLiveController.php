<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Models\SesiKelasLive;
use App\Services\AksesPremiumService;
use App\Services\RuangKelasLiveService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class RuangKelasLiveController extends Controller
{
    public function index(Request $request, RuangKelasLiveService $service, AksesPremiumService $aksesPremium): Response
    {
        $user = $request->user();
        $portalData = $service->portalPayloadForUser($user);
        $accessStatus = $aksesPremium->statusAkses($user);

        return Inertia::render('User/RuangKelas/Index', [
            'activeSession' => $portalData['active_session'],
            'upcomingSessions' => $portalData['upcoming_sessions'],
            'pastSessions' => $portalData['past_sessions'],
            'hasKloter' => $portalData['has_kloter'],
            'accessStatus' => $accessStatus,
        ]);
    }

    public function joinByCode(Request $request, RuangKelasLiveService $service): RedirectResponse
    {
        $code = trim((string) $request->input('join_code', ''));
        if (preg_match('/live-classes\/([A-Za-z0-9_-]+)/', $code, $matches)) {
            $code = $matches[1];
        }
        $code = preg_replace('/[^A-Za-z0-9_-]/', '', $code);

        if (empty($code)) {
            return back()->withErrors(['join_code' => 'Masukkan kode atau tautan kelas yang valid.']);
        }

        $session = SesiKelasLive::where('join_code', $code)->first();

        if (! $session) {
            return back()->withErrors(['join_code' => 'Ruang kelas dengan kode tersebut tidak ditemukan.']);
        }

        try {
            if ($service->roleFor($session, $request->user()) !== 'student') {
                return back()->withErrors(['join_code' => 'Anda tidak terdaftar dalam kloter untuk sesi ruang kelas ini.']);
            }
        } catch (\Throwable) {
            return back()->withErrors(['join_code' => 'Anda tidak terdaftar dalam kloter untuk sesi ruang kelas ini.']);
        }

        return redirect()->route('user.live-classes.show', $session->join_code);
    }

    public function show(Request $request, SesiKelasLive $session, RuangKelasLiveService $service, AksesPremiumService $aksesPremium): Response|RedirectResponse
    {
        $user = $request->user();

        // 1. Guard Status Sesi yang telah lewat atau dibatalkan
        if ($session->status === 'cancelled') {
            return redirect()->route('user.live-classes.index')->withErrors(['session' => 'Sesi kelas live ini telah dibatalkan oleh mentor.']);
        }

        if ($session->status === 'ended') {
            return redirect()->route('user.live-classes.index')->withErrors(['session' => 'Sesi kelas live ini telah berakhir.']);
        }

        // 2. Guard Siswa dikeluarkan (kicked)
        abort_if(
            $session->participants()->where('user_id', $user->id)->whereNotNull('kicked_at')->exists(),
            403,
            'Anda telah dikeluarkan dari sesi kelas live ini.'
        );

        // 3. Guard Akses Premium (Siswa wajib premium untuk masuk ruang live)
        if (! $aksesPremium->punyaAksesKelas($user, $session->program_pembelajaran_id)) {
            return Inertia::render('User/RuangKelas/ShowUpgradeRequired', [
                'session' => $service->sessionCardPayload($session),
                'pricingUrl' => route('katalog', ['program' => $session->program?->slug]),
                'portalUrl' => route('user.live-classes.index'),
            ]);
        }

        // 4. Guard Hak Akses Kloter
        abort_unless($service->roleFor($session, $user) === 'student', 403, 'Anda bukan anggota aktif kloter ini.');

        // 5. Guard Status Sesi (Node hanya terbuka saat mentor sudah live)
        if ($session->status !== 'live') {
            return Inertia::render('User/RuangKelas/ShowWaitingMentor', [
                'session' => $service->sessionCardPayload($session),
                'portalUrl' => route('user.live-classes.index'),
            ]);
        }

        $sessionPayload = $service->sessionPayload($session);

        return Inertia::render('User/RuangKelas/Show', [
            'session' => $sessionPayload,
            'participants' => $session->participants()
                ->where('role', 'student')
                ->whereNull('left_at')
                ->whereNull('kicked_at')
                ->with('user:id,username,avatar')
                ->get()
                ->map($service->participantPayload(...))
                ->values(),
            'tokenEndpoint' => route('user.live-classes.token', $session->join_code, absolute: false),
            'leaveEndpoint' => route('user.live-classes.leave', $session->join_code, absolute: false),
            'exitUrl' => route('user.live-classes.index', absolute: false),
        ]);
    }

    public function token(Request $request, SesiKelasLive $session, RuangKelasLiveService $service, AksesPremiumService $aksesPremium): JsonResponse
    {
        abort_unless($service->roleFor($session, $request->user()) === 'student', 403);
        abort_unless($aksesPremium->punyaAksesKelas($request->user(), $session->program_pembelajaran_id), 403, 'Akses premium diperlukan.');
        abort_if(
            $session->participants()->where('user_id', $request->user()->id)->whereNotNull('kicked_at')->exists(),
            403,
            'Anda telah dikeluarkan dari sesi kelas live ini.'
        );

        return response()->json($service->tokenPayload($session, $request->user()));
    }

    public function leave(Request $request, SesiKelasLive $session, RuangKelasLiveService $service): JsonResponse
    {
        $service->leaveSession($session, $request->user());

        return response()->json(status: 204);
    }
}
