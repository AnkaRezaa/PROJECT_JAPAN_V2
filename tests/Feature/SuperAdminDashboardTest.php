<?php

use App\Models\Pengguna;
use Illuminate\Support\Facades\Cache;
use Inertia\Testing\AssertableInertia as Assert;

it('returns an operational dashboard payload for superadmin', function () {
    Cache::flush();
    $superadmin = Pengguna::factory()->create([
        'role' => 'superadmin',
        'status' => 'active',
    ]);

    $this->actingAs($superadmin)
        ->get(route('superadmin.dashboard', ['period' => 30]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('SuperAdmin/Beranda/Beranda')
            ->has('metrics', 4)
            ->has('attentionQueue', 6)
            ->has('cohortPulse')
            ->has('quickActions', 6)
            ->has('learningBars', 30)
            ->has('studentAccessDistribution', 3));
});
