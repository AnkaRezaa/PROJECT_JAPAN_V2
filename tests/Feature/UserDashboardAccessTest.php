<?php

use App\Models\Langganan;
use App\Models\LevelPembelajaran;
use App\Models\PaketPembayaran;
use App\Models\Pengguna;
use App\Models\ProgramPembelajaran;
use Inertia\Testing\AssertableInertia as Assert;

it('does not show a self-paced class as waiting for a cohort schedule', function () {
    $level = LevelPembelajaran::create([
        'level_name' => 'N3 DA',
        'stage' => 93,
        'is_premium' => true,
    ]);
    $program = ProgramPembelajaran::create([
        'level_id' => $level->id,
        'title' => 'Kelas Mandiri Dashboard',
        'slug' => 'kelas-mandiri-dashboard',
        'status' => 'published',
        'sort_order' => 1,
    ]);
    $plan = PaketPembayaran::create([
        'name' => 'Paket Mandiri Dashboard',
        'slug' => 'paket-mandiri-dashboard',
        'scope_type' => 'program',
        'program_pembelajaran_id' => $program->id,
        'price' => 79000,
        'duration_days' => 30,
        'is_active' => true,
    ]);
    $user = Pengguna::factory()->create(['role' => 'user', 'status' => 'active']);

    Langganan::create([
        'user_id' => $user->id,
        'payment_plan_id' => $plan->id,
        'scope_type' => 'program',
        'program_pembelajaran_id' => $program->id,
        'status' => 'active',
        'start_date' => today(),
        'end_date' => today()->addDays(30),
    ]);

    $this->actingAs($user)
        ->get(route('user.dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('User/Beranda/Beranda')
            ->where('learningDashboard.programs.0.id', $program->id)
            ->where('learningDashboard.programs.0.waiting_for_kloter', false));
});

it('displays published programs as trial on user kelas page for unsubscribed user', function () {
    $level = LevelPembelajaran::create([
        'level_name' => 'N4 Test',
        'stage' => 94,
        'is_premium' => true,
    ]);
    $program = ProgramPembelajaran::create([
        'level_id' => $level->id,
        'title' => 'Kelas Trial Test',
        'slug' => 'kelas-trial-test',
        'status' => 'published',
        'sort_order' => 1,
    ]);
    $user = Pengguna::factory()->create(['role' => 'user', 'status' => 'active']);

    $this->actingAs($user)
        ->get(route('user.kelas.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('User/Kelas/KelasPage')
            ->has('programs')
            ->where('programs', fn ($items) => collect($items)->contains(fn ($item) => $item['id'] === $program->id && $item['has_class_access'] === false)));
});
