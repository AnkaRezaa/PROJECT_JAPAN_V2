<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\DeckPresentasi;
use App\Models\KloterBelajar;
use App\Models\Modul;
use App\Models\Pengguna;
use App\Models\ProgramPembelajaran;
use App\Models\SesiKelasLive;
use App\Services\KloterBelajarService;
use App\Services\RuangKelasLiveService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class RuangKelasLiveController extends Controller
{
    public function create(Request $request, KloterBelajarService $kloterService): Response
    {
        $user = $request->user();
        $programs = $kloterService->batasiProgramDikelola(
            ProgramPembelajaran::query()->orderBy('title'),
            $user
        )->get(['id', 'title', 'description']);

        $selectedProgramId = $request->integer('program_id') ?: (int) $programs->first()?->id;
        $program = $programs->firstWhere('id', $selectedProgramId);

        $kloters = $program
            ? $kloterService->kloterDikelola($user)
                ->where('program_pembelajaran_id', $program->id)
                ->where('status', 'active')
                ->orderBy('nama')
                ->get(['id', 'nama', 'kode', 'tanggal_mulai', 'tanggal_selesai'])
            : collect();

        $weeks = $program
            ? Modul::query()
                ->where('program_pembelajaran_id', $program->id)
                ->where('status', 'published')
                ->orderBy('week_number')
                ->orderBy('id')
                ->get(['id', 'title', 'week_number'])
            : collect();

        $decks = $program
            ? DeckPresentasi::query()
                ->with(['module:id,title,week_number', 'creator:id,username'])
                ->withCount('slides')
                ->whereHas('module', fn ($query) => $query->where('program_pembelajaran_id', $program->id))
                ->where(function ($query) use ($user) {
                    $query->where(function ($sharedQuery) {
                        $sharedQuery->shared()->where('status', 'published');
                    })
                        ->orWhere(function ($mentorQuery) use ($user) {
                            $mentorQuery->where('audience_scope', DeckPresentasi::AUDIENCE_MENTOR_SESSION)
                                ->when(! $user->isAdminGlobal(), fn ($ownerQuery) => $ownerQuery->where('created_by', $user->id));
                        });
                })
                ->orderBy('module_id')
                ->orderByDesc('updated_at')
                ->get(['id', 'created_by', 'module_id', 'title', 'status', 'audience_scope', 'updated_at'])
            : collect();

        $selectedKloter = $kloters->firstWhere('id', $request->integer('kloter_id')) ?: $kloters->first();
        $activeWeekNum = $kloterService->mingguAktif($selectedKloter);
        $defaultWeek = ($activeWeekNum ? $weeks->firstWhere('week_number', $activeWeekNum) : null)
            ?: ($weeks->firstWhere('id', $request->integer('week_id')) ?: $weeks->first());
        $defaultDeck = $decks->firstWhere('id', $request->integer('deck_id'))
            ?: ($defaultWeek ? $decks->firstWhere('module_id', $defaultWeek->id) : null);

        $activeSessions = SesiKelasLive::query()
            ->whereIn('kloter_belajar_id', $kloters->pluck('id'))
            ->where('status', 'live')
            ->with('mentor:id,username')
            ->get(['id', 'kloter_belajar_id', 'mentor_id'])
            ->keyBy('kloter_belajar_id');

        $upcomingSessions = SesiKelasLive::query()
            ->where(function ($query) use ($user) {
                if (! $user->isAdminGlobal()) {
                    $query->where('mentor_id', $user->id);
                }
            })
            ->whereIn('status', ['scheduled', 'live'])
            ->where(function ($q) {
                $q->whereNull('scheduled_at')
                    ->orWhere('scheduled_at', '>=', now()->subHours(4));
            })
            ->with([
                'program:id,title,slug',
                'kloter:id,nama,kode',
                'mentor:id,username',
                'deck:id,title',
            ])
            ->orderByRaw("CASE status WHEN 'live' THEN 0 ELSE 1 END")
            ->orderBy('scheduled_at')
            ->get()
            ->map(function ($s) {
                return [
                    'id' => $s->id,
                    'status' => $s->status,
                    'is_live' => $s->status === 'live',
                    'room_name' => $s->room_name,
                    'join_code' => $s->join_code,
                    'scheduled_at' => $s->scheduled_at?->toISOString(),
                    'scheduled_date_formatted' => $s->scheduled_at ? $s->scheduled_at->translatedFormat('l, d F Y') : 'Hari ini',
                    'scheduled_time_formatted' => $s->scheduled_at ? $s->scheduled_at->format('H:i').' WIB' : '-',
                    'program_title' => $s->program?->title,
                    'kloter_name' => $s->kloter?->nama,
                    'kloter_code' => $s->kloter?->kode,
                    'mentor_name' => $s->mentor?->username,
                    'deck_title' => $s->deck?->title ?? 'Papan Tulis Kosong',
                    'start_url' => route('admin.live-classes.start', $s, absolute: false),
                    'cancel_url' => route('admin.live-classes.cancel', $s, absolute: false),
                    'join_url' => route('user.live-classes.show', $s->join_code, absolute: true),
                ];
            });

        return Inertia::render('Admin/RuangKelas/Show', [
            'setup' => [
                'programs' => $programs->map->only(['id', 'title']),
                'program' => $program ? $program->only(['id', 'title', 'description']) : null,
                'kloters' => $kloters->map(fn ($k) => [
                    'id' => $k->id,
                    'nama' => $k->nama,
                    'kode' => $k->kode,
                    'minggu_aktif' => $kloterService->mingguAktif($k),
                    'live_mentor' => $activeSessions->get($k->id)?->mentor?->username,
                ]),
                'weeks' => $weeks,
                'decks' => $decks,
                'initial' => [
                    'program_id' => $program?->id,
                    'kloter_id' => $selectedKloter?->id,
                    'week_id' => $defaultWeek?->id,
                    'deck_id' => $defaultDeck?->id,
                ],
                'is_global_admin' => $user->isAdminGlobal(),
                'current_user_id' => $user->id,
            ],
            'upcomingSessions' => $upcomingSessions,
            'storeEndpoint' => route('admin.live-classes.store', absolute: false),
            'exitUrl' => route('admin.programs.index', absolute: false),
        ]);
    }

    public function store(Request $request, RuangKelasLiveService $service): RedirectResponse
    {
        $validated = $request->validate([
            'kloter_belajar_id' => ['required', 'integer', 'exists:kloter_belajar,id'],
            'presentation_deck_id' => ['nullable', 'integer', 'exists:presentation_decks,id'],
            'action' => ['required', Rule::in(['schedule', 'start'])],
            'scheduled_at' => ['nullable', 'required_if:action,schedule', 'date', 'after_or_equal:now'],
        ]);

        $scheduledAt = $validated['action'] === 'schedule'
            ? Carbon::parse($validated['scheduled_at'])
            : null;

        $kloter = app(KloterBelajarService::class)->kloterDikelola($request->user())->findOrFail($validated['kloter_belajar_id']);

        $session = $service->createSession(
            $request->user(),
            $kloter,
            filled($validated['presentation_deck_id'] ?? null) ? DeckPresentasi::findOrFail($validated['presentation_deck_id']) : null,
            $scheduledAt,
        );

        if ($validated['action'] === 'start') {
            $service->startSession($session, $request->user());

            return redirect()
                ->route('admin.live-classes.show', $session)
                ->with('success', 'Kelas dimulai.');
        }

        return redirect()
            ->route('admin.live-classes.create', ['program_id' => $kloter->program_pembelajaran_id])
            ->with('success', 'Jadwal kelas berhasil disimpan.');
    }

    public function show(Request $request, SesiKelasLive $liveClassSession, RuangKelasLiveService $service): Response
    {
        abort_unless($service->roleFor($liveClassSession, $request->user()) === 'mentor', 403);

        $user = $request->user();
        $availableDecks = DeckPresentasi::query()
            ->with(['module:id,title,week_number', 'creator:id,username'])
            ->withCount('slides')
            ->whereHas('module', fn ($query) => $query->where('program_pembelajaran_id', $liveClassSession->program_pembelajaran_id))
            ->where(function ($query) use ($user) {
                $query->where(function ($sharedQuery) {
                    $sharedQuery->shared()->where('status', 'published');
                })
                    ->orWhere(function ($mentorQuery) use ($user) {
                        $mentorQuery->where('audience_scope', DeckPresentasi::AUDIENCE_MENTOR_SESSION)
                            ->when(! $user->isAdminGlobal(), fn ($ownerQuery) => $ownerQuery->where('created_by', $user->id));
                    });
            })
            ->orderBy('module_id')
            ->orderByDesc('updated_at')
            ->get(['id', 'created_by', 'module_id', 'title', 'status', 'audience_scope', 'updated_at']);

        return Inertia::render('Admin/RuangKelas/Show', [
            'session' => $service->sessionPayload($liveClassSession),
            'availableDecks' => $availableDecks,
            'participants' => $liveClassSession->participants()->where('role', 'student')->with('user:id,username,avatar')->get()->map($service->participantPayload(...))->values(),
            'tokenEndpoint' => route('admin.live-classes.token', $liveClassSession, absolute: false),
            'startEndpoint' => route('admin.live-classes.start', $liveClassSession, absolute: false),
            'cancelEndpoint' => route('admin.live-classes.cancel', $liveClassSession, absolute: false),
            'stateEndpoint' => route('admin.live-classes.state', $liveClassSession, absolute: false),
            'endEndpoint' => route('admin.live-classes.end', $liveClassSession, absolute: false),
            'participantEndpoint' => route('admin.live-classes.participants.update', [$liveClassSession, '__USER__'], absolute: false),
            'muteAllEndpoint' => route('admin.live-classes.mute-all', $liveClassSession, absolute: false),
            'joinUrl' => route('user.live-classes.show', $liveClassSession->join_code, absolute: true),
            'exitUrl' => route('admin.programs.index', absolute: false),
        ]);
    }

    public function start(Request $request, SesiKelasLive $liveClassSession, RuangKelasLiveService $service): RedirectResponse
    {
        $service->startSession($liveClassSession, $request->user());

        return redirect()
            ->route('admin.live-classes.show', $liveClassSession)
            ->with('success', 'Kelas dimulai.');
    }

    public function cancel(Request $request, SesiKelasLive $liveClassSession, RuangKelasLiveService $service): RedirectResponse
    {
        try {
            $programId = $liveClassSession->program_pembelajaran_id;
            $service->cancelSession($liveClassSession, $request->user());

            return redirect()
                ->route('admin.live-classes.create', ['program_id' => $programId])
                ->with('success', 'Jadwal kelas dibatalkan.');
        } catch (\Throwable $e) {
            return redirect()->back()->with('error', 'Gagal membatalkan sesi: ' . $e->getMessage());
        }
    }

    public function token(Request $request, SesiKelasLive $liveClassSession, RuangKelasLiveService $service): JsonResponse
    {
        abort_unless($service->roleFor($liveClassSession, $request->user()) === 'mentor', 403);

        return response()->json($service->tokenPayload($liveClassSession, $request->user()));
    }

    public function state(Request $request, SesiKelasLive $liveClassSession, RuangKelasLiveService $service): JsonResponse
    {
        $validated = $request->validate([
            'stage_mode' => ['sometimes', Rule::in(['slides', 'board', 'screen'])],
            'current_slide_index' => ['sometimes', 'integer', 'min:0', 'max:10000'],
            'board_snapshot' => ['sometimes', 'array'],
            'presentation_deck_id' => ['sometimes', 'nullable', 'integer', 'exists:presentation_decks,id'],
        ]);

        if (strlen(json_encode($validated['board_snapshot'] ?? [], JSON_THROW_ON_ERROR)) > 500_000) {
            abort(422, 'Snapshot papan tulis terlalu besar.');
        }
        if (array_key_exists('board_snapshot', $validated)) {
            $validated['board_snapshot'] = $service->normalizeBoardSnapshot($validated['board_snapshot']);
        }

        $session = $service->updateState($liveClassSession, $request->user(), $validated);

        return response()->json(['state' => [
            'stage_mode' => $session->stage_mode,
            'current_slide_index' => $session->current_slide_index,
            'board_snapshot_version' => (int) data_get($session->board_snapshot, 'version', 0),
            'deck' => $service->deckPayload($session->deck),
        ]]);
    }

    public function updateParticipant(
        Request $request,
        SesiKelasLive $liveClassSession,
        Pengguna $user,
        RuangKelasLiveService $service
    ): JsonResponse {
        $validated = $request->validate([
            'action' => ['required', Rule::in(['mic', 'drawing'])],
            'enabled' => ['required', 'boolean'],
        ]);

        $participant = $validated['action'] === 'mic'
            ? $service->setMicBlocked($liveClassSession, $request->user(), $user, ! $validated['enabled'])
            : $service->setDrawingPermission($liveClassSession, $request->user(), $user, $validated['enabled']);

        return response()->json(['participant' => $service->participantPayload($participant)]);
    }

    public function kick(
        Request $request,
        SesiKelasLive $liveClassSession,
        Pengguna $user,
        RuangKelasLiveService $service
    ): JsonResponse {
        $service->kickParticipant($liveClassSession, $request->user(), $user);

        return response()->json(status: 204);
    }

    public function end(Request $request, SesiKelasLive $liveClassSession, RuangKelasLiveService $service): JsonResponse
    {
        $session = $service->endSession($liveClassSession, $request->user());

        return response()->json(['status' => $session->status]);
    }

    public function muteAll(Request $request, SesiKelasLive $liveClassSession, RuangKelasLiveService $service): JsonResponse
    {
        return response()->json([
            'muted' => $service->muteAllStudents($liveClassSession, $request->user()),
        ]);
    }
}
