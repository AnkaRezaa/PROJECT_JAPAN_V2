<?php

use App\Models\Pengguna;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

it('ignores /notifications JSON endpoint in url.intended after login', function () {
    $user = Pengguna::factory()->create([
        'role' => 'user',
        'password' => Hash::make('password123'),
    ]);

    $response = $this->withSession(['url.intended' => 'https://tokuup.com/notifications'])
        ->post(route('login'), [
            'email' => $user->email,
            'password' => 'password123',
        ]);

    $response->assertRedirect(route('user.dashboard', absolute: false));
});

it('redirects Inertia requests on /notifications to notifications.page instead of returning plain JSON', function () {
    $user = Pengguna::factory()->create(['role' => 'user']);
    $version = app(\App\Http\Middleware\HandleInertiaRequests::class)->version(request());

    $inertiaRes = $this->actingAs($user)
        ->get(route('notifications.index'), array_filter([
            'X-Inertia' => 'true',
            'X-Inertia-Version' => $version,
        ]));

    $inertiaRes->assertRedirect(route('notifications.page'));

    $jsonRes = $this->actingAs($user)
        ->getJson(route('notifications.index'));

    $jsonRes->assertOk()->assertJsonStructure(['notifications', 'unread_count']);
});
