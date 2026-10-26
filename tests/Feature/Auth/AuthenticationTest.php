<?php

use App\Models\Pengguna as User;
use Illuminate\Support\Facades\Auth;

test('login screen can be rendered', function () {
    $response = $this->get('/login');

    $response->assertStatus(200);
});

test('login validation messages use Indonesian locale', function () {
    $response = $this->from('/login')->post('/login', []);

    $response
        ->assertRedirect('/login')
        ->assertSessionHasErrors([
            'email' => 'Email wajib diisi.',
            'password' => 'Kata sandi wajib diisi.',
        ]);
});

test('users can authenticate using the login screen', function () {
    $user = User::factory()->create();

    $response = $this->post('/login', [
        'email' => $user->email,
        'password' => 'password',
    ]);

    $this->assertAuthenticated();
    $response->assertRedirect(route('user.dashboard', absolute: false));
});

test('users can not authenticate with invalid password', function () {
    $user = User::factory()->create();

    $this->post('/login', [
        'email' => $user->email,
        'password' => 'wrong-password',
    ]);

    $this->assertGuest();
});

test('users can logout', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post('/logout');

    $this->assertGuest();
    $response->assertRedirect('/');
});

test('login binds the session password hash before following the redirect', function () {
    $user = User::factory()->create();

    $this->post('/login', ['email' => $user->email, 'password' => 'password'])
        ->assertRedirect(route('user.dashboard', absolute: false))
        ->assertSessionHas('password_hash_web', Auth::guard('web')->hashPasswordForCookie($user->password));
});

test('login normalizes email before checking credentials and rate limits', function () {
    $user = User::factory()->create(['email' => 'learner@example.test']);

    $this->post('/login', ['email' => '  LEARNER@EXAMPLE.TEST  ', 'password' => 'password'])
        ->assertSessionHasNoErrors();

    $this->assertAuthenticatedAs($user);
});

test('login blocks the sixth failed email and IP attempt and recovers after the cooldown', function () {
    $user = User::factory()->create();

    for ($attempt = 0; $attempt < 5; $attempt++) {
        $this->postJson('/login', ['email' => $user->email, 'password' => 'incorrect'])
            ->assertUnprocessable()->assertJsonValidationErrors('email');
    }

    $this->postJson('/login', ['email' => $user->email, 'password' => 'password'])
        ->assertUnprocessable()->assertJsonValidationErrors('email');
    $this->assertGuest();

    $this->travel(61)->seconds();

    $this->post('/login', ['email' => $user->email, 'password' => 'password'])
        ->assertSessionHasNoErrors();
    $this->assertAuthenticatedAs($user);
});

test('login limits failed account attempts across IP addresses and email casing', function () {
    $user = User::factory()->create(['email' => 'account-limit@example.test']);

    for ($attempt = 0; $attempt < 20; $attempt++) {
        $this->withServerVariables(['REMOTE_ADDR' => '198.51.100.'.($attempt + 1)])
            ->postJson('/login', ['email' => strtoupper($user->email), 'password' => 'incorrect'])
            ->assertUnprocessable();
    }

    $this->withServerVariables(['REMOTE_ADDR' => '198.51.100.100'])
        ->postJson('/login', ['email' => $user->email, 'password' => 'password'])
        ->assertUnprocessable()->assertJsonValidationErrors('email');
    $this->assertGuest();

    $this->travel(901)->seconds();

    $this->post('/login', ['email' => $user->email, 'password' => 'password'])
        ->assertSessionHasNoErrors();
    $this->assertAuthenticatedAs($user);
});

test('login limits every IP request including invalid form submissions', function () {
    for ($attempt = 0; $attempt < 60; $attempt++) {
        $this->postJson('/login', [])->assertUnprocessable();
    }

    $this->postJson('/login', [])->assertTooManyRequests()->assertHeader('Retry-After');

    $this->travel(61)->seconds();

    $this->postJson('/login', [])->assertUnprocessable();
});

test('successful login clears failure counters but does not reset the IP request quota', function () {
    config([
        'auth.login_limits.email_ip.attempts' => 2,
        'auth.login_limits.account.attempts' => 2,
        'auth.login_limits.ip.attempts' => 4,
    ]);
    $user = User::factory()->create();

    for ($cycle = 0; $cycle < 2; $cycle++) {
        $this->postJson('/login', ['email' => $user->email, 'password' => 'incorrect'])->assertUnprocessable();
        $this->post('/login', ['email' => $user->email, 'password' => 'password'])->assertSessionHasNoErrors();
        $this->assertAuthenticatedAs($user);
        $this->post('/logout')->assertRedirect('/');
    }

    $this->postJson('/login', [])->assertTooManyRequests();
});
