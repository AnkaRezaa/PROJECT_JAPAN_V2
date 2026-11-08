<?php

use App\Models\AnggotaKloter;
use App\Models\DeckPresentasi;
use App\Models\KloterBelajar;
use App\Models\LevelPembelajaran;
use App\Models\Modul;
use App\Models\Pengguna;
use App\Models\ProgramPembelajaran;
use App\Models\SesiKelasLive;
use Inertia\Testing\AssertableInertia as Assert;
use App\Services\AksesPremiumService;

function createLiveClassRoadmapFixture(): array
{
    $level = LevelPembelajaran::create([
        'level_name' => 'N3',
        'stage' => 301,
        'is_premium' => false,
    ]);
    $program = ProgramPembelajaran::create([
        'level_id' => $level->id,
        'title' => 'Program Live Class',
        'slug' => 'program-live-class',
        'status' => 'published',
        'sort_order' => 1,
    ]);
    $module = Modul::create([
        'level_id' => $level->id,
        'program_pembelajaran_id' => $program->id,
        'title' => 'Minggu Live Class',
        'week_number' => 1,
        'status' => 'published',
    ]);
    $mentor = Pengguna::factory()->create([
        'role' => 'admin',
        'admin_scope' => Pengguna::ADMIN_SCOPE_KLOTER,
        'status' => 'active',
    ]);
    $globalAdmin = Pengguna::factory()->create([
        'role' => 'admin',
        'admin_scope' => Pengguna::ADMIN_SCOPE_GLOBAL,
        'status' => 'active',
    ]);
    $student = Pengguna::factory()->create(['role' => 'user', 'status' => 'active']);
    $outsider = Pengguna::factory()->create(['role' => 'user', 'status' => 'active']);
    $kloter = KloterBelajar::create([
        'program_pembelajaran_id' => $program->id,
        'admin_id' => $mentor->id,
        'nama' => 'Kloter Live Class',
        'kode' => 'KLT-LIVE-CLASS',
        'tanggal_mulai' => now()->subDay()->toDateString(),
        'tanggal_selesai' => now()->addMonth()->toDateString(),
        'status' => 'active',
    ]);

    AnggotaKloter::create([
        'kloter_belajar_id' => $kloter->id,
        'user_id' => $student->id,
        'joined_at' => now(),
        'status' => 'active',
    ]);

    return compact('program', 'module', 'mentor', 'globalAdmin', 'student', 'outsider', 'kloter');
}

it('protects rsvp by kloter and prevents changes once a session starts', function () {
    $fixture = createLiveClassRoadmapFixture();
    $access = Mockery::mock(AksesPremiumService::class)->makePartial();
    $access->shouldReceive('punyaAksesKelas')->andReturn(true);
    $this->app->instance(AksesPremiumService::class, $access);
    $session = SesiKelasLive::create([
        'program_pembelajaran_id' => $fixture['program']->id, 'kloter_belajar_id' => $fixture['kloter']->id,
        'mentor_id' => $fixture['mentor']->id, 'room_name' => 'rsvp-room', 'join_code' => 'RSVPTEST1',
        'status' => 'scheduled', 'stage_mode' => 'board', 'scheduled_at' => now()->addDay(),
    ]);
    $url = route('user.live-classes.rsvp', $session->join_code);
    $this->actingAs($fixture['student'])->post($url, ['response' => 'attending'])->assertRedirect();
    $this->actingAs($fixture['student'])->post($url, ['response' => 'not_attending'])->assertRedirect();
    $this->assertDatabaseCount('live_class_rsvps', 1);
    $this->assertDatabaseHas('live_class_rsvps', ['user_id' => $fixture['student']->id, 'response' => 'not_attending']);
    $this->actingAs($fixture['outsider'])->post($url, ['response' => 'attending'])->assertForbidden();
    $session->update(['status' => 'live']);
    $this->actingAs($fixture['student'])->post($url, ['response' => 'attending'])->assertSessionHasErrors('response');
});

it('limits session materials and attendance to the assigned mentor', function () {
    $fixture = createLiveClassRoadmapFixture();
    $session = SesiKelasLive::create([
        'program_pembelajaran_id' => $fixture['program']->id, 'kloter_belajar_id' => $fixture['kloter']->id,
        'mentor_id' => $fixture['mentor']->id, 'room_name' => 'materials-room', 'join_code' => 'MATERIALS1',
        'status' => 'ended', 'stage_mode' => 'board',
    ]);
    $this->actingAs($fixture['outsider'])->get(route('admin.live-classes.attendance', $session))->assertForbidden();
    $otherMentor = Pengguna::factory()->create(['role' => 'admin', 'admin_scope' => Pengguna::ADMIN_SCOPE_KLOTER, 'status' => 'active']);
    $this->actingAs($otherMentor)->get(route('admin.live-classes.attendance', $session))->assertForbidden();
    $this->actingAs($otherMentor)->patch(route('admin.live-classes.materials', $session), ['recording_url' => 'https://example.com/other'])->assertForbidden();
    $this->actingAs($fixture['mentor'])->get(route('admin.live-classes.attendance', $session))->assertOk()->assertJsonPath('members.0.response', null);
    $this->actingAs($fixture['mentor'])->patch(route('admin.live-classes.materials', $session), ['recording_url' => 'javascript:alert(1)'])->assertSessionHasErrors('recording_url');
    $this->actingAs($fixture['mentor'])->patch(route('admin.live-classes.materials', $session), ['recording_url' => 'https://example.com/video', 'summary_url' => null])->assertRedirect();
    $this->assertDatabaseHas('live_class_sessions', ['id' => $session->id, 'recording_url' => 'https://example.com/video']);
    $session->update(['status' => 'scheduled']);
    $this->actingAs($fixture['mentor'])->patch(route('admin.live-classes.materials', $session), ['recording_url' => 'https://example.com/other'])->assertStatus(409);
});

it('paginates mentor session planning without losing older sessions', function () {
    $fixture = createLiveClassRoadmapFixture();
    foreach (range(1, 21) as $number) {
        SesiKelasLive::create([
            'program_pembelajaran_id' => $fixture['program']->id, 'kloter_belajar_id' => $fixture['kloter']->id,
            'mentor_id' => $fixture['mentor']->id, 'room_name' => 'page-room-'.$number,
            'join_code' => 'PAGE'.str_pad((string) $number, 8, '0', STR_PAD_LEFT),
            'status' => 'ended', 'stage_mode' => 'board',
        ]);
    }
    $url = route('admin.live-classes.create', ['program_id' => $fixture['program']->id]);
    $this->actingAs($fixture['mentor'])->get($url)->assertInertia(fn (Assert $page) => $page
        ->has('planningSessions.data', 20)->whereNot('planningSessions.next_page_url', null));
    $this->actingAs($fixture['mentor'])->get($url.'&planning_page=2')->assertInertia(fn (Assert $page) => $page
        ->has('planningSessions.data', 1)->where('planningSessions.data.0.title', 'Ruang Kelas'));
});

it('keeps multiple sessions visible and hides ended session links from students without access', function () {
    $fixture = createLiveClassRoadmapFixture();
    foreach ([['scheduled', 'MULTILIVE1'], ['scheduled', 'MULTILIVE2'], ['ended', 'MULTILIVE3']] as [$status, $code]) {
        SesiKelasLive::create([
            'program_pembelajaran_id' => $fixture['program']->id, 'kloter_belajar_id' => $fixture['kloter']->id,
            'mentor_id' => $fixture['mentor']->id, 'room_name' => $code, 'join_code' => $code,
            'status' => $status, 'stage_mode' => 'board', 'scheduled_at' => now()->addDay(),
            'recording_url' => $status === 'ended' ? 'https://example.com/recording' : null,
        ]);
    }
    $access = Mockery::mock(AksesPremiumService::class)->makePartial();
    $access->shouldReceive('punyaAksesKelas')->andReturn(false);
    $this->app->instance(AksesPremiumService::class, $access);
    $this->actingAs($fixture['student'])->get(route('user.modul.program', $fixture['program']->slug))
        ->assertInertia(fn (Assert $page) => $page->has('weeks.0.live_sessions', 3)
            ->where('weeks.0.live_sessions.2.recording_url', null));
});

it('only exposes recording links to eligible students who were not kicked', function () {
    $fixture = createLiveClassRoadmapFixture();
    $session = SesiKelasLive::create([
        'program_pembelajaran_id' => $fixture['program']->id, 'kloter_belajar_id' => $fixture['kloter']->id,
        'mentor_id' => $fixture['mentor']->id, 'room_name' => 'recording-room', 'join_code' => 'RECORDING1',
        'status' => 'ended', 'stage_mode' => 'board', 'recording_url' => 'https://example.com/private-recording',
    ]);
    $access = Mockery::mock(AksesPremiumService::class)->makePartial();
    $access->shouldReceive('punyaAksesKelas')->andReturn(true);
    $this->app->instance(AksesPremiumService::class, $access);
    $url = route('user.modul.program', $fixture['program']->slug);
    $this->actingAs($fixture['student'])->get($url)->assertInertia(fn (Assert $page) => $page
        ->where('weeks.0.live_sessions.0.recording_url', 'https://example.com/private-recording'));
    $session->participants()->create(['user_id' => $fixture['student']->id, 'role' => 'student', 'kicked_at' => now()]);
    $this->actingAs($fixture['student'])->get($url)->assertInertia(fn (Assert $page) => $page
        ->where('weeks.0.live_sessions.0.recording_url', null)
        ->where('weeks.0.live_sessions.0.access_allowed', false));
    $this->actingAs($fixture['outsider'])->get($url)->assertInertia(fn (Assert $page) => $page
        ->has('weeks.0.live_sessions', 0));
});

it('connects the student roadmap rsvp mentor recap and published session materials', function () {
    $fixture = createLiveClassRoadmapFixture();
    $access = Mockery::mock(AksesPremiumService::class)->makePartial();
    $access->shouldReceive('punyaAksesKelas')->andReturn(true);
    $this->app->instance(AksesPremiumService::class, $access);
    $session = SesiKelasLive::create([
        'program_pembelajaran_id' => $fixture['program']->id, 'kloter_belajar_id' => $fixture['kloter']->id,
        'mentor_id' => $fixture['mentor']->id, 'room_name' => 'planning-flow', 'join_code' => 'FLOWLIVE1',
        'status' => 'scheduled', 'stage_mode' => 'board', 'scheduled_at' => now()->addDay(),
    ]);
    $roadmapUrl = route('user.modul.program', $fixture['program']->slug);
    $this->actingAs($fixture['student'])->get($roadmapUrl)->assertInertia(fn (Assert $page) => $page
        ->where('weeks.0.live_sessions.0.status', 'scheduled')->where('weeks.0.live_sessions.0.rsvp', null));
    $this->actingAs($fixture['student'])->post(route('user.live-classes.rsvp', $session->join_code), ['response' => 'attending'])->assertRedirect();
    $this->actingAs($fixture['student'])->get($roadmapUrl)->assertInertia(fn (Assert $page) => $page
        ->where('weeks.0.live_sessions.0.rsvp', 'attending'));
    $this->actingAs($fixture['mentor'])->get(route('admin.live-classes.attendance', $session))
        ->assertOk()->assertJsonPath('members.0.response', 'attending');
    $this->actingAs($fixture['mentor'])->post(route('admin.live-classes.start', $session))->assertRedirect();
    $this->actingAs($fixture['student'])->get($roadmapUrl)->assertInertia(fn (Assert $page) => $page
        ->where('weeks.0.live_sessions.0.status', 'live')
        ->where('weeks.0.live_sessions.0.join_url', route('user.live-classes.show', $session->join_code, absolute: false)));
    $this->actingAs($fixture['student'])->post(route('user.live-classes.rsvp', $session->join_code), ['response' => 'not_attending'])->assertSessionHasErrors('response');
    $session->update(['status' => 'ended', 'ended_at' => now()]);
    $this->actingAs($fixture['mentor'])->patch(route('admin.live-classes.materials', $session), [
        'recording_url' => 'https://example.com/recording', 'summary_url' => 'https://example.com/summary',
    ])->assertRedirect();
    $this->actingAs($fixture['student'])->get($roadmapUrl)->assertInertia(fn (Assert $page) => $page
        ->where('weeks.0.live_sessions.0.status', 'ended')
        ->where('weeks.0.live_sessions.0.recording_url', 'https://example.com/recording')
        ->where('weeks.0.live_sessions.0.summary_url', 'https://example.com/summary'));
});

it('lets the assigned mentor schedule a class without starting LiveKit', function () {
    $fixture = createLiveClassRoadmapFixture();
    $scheduledAt = now()->addDay()->startOfHour();

    $this->actingAs($fixture['mentor'])
        ->post(route('admin.live-classes.store'), [
            'kloter_belajar_id' => $fixture['kloter']->id,
            'presentation_deck_id' => null,
            'action' => 'schedule',
            'scheduled_at' => $scheduledAt->format('Y-m-d H:i:s'),
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('live_class_sessions', [
        'kloter_belajar_id' => $fixture['kloter']->id,
        'mentor_id' => $fixture['mentor']->id,
        'status' => 'scheduled',
        'started_at' => null,
    ]);
});

it('allows a global admin to schedule and mentor any active kloter', function () {
    $fixture = createLiveClassRoadmapFixture();

    $this->actingAs($fixture['globalAdmin'])
        ->post(route('admin.live-classes.store'), [
            'kloter_belajar_id' => $fixture['kloter']->id,
            'presentation_deck_id' => null,
            'action' => 'schedule',
            'scheduled_at' => now()->addDay()->format('Y-m-d H:i:s'),
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('live_class_sessions', [
        'kloter_belajar_id' => $fixture['kloter']->id,
        'mentor_id' => $fixture['globalAdmin']->id,
        'status' => 'scheduled',
    ]);
});

it('denies student media tokens until the scheduled class is live', function () {
    $fixture = createLiveClassRoadmapFixture();
    $access = Mockery::mock(AksesPremiumService::class)->makePartial();
    $access->shouldReceive('punyaAksesKelas')->andReturn(true);
    $this->app->instance(AksesPremiumService::class, $access);
    $session = SesiKelasLive::create([
        'program_pembelajaran_id' => $fixture['program']->id,
        'kloter_belajar_id' => $fixture['kloter']->id,
        'mentor_id' => $fixture['mentor']->id,
        'room_name' => 'roadmap-scheduled-room',
        'join_code' => 'ROADMAPLIVE1',
        'status' => 'scheduled',
        'stage_mode' => 'board',
        'scheduled_at' => now()->addHour(),
    ]);

    $this->actingAs($fixture['student'])
        ->post(route('user.live-classes.token', $session->join_code))
        ->assertStatus(409);
});

it('starts a scheduled class idempotently from the mentor page', function () {
    $fixture = createLiveClassRoadmapFixture();
    $session = SesiKelasLive::create([
        'program_pembelajaran_id' => $fixture['program']->id,
        'kloter_belajar_id' => $fixture['kloter']->id,
        'mentor_id' => $fixture['mentor']->id,
        'room_name' => 'roadmap-start-room',
        'join_code' => 'ROADMAPLIVE2',
        'status' => 'scheduled',
        'stage_mode' => 'board',
        'scheduled_at' => now()->addHour(),
    ]);

    $this->actingAs($fixture['mentor'])
        ->post(route('admin.live-classes.start', $session))
        ->assertRedirect(route('admin.live-classes.show', $session));

    $this->actingAs($fixture['mentor'])
        ->post(route('admin.live-classes.start', $session))
        ->assertRedirect(route('admin.live-classes.show', $session));

    expect($session->fresh()->status)->toBe('live')
        ->and($session->fresh()->started_at)->not->toBeNull();
});

it('shows the scheduled roadmap node only to an active kloter member', function () {
    $fixture = createLiveClassRoadmapFixture();
    SesiKelasLive::create([
        'program_pembelajaran_id' => $fixture['program']->id,
        'kloter_belajar_id' => $fixture['kloter']->id,
        'mentor_id' => $fixture['mentor']->id,
        'room_name' => 'roadmap-visible-room',
        'join_code' => 'ROADMAPLIVE3',
        'status' => 'scheduled',
        'stage_mode' => 'board',
        'scheduled_at' => now()->addHour(),
    ]);

    $this->actingAs($fixture['student'])
        ->get(route('user.modul.program', $fixture['program']->slug))
        ->assertInertia(fn (Assert $page) => $page
            ->component('User/Modul/DaftarModul')
            ->where('weeks.0.live_session.status', 'scheduled')
            ->where('weeks.0.live_session.join_url', null));

    $this->actingAs($fixture['outsider'])
        ->get(route('user.modul.program', $fixture['program']->slug))
        ->assertInertia(fn (Assert $page) => $page
            ->component('User/Modul/DaftarModul')
            ->where('weeks.0.live_session', null));
});

it('lets a mentor duplicate shared material into a private session deck', function () {
    $fixture = createLiveClassRoadmapFixture();
    $sharedDeck = DeckPresentasi::create([
        'level_id' => $fixture['module']->level_id,
        'module_id' => $fixture['module']->id,
        'title' => 'Materi Bersama',
        'status' => 'published',
        'audience_scope' => DeckPresentasi::AUDIENCE_SHARED,
        'week_slot' => 'opening',
        'sort_order' => 0,
    ]);
    $sharedDeck->slides()->create([
        'title' => 'Slide Bersama',
        'layout' => 'title',
        'background' => 'light',
        'order' => 0,
    ]);

    $this->actingAs($fixture['mentor'])
        ->post(route('admin.presentations.store'), [
            'title' => 'Materi Sesi Saya',
            'description' => '',
            'module_id' => $fixture['module']->id,
            'module_day_id' => null,
            'week_slot' => 'opening',
            'sort_order' => 0,
            'status' => 'published',
            'audience_scope' => DeckPresentasi::AUDIENCE_MENTOR_SESSION,
            'source_deck_id' => $sharedDeck->id,
            'return_context' => 'live_class',
            'kloter_belajar_id' => $fixture['kloter']->id,
        ])
        ->assertRedirect();

    $sessionDeck = DeckPresentasi::query()
        ->where('title', 'Materi Sesi Saya')
        ->firstOrFail();

    expect($sessionDeck->created_by)->toBe($fixture['mentor']->id)
        ->and($sessionDeck->audience_scope)->toBe(DeckPresentasi::AUDIENCE_MENTOR_SESSION)
        ->and($sessionDeck->status)->toBe('draft')
        ->and($sessionDeck->slides()->count())->toBe(1);
});

it('prevents a kloter mentor from editing shared class material', function () {
    $fixture = createLiveClassRoadmapFixture();
    $sharedDeck = DeckPresentasi::create([
        'level_id' => $fixture['module']->level_id,
        'module_id' => $fixture['module']->id,
        'created_by' => $fixture['globalAdmin']->id,
        'title' => 'Materi Resmi',
        'status' => 'published',
        'audience_scope' => DeckPresentasi::AUDIENCE_SHARED,
        'week_slot' => 'opening',
        'sort_order' => 0,
    ]);

    $this->actingAs($fixture['mentor'])
        ->put(route('admin.presentations.update', $sharedDeck), [
            'title' => 'Diubah Mentor',
            'description' => '',
            'module_id' => $fixture['module']->id,
            'module_day_id' => null,
            'week_slot' => 'opening',
            'sort_order' => 0,
            'status' => 'published',
        ])
        ->assertForbidden();

    expect($sharedDeck->fresh()->title)->toBe('Materi Resmi');
});

it('keeps mentor session decks out of the self paced presentation library', function () {
    $fixture = createLiveClassRoadmapFixture();

    foreach ([DeckPresentasi::AUDIENCE_SHARED, DeckPresentasi::AUDIENCE_MENTOR_SESSION] as $scope) {
        $deck = DeckPresentasi::create([
            'level_id' => $fixture['module']->level_id,
            'module_id' => $fixture['module']->id,
            'created_by' => $scope === DeckPresentasi::AUDIENCE_MENTOR_SESSION ? $fixture['mentor']->id : $fixture['globalAdmin']->id,
            'title' => $scope === DeckPresentasi::AUDIENCE_SHARED ? 'Materi User' : 'PPT Mentor',
            'status' => 'published',
            'audience_scope' => $scope,
            'week_slot' => 'opening',
            'sort_order' => 0,
        ]);
        $deck->slides()->create([
            'title' => 'Slide',
            'layout' => 'title',
            'background' => 'light',
            'order' => 0,
        ]);
    }

    $this->actingAs($fixture['student'])
        ->get(route('user.modul.program.presentasi', $fixture['program']->slug))
        ->assertInertia(fn (Assert $page) => $page
            ->component('User/Presentasi/PresentasiPage')
            ->has('decks', 1)
            ->where('decks.0.title', 'Materi User'));
});

it('rejects a mentor session deck owned by another mentor', function () {
    $fixture = createLiveClassRoadmapFixture();
    $otherMentor = Pengguna::factory()->create([
        'role' => 'admin',
        'admin_scope' => Pengguna::ADMIN_SCOPE_KLOTER,
        'status' => 'active',
    ]);
    $otherDeck = DeckPresentasi::create([
        'level_id' => $fixture['module']->level_id,
        'module_id' => $fixture['module']->id,
        'created_by' => $otherMentor->id,
        'title' => 'PPT Mentor Lain',
        'status' => 'draft',
        'audience_scope' => DeckPresentasi::AUDIENCE_MENTOR_SESSION,
        'week_slot' => 'opening',
        'sort_order' => 0,
    ]);

    $this->actingAs($fixture['mentor'])
        ->post(route('admin.live-classes.store'), [
            'kloter_belajar_id' => $fixture['kloter']->id,
            'presentation_deck_id' => $otherDeck->id,
            'action' => 'schedule',
            'scheduled_at' => now()->addDay()->format('Y-m-d H:i:s'),
        ])
        ->assertForbidden();
});
