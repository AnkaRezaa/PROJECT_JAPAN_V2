<?php

use App\Models\Pengguna;
use App\Notifications\EmailVerificationNotification;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Notification;

test('registration screen can be rendered', function () {
    $response = $this->get('/register');

    $response->assertStatus(200);
});

test('new users can register', function () {
    Notification::fake();

    $response = $this->post('/register', [
        'name' => 'Test User',
        'email' => 'test@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);

    $response->assertSessionHasNoErrors();
    $response->assertRedirect(route('user.dashboard', absolute: false));
    $this->assertAuthenticated();
    $response->assertSessionHas('password_hash_web', Auth::guard('web')->hashPasswordForCookie(Auth::user()->getAuthPassword()));
    Notification::assertSentTo(Pengguna::where('email', 'test@example.com')->firstOrFail(), EmailVerificationNotification::class);
});
