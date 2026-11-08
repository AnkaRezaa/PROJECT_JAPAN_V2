<?php

namespace App\Http\Controllers;

use App\Models\AnggotaKloter;
use App\Models\SesiKelasLive;
use App\Services\AksesPremiumService;
use App\Services\RuangKelasLiveService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class LiveClassPlanningController extends Controller
{
    private function authorizeStudent(Request $request, SesiKelasLive $session, RuangKelasLiveService $service, AksesPremiumService $access): void
    {
        abort_unless($service->roleFor($session, $request->user()) === 'student', 403);
        abort_unless($access->punyaAksesKelas($request->user(), $session->program_pembelajaran_id), 403);
        abort_if($session->participants()->where('user_id', $request->user()->id)->whereNotNull('kicked_at')->exists(), 403);
    }

    public function respond(Request $request, SesiKelasLive $session, RuangKelasLiveService $service, AksesPremiumService $access)
    {
        $data = $request->validate(['response' => ['required', Rule::in(['attending', 'not_attending'])]]);
        DB::transaction(function () use ($request, $session, $service, $access, $data) {
            $locked = SesiKelasLive::query()->lockForUpdate()->findOrFail($session->id);
            $this->authorizeStudent($request, $locked, $service, $access);
            if ($locked->status !== 'scheduled') {
                throw ValidationException::withMessages(['response' => 'Pilihan kehadiran sudah ditutup.']);
            }
            DB::table('live_class_rsvps')->upsert([[
                'live_class_session_id' => $locked->id, 'user_id' => $request->user()->id,
                'response' => $data['response'], 'updated_at' => now(), 'created_at' => now(),
            ]], ['live_class_session_id', 'user_id'], ['response', 'updated_at']);
        });
        return back();
    }

    public function materials(Request $request, SesiKelasLive $session, RuangKelasLiveService $service)
    {
        abort_unless($service->roleFor($session, $request->user()) === 'mentor', 403);
        $data = $request->validate([
            'recording_url' => ['nullable', 'url:http,https', 'max:2048'],
            'summary_url' => ['nullable', 'url:http,https', 'max:2048'],
        ]);
        abort_unless($session->status === 'ended', 409, 'Materi tersedia setelah sesi selesai.');
        $session->update($data);
        return back()->with('success', 'Materi sesi berhasil disimpan.');
    }

    public function overview(Request $request, SesiKelasLive $session, RuangKelasLiveService $service)
    {
        abort_unless($service->roleFor($session, $request->user()) === 'mentor', 403);
        $members = AnggotaKloter::query()->where('kloter_belajar_id', $session->kloter_belajar_id)
            ->where('status', 'active')->with('user:id,username')->get();
        $responses = DB::table('live_class_rsvps')->where('live_class_session_id', $session->id)->pluck('response', 'user_id');
        return response()->json(['members' => $members->map(fn ($member) => [
            'id' => $member->user_id, 'name' => $member->user?->username,
            'response' => $responses[$member->user_id] ?? null,
        ])->values()]);
    }
}
