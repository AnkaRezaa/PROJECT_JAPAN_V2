<?php

namespace App\Services;

use Agence104\LiveKit\AccessToken;
use Agence104\LiveKit\AccessTokenOptions;
use Agence104\LiveKit\RoomServiceClient;
use Agence104\LiveKit\VideoGrant;
use App\Events\StatusKelasLiveDiperbarui;
use App\Models\AnggotaKloter;
use App\Models\DeckPresentasi;
use App\Models\KloterBelajar;
use App\Models\Pengguna;
use App\Models\PesertaKelasLive;
use App\Models\SesiKelasLive;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Livekit\ParticipantPermission;
use Livekit\TrackSource;

class RuangKelasLiveService
{
    public function createSession(
        Pengguna $mentor,
        KloterBelajar $kloter,
        ?DeckPresentasi $deck,
        ?Carbon $scheduledAt = null,
    ): SesiKelasLive {
        $this->assertMentorOwnsKloter($mentor, $kloter);

        if ($deck) {
            $deck->loadMissing('module:id,program_pembelajaran_id');
            abort_unless($deck->module?->program_pembelajaran_id === $kloter->program_pembelajaran_id, 422, 'Presentasi tidak berasal dari kelas kloter ini.');
            abort_unless(
                ($deck->audience_scope === DeckPresentasi::AUDIENCE_SHARED && $deck->status === 'published')
                    || ($deck->audience_scope === DeckPresentasi::AUDIENCE_MENTOR_SESSION
                        && ($mentor->isAdminGlobal() || $deck->created_by === $mentor->id)),
                403,
                'Presentasi ini tidak dapat digunakan pada sesi Anda.'
            );
        }

        return DB::transaction(function () use ($mentor, $kloter, $deck, $scheduledAt) {
            KloterBelajar::query()->whereKey($kloter->id)->lockForUpdate()->firstOrFail();

            $liveSession = SesiKelasLive::query()
                ->where('kloter_belajar_id', $kloter->id)
                ->where('status', 'live')
                ->lockForUpdate()
                ->first();

            if ($liveSession && ! $scheduledAt) {
                $authorized = $liveSession->mentor_id === $mentor->id || $mentor->isAdminGlobal();
                abort_unless($authorized, 409, 'Kloter ini masih memiliki ruang kelas yang dipandu admin lain.');

                return $liveSession;
            }

            if ($scheduledAt && SesiKelasLive::query()
                ->where('kloter_belajar_id', $kloter->id)
                ->where('status', 'scheduled')
                ->where('scheduled_at', $scheduledAt)
                ->lockForUpdate()
                ->exists()) {
                throw ValidationException::withMessages([
                    'scheduled_at' => 'Kloter ini sudah memiliki jadwal pada waktu yang sama.',
                ]);
            }

            return SesiKelasLive::create([
                'program_pembelajaran_id' => $kloter->program_pembelajaran_id,
                'kloter_belajar_id' => $kloter->id,
                'presentation_deck_id' => $deck?->id,
                'mentor_id' => $mentor->id,
                'room_name' => 'toku-up-'.Str::lower((string) Str::ulid()),
                'join_code' => $this->uniqueJoinCode(),
                'status' => $scheduledAt ? 'scheduled' : 'draft',
                'stage_mode' => $deck ? 'slides' : 'board',
                'scheduled_at' => $scheduledAt,
            ]);
        });
    }

    public function startSession(SesiKelasLive $session, Pengguna $mentor): SesiKelasLive
    {
        $this->assertMentor($session, $mentor);

        if ($session->status === 'live') {
            return $session;
        }

        abort_unless(in_array($session->status, ['draft', 'scheduled'], true), 409, 'Ruang kelas ini tidak dapat dimulai kembali.');

        return DB::transaction(function () use ($session, $mentor) {
            $session = SesiKelasLive::query()->lockForUpdate()->findOrFail($session->id);

            $otherLiveSession = SesiKelasLive::query()
                ->where('kloter_belajar_id', $session->kloter_belajar_id)
                ->where('status', 'live')
                ->whereKeyNot($session->id)
                ->exists();

            if ($otherLiveSession) {
                throw ValidationException::withMessages([
                    'session' => 'Kloter ini masih memiliki ruang kelas yang sedang berlangsung.',
                ]);
            }

            $session->update([
                'status' => 'live',
                'started_at' => $session->started_at ?: now(),
                'ended_at' => null,
            ]);

            $this->upsertParticipant($session, $mentor, 'mentor');

            return $session->fresh();
        });
    }

    public function cancelSession(SesiKelasLive $session, Pengguna $mentor): SesiKelasLive
    {
        $this->assertMentor($session, $mentor);
        abort_unless(in_array($session->status, ['draft', 'scheduled'], true), 409, 'Hanya kelas yang belum dimulai yang dapat dibatalkan.');

        $session->update(['status' => 'cancelled']);

        return $session->fresh();
    }

    public function endSession(SesiKelasLive $session, Pengguna $mentor): SesiKelasLive
    {
        $this->assertMentor($session, $mentor);

        $session->update([
            'status' => 'ended',
            'ended_at' => now(),
        ]);
        $session->participants()->whereNull('left_at')->update(['left_at' => now()]);
        $session->participants()->update(['can_draw' => false]);

        try {
            $this->roomClient()->deleteRoom($session->room_name);
        } catch (\Throwable $exception) {
            Log::warning('LiveKit room could not be deleted after session end.', [
                'session_id' => $session->id,
                'message' => $exception->getMessage(),
            ]);
        }

        broadcast(new StatusKelasLiveDiperbarui($session, ['status' => 'ended']));

        return $session->fresh();
    }

    public function tokenPayload(SesiKelasLive $session, Pengguna $user): array
    {
        $role = $this->roleFor($session, $user);
        abort_unless($session->status === 'live', 409, 'Ruang kelas belum dimulai atau sudah berakhir.');

        $participant = $this->upsertParticipant($session, $user, $role);
        abort_if($participant->kicked_at, 403, 'Anda telah dikeluarkan dari sesi ini.');

        $apiKey = (string) config('services.livekit.api_key');
        $apiSecret = (string) config('services.livekit.api_secret');
        abort_if($apiKey === '' || $apiSecret === '', 503, 'Kredensial LiveKit belum dikonfigurasi.');
        abort_if(
            strlen($apiSecret) < 32,
            503,
            'LIVEKIT_API_SECRET minimal 32 karakter dan harus sama dengan konfigurasi server LiveKit.'
        );

        $canPublish = $role === 'mentor' || ! $participant->mic_blocked_at;
        $grant = (new VideoGrant)
            ->setRoomJoin()
            ->setRoomName($session->room_name)
            ->setCanSubscribe()
            ->setCanPublish($canPublish)
            ->setCanPublishData();

        $grant->setCanPublishSources($role === 'mentor'
            ? ['camera', 'microphone', 'screen_share', 'screen_share_audio']
            : ($canPublish ? ['microphone'] : []));

        $options = (new AccessTokenOptions)
            ->setIdentity($this->identity($user))
            ->setName($user->username)
            ->setTtl((int) config('services.livekit.token_ttl', 900))
            ->setMetadata(json_encode([
                'user_id' => $user->id,
                'role' => $role,
                'can_draw' => (bool) $participant->can_draw,
            ], JSON_THROW_ON_ERROR));

        $token = (new AccessToken($apiKey, $apiSecret))
            ->init($options)
            ->setGrant($grant)
            ->toJwt();

        return [
            'server_url' => (string) config('services.livekit.ws_url'),
            'participant_token' => $token,
            'participant' => $this->participantPayload($participant->fresh('user')),
        ];
    }

    public function updateState(SesiKelasLive $session, Pengguna $mentor, array $state): SesiKelasLive
    {
        $this->assertMentor($session, $mentor);

        if (array_key_exists('presentation_deck_id', $state)) {
            $deckId = $state['presentation_deck_id'];
            if ($deckId !== null) {
                $deck = DeckPresentasi::query()->with('slides')->findOrFail($deckId);
                $deck->loadMissing('module:id,program_pembelajaran_id');
                abort_unless($deck->module?->program_pembelajaran_id === $session->program_pembelajaran_id, 422, 'Presentasi tidak berasal dari kelas ini.');
                $session->presentation_deck_id = $deck->id;
                $session->current_slide_index = 0;
            } else {
                $session->presentation_deck_id = null;
                $session->current_slide_index = 0;
            }
        }

        $session->fill(array_filter([
            'stage_mode' => $state['stage_mode'] ?? null,
            'current_slide_index' => $state['current_slide_index'] ?? null,
            'board_snapshot' => $state['board_snapshot'] ?? null,
        ], fn ($value) => $value !== null));
        $session->save();

        $session->loadMissing(['deck.slides', 'deck.module']);

        $payload = [
            'stage_mode' => $session->stage_mode,
            'current_slide_index' => $session->current_slide_index,
            'board_snapshot' => $session->board_snapshot,
            'deck' => $this->deckPayload($session->deck),
        ];
        broadcast(new StatusKelasLiveDiperbarui($session, $payload))->toOthers();

        return $session;
    }

    public function setMicBlocked(SesiKelasLive $session, Pengguna $mentor, Pengguna $student, bool $blocked): PesertaKelasLive
    {
        $this->assertMentor($session, $mentor);
        abort_if($student->id === $mentor->id, 422, 'Mikrofon mentor tidak dapat diblokir dari panel peserta.');
        $this->assertMember($session, $student);

        $participant = $this->upsertParticipant($session, $student, 'student');
        $participant->update(['mic_blocked_at' => $blocked ? now() : null]);

        try {
            $permission = new ParticipantPermission([
                'can_subscribe' => true,
                'can_publish' => ! $blocked,
                'can_publish_data' => true,
                'can_publish_sources' => $blocked ? [] : [TrackSource::MICROPHONE],
            ]);
            $this->roomClient()->updateParticipant($session->room_name, $this->identity($student), permission: $permission);
        } catch (\Throwable $exception) {
            Log::notice('LiveKit participant permission update deferred until reconnect.', [
                'session_id' => $session->id,
                'user_id' => $student->id,
                'message' => $exception->getMessage(),
            ]);
        }

        broadcast(new StatusKelasLiveDiperbarui($session, [
            'participant' => $this->participantPayload($participant->fresh('user')),
        ]))->toOthers();

        return $participant->fresh('user');
    }

    public function setDrawingPermission(SesiKelasLive $session, Pengguna $mentor, Pengguna $student, bool $allowed): PesertaKelasLive
    {
        $this->assertMentor($session, $mentor);
        $this->assertMember($session, $student);

        return DB::transaction(function () use ($session, $student, $allowed) {
            $session->participants()->where('role', 'student')->update(['can_draw' => false]);
            $participant = $this->upsertParticipant($session, $student, 'student');
            $participant->update(['can_draw' => $allowed]);

            broadcast(new StatusKelasLiveDiperbarui($session, [
                'participant' => $this->participantPayload($participant->fresh('user')),
                'drawing_reset' => true,
            ]))->toOthers();

            return $participant->fresh('user');
        });
    }

    public function muteAllStudents(SesiKelasLive $session, Pengguna $mentor): int
    {
        $this->assertMentor($session, $mentor);

        $participants = $session->participants()
            ->where('role', 'student')
            ->whereNull('left_at')
            ->whereNull('kicked_at')
            ->with('user:id')
            ->get();

        foreach ($participants as $participant) {
            if ($participant->user) {
                $this->setMicBlocked($session, $mentor, $participant->user, true);
            }
        }

        return $participants->count();
    }

    public function leaveSession(SesiKelasLive $session, Pengguna $user): void
    {
        $this->roleFor($session, $user);

        $session->participants()
            ->where('user_id', $user->id)
            ->update([
                'left_at' => now(),
                'last_seen_at' => now(),
                'can_draw' => false,
            ]);
    }

    public function normalizeBoardSnapshot(array $snapshot): array
    {
        $strokes = $snapshot['strokes'] ?? [];
        if (! is_array($strokes) || count($strokes) > 500) {
            throw ValidationException::withMessages(['board_snapshot' => 'Snapshot maksimal berisi 500 garis.']);
        }

        $normalized = [];
        foreach ($strokes as $stroke) {
            $points = is_array($stroke['points'] ?? null) ? $stroke['points'] : [];
            $id = (string) ($stroke['id'] ?? '');
            $color = (string) ($stroke['color'] ?? '');
            $width = (float) ($stroke['width'] ?? 0);

            if ($id === '' || strlen($id) > 100 || count($points) === 0 || count($points) > 300
                || ! preg_match('/^#[0-9a-fA-F]{6}$/', $color) || $width < 2 || $width > 10) {
                throw ValidationException::withMessages(['board_snapshot' => 'Data garis pada snapshot tidak valid.']);
            }

            $normalizedPoints = [];
            foreach ($points as $point) {
                $x = $point['x'] ?? null;
                $y = $point['y'] ?? null;
                if (! is_numeric($x) || ! is_numeric($y) || $x < 0 || $x > 100 || $y < 0 || $y > 100) {
                    throw ValidationException::withMessages(['board_snapshot' => 'Koordinat coretan tidak valid.']);
                }
                $normalizedPoints[] = ['x' => round((float) $x, 2), 'y' => round((float) $y, 2)];
            }

            $normalized[] = [
                'id' => $id,
                'ownerId' => is_numeric($stroke['ownerId'] ?? null) ? (int) $stroke['ownerId'] : 'mentor',
                'color' => strtolower($color),
                'width' => $width,
                'points' => $normalizedPoints,
            ];
        }

        return [
            'version' => max(0, (int) ($snapshot['version'] ?? 0)),
            'strokes' => $normalized,
        ];
    }

    public function kickParticipant(SesiKelasLive $session, Pengguna $mentor, Pengguna $student): void
    {
        $this->assertMentor($session, $mentor);
        $this->assertMember($session, $student);

        $participant = $this->upsertParticipant($session, $student, 'student');
        $participant->update(['kicked_at' => now(), 'left_at' => now()]);

        try {
            $this->roomClient()->removeParticipant($session->room_name, $this->identity($student));
        } catch (\Throwable $exception) {
            Log::notice('LiveKit participant was already disconnected when kicked.', [
                'session_id' => $session->id,
                'user_id' => $student->id,
                'message' => $exception->getMessage(),
            ]);
        }

        broadcast(new StatusKelasLiveDiperbarui($session, [
            'participant_removed' => $student->id,
        ]))->toOthers();
    }

    public function roleFor(SesiKelasLive $session, Pengguna $user): string
    {
        if ($session->mentor_id === $user->id || $user->isAdminGlobal()) {
            return 'mentor';
        }

        $this->assertMember($session, $user);

        return 'student';
    }

    public function sessionPayload(SesiKelasLive $session): array
    {
        $session->loadMissing(['program:id,title,slug', 'kloter:id,nama,kode', 'mentor:id,username', 'deck.module:id,title', 'deck.slides']);

        return [
            'id' => $session->id,
            'join_code' => $session->join_code,
            'status' => $session->status,
            'stage_mode' => $session->stage_mode,
            'current_slide_index' => $session->current_slide_index,
            'board_snapshot' => $session->board_snapshot ?: [],
            'scheduled_at' => $session->scheduled_at?->toIso8601String(),
            'started_at' => $session->started_at?->toIso8601String(),
            'ended_at' => $session->ended_at?->toIso8601String(),
            'program' => $session->program,
            'kloter' => $session->kloter,
            'mentor' => $session->mentor,
            'deck' => $this->deckPayload($session->deck),
        ];
    }

    public function deckPayload(?DeckPresentasi $deck): ?array
    {
        if (! $deck) {
            return null;
        }

        $deck->loadMissing(['module:id,title', 'slides']);

        return [
            'id' => $deck->id,
            'title' => $deck->title,
            'module' => $deck->module,
            'slides' => $deck->slides->map(fn ($slide) => [
                'id' => $slide->id,
                'title' => $slide->title,
                'layout' => $slide->layout,
                'content' => $slide->content,
                'media_url' => $slide->media_url,
                'background' => $slide->background,
                'accent_color' => $slide->accent_color,
                'board_data' => $slide->board_data,
                'jamboard_data' => $slide->jamboard_data,
                'snapshot_url' => $slide->snapshot_url,
                'snapshot_data' => $slide->snapshot_data,
            ])->values(),
        ];
    }

    public function participantPayload(PesertaKelasLive $participant): array
    {
        $participant->loadMissing('user:id,username,avatar');

        return [
            'id' => $participant->user_id,
            'name' => $participant->user?->username ?: 'Peserta',
            'avatar' => $participant->user?->avatar,
            'role' => $participant->role,
            'canWrite' => (bool) $participant->can_draw,
            'micBlocked' => (bool) $participant->mic_blocked_at,
            'kicked' => (bool) $participant->kicked_at,
        ];
    }

    private function upsertParticipant(SesiKelasLive $session, Pengguna $user, string $role): PesertaKelasLive
    {
        $participant = PesertaKelasLive::query()->firstOrNew([
            'live_class_session_id' => $session->id,
            'user_id' => $user->id,
        ]);
        $participant->role = $role;
        $participant->joined_at ??= now();
        $participant->left_at = null;
        $participant->last_seen_at = now();
        $participant->save();

        return $participant;
    }

    private function assertMentor(SesiKelasLive $session, Pengguna $mentor): void
    {
        $authorized = ($session->mentor_id === $mentor->id || $mentor->isAdminGlobal())
            && $mentor->role === 'admin';
        abort_unless($authorized, 403, 'Anda bukan mentor sesi ini.');
    }

    private function assertMentorOwnsKloter(Pengguna $mentor, KloterBelajar $kloter): void
    {
        abort_unless(
            $mentor->role === 'admin' && ($mentor->isAdminGlobal() || $kloter->admin_id === $mentor->id),
            403,
            'Anda bukan mentor kloter ini.'
        );
        abort_unless($kloter->status === 'active', 422, 'Kloter tidak aktif.');
    }

    private function assertMember(SesiKelasLive $session, Pengguna $user): void
    {
        $allowed = AnggotaKloter::query()
            ->where('kloter_belajar_id', $session->kloter_belajar_id)
            ->where('user_id', $user->id)
            ->where('status', 'active')
            ->exists();

        abort_unless($allowed, 403, 'Anda bukan anggota aktif kloter ini.');
    }

    public function portalPayloadForUser(Pengguna $user): array
    {
        $userKloterIds = AnggotaKloter::query()
            ->where('user_id', $user->id)
            ->where('status', 'active')
            ->pluck('kloter_belajar_id');

        if ($userKloterIds->isEmpty()) {
            return [
                'active_session' => null,
                'upcoming_sessions' => [],
                'past_sessions' => [],
                'has_kloter' => false,
            ];
        }

        $baseQuery = SesiKelasLive::query()
            ->whereIn('kloter_belajar_id', $userKloterIds)
            ->with([
                'program:id,title,slug',
                'kloter:id,nama,kode',
                'mentor:id,username,avatar',
                'deck:id,title,module_id',
                'deck.module:id,title,week_number',
            ]);

        $activeSession = (clone $baseQuery)
            ->where('status', 'live')
            ->first();

        $upcomingSessions = (clone $baseQuery)
            ->where('status', 'scheduled')
            ->where(fn ($q) => $q->whereNull('scheduled_at')->orWhere('scheduled_at', '>=', now()->subHours(2)))
            ->orderBy('scheduled_at', 'asc')
            ->get();

        $pastSessions = (clone $baseQuery)
            ->where('status', 'ended')
            ->orderBy('ended_at', 'desc')
            ->take(5)
            ->get();

        return [
            'active_session' => $activeSession ? $this->sessionCardPayload($activeSession) : null,
            'upcoming_sessions' => $upcomingSessions->map($this->sessionCardPayload(...))->values(),
            'past_sessions' => $pastSessions->map($this->sessionCardPayload(...))->values(),
            'has_kloter' => true,
        ];
    }

    public function sessionCardPayload(SesiKelasLive $session): array
    {
        $session->loadMissing([
            'program:id,title,slug',
            'kloter:id,nama,kode',
            'mentor:id,username,avatar',
            'deck:id,title,module_id',
            'deck.module:id,title',
        ]);

        $scheduled = $session->scheduled_at;
        $isToday = $scheduled ? $scheduled->isToday() : false;
        $startsInMinutes = $scheduled ? (int) now()->diffInMinutes($scheduled, false) : null;

        return [
            'id' => $session->id,
            'join_code' => $session->join_code,
            'status' => $session->status,
            'is_live' => $session->status === 'live',
            'is_today' => $isToday,
            'starts_in_minutes' => $startsInMinutes,
            'scheduled_at' => $scheduled?->toIso8601String(),
            'date_formatted' => $scheduled ? $scheduled->locale('id')->translatedFormat('l, d F Y') : 'Jadwal belum ditentukan',
            'time_formatted' => $scheduled ? $scheduled->format('H:i').' WIB' : '-',
            'program' => $session->program ? [
                'id' => $session->program->id,
                'title' => $session->program->title,
                'slug' => $session->program->slug,
            ] : null,
            'kloter' => $session->kloter ? [
                'id' => $session->kloter->id,
                'nama' => $session->kloter->nama,
                'kode' => $session->kloter->kode,
            ] : null,
            'mentor' => $session->mentor ? [
                'id' => $session->mentor->id,
                'username' => $session->mentor->username,
                'avatar' => $session->mentor->avatar,
            ] : null,
            'topic' => $session->deck?->title ?? ($session->deck?->module?->title ?? 'Sesi Tatap Muka & Bimbingan'),
            'join_url' => route('user.live-classes.show', $session->join_code, absolute: true),
        ];
    }

    private function roomClient(): RoomServiceClient
    {
        return new RoomServiceClient(
            (string) config('services.livekit.api_url'),
            (string) config('services.livekit.api_key'),
            (string) config('services.livekit.api_secret'),
        );
    }

    private function identity(Pengguna $user): string
    {
        return 'user:'.$user->id;
    }

    private function uniqueJoinCode(): string
    {
        do {
            $code = Str::upper(Str::random(8));
        } while (SesiKelasLive::where('join_code', $code)->exists());

        return $code;
    }
}
