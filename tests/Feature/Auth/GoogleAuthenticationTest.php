<?php

use App\Http\Controllers\Auth\LoginSosialController;
use App\Models\Pengguna;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;
use Laravel\Socialite\Contracts\Provider;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\User as SocialiteUser;

function mockGoogleUser(array $attributes = []): void
{
    $googleUser = SocialiteUser::fake(array_merge([
        'id' => 'google-user-123',
        'name' => 'Google User',
        'email' => 'google@example.com',
        'email_verified' => true,
    ], $attributes));

    $provider = Mockery::mock(Provider::class);
    $provider->shouldReceive('user')->once()->andReturn($googleUser);

    Socialite::shouldReceive('driver')
        ->once()
        ->with('google')
        ->andReturn($provider);
}

test('Google login redirect stores the login intent', function () {
    $provider = Mockery::mock(Provider::class);
    $provider->shouldReceive('with')
        ->once()
        ->with(['prompt' => 'select_account'])
        ->andReturnSelf();
    $provider->shouldReceive('redirect')
        ->once()
        ->andReturn(redirect()->away('https://accounts.google.test/oauth'));

    Socialite::shouldReceive('driver')
        ->once()
        ->with('google')
        ->andReturn($provider);

    $response = $this->get(route('auth.google.redirect'));

    $response
        ->assertRedirect('https://accounts.google.test/oauth')
        ->assertSessionHas(LoginSosialController::OAUTH_INTENT, LoginSosialController::OAUTH_INTENT_LOGIN)
        ->assertSessionMissing(LoginSosialController::OAUTH_INTENT_USER_ID);
});

test('Google account deletion redirect reuses the configured callback and stores its intent', function () {
    $user = Pengguna::factory()->create([
        'email' => 'google@example.com',
        'google_id' => 'google-user-123',
    ]);

    $provider = Mockery::mock(Provider::class);
    $provider->shouldReceive('with')
        ->once()
        ->with([
            'prompt' => 'select_account',
            'login_hint' => $user->email,
        ])
        ->andReturnSelf();
    $provider->shouldReceive('redirect')
        ->once()
        ->andReturn(redirect()->away('https://accounts.google.test/oauth'));

    Socialite::shouldReceive('driver')
        ->once()
        ->with('google')
        ->andReturn($provider);

    $response = $this->actingAs($user)
        ->get(route('profile.delete.google.redirect'));

    $response
        ->assertRedirect('https://accounts.google.test/oauth')
        ->assertSessionHas(LoginSosialController::OAUTH_INTENT, LoginSosialController::OAUTH_INTENT_DELETE_ACCOUNT)
        ->assertSessionHas(LoginSosialController::OAUTH_INTENT_USER_ID, $user->id);
});

test('authenticated Google callback without an OAuth intent never logs the user in again', function () {
    $user = Pengguna::factory()->create([
        'google_id' => 'google-user-123',
    ]);

    $response = $this->actingAs($user)
        ->get(route('auth.google.callback'));

    $response
        ->assertRedirect(route('profile.edit'))
        ->assertSessionHasErrors('google_confirmation');
    $this->assertAuthenticatedAs($user);
});

test('guest Google callback without an OAuth intent is rejected', function () {
    $response = $this->get(route('auth.google.callback'));

    $response
        ->assertRedirect(route('login'))
        ->assertSessionHasErrors('email');
    $this->assertGuest();
});

test('new Google user is verified and logged in without email notification', function () {
    Notification::fake();
    mockGoogleUser();

    $response = $this
        ->withSession([LoginSosialController::OAUTH_INTENT => LoginSosialController::OAUTH_INTENT_LOGIN])
        ->get(route('auth.google.callback'));

    $user = Pengguna::where('email', 'google@example.com')->firstOrFail();

    $response->assertRedirect(route('user.dashboard'));
    $this->assertAuthenticatedAs($user);
    expect($user->email_verified_at)->not->toBeNull()
        ->and($user->google_id)->toBe('google-user-123')
        ->and($user->auth_provider)->toBe('google')
        ->and($user->password_login_enabled)->toBeFalse();
    Notification::assertNothingSent();
});

test('Google recovers an unverified manual account and replaces its old credentials', function () {
    Notification::fake();
    $user = Pengguna::factory()->unverified()->create([
        'email' => 'google@example.com',
        'password_login_enabled' => true,
        'auth_provider' => 'email',
        'google_id' => null,
        'xp' => 120,
        'remember_token' => 'old-remember-token',
    ]);
    $oldPasswordHash = $user->password;
    DB::table('password_reset_tokens')->insert([
        'email' => $user->email,
        'token' => Hash::make('123456'),
        'created_at' => now(),
    ]);
    mockGoogleUser();

    $response = $this
        ->withSession([LoginSosialController::OAUTH_INTENT => LoginSosialController::OAUTH_INTENT_LOGIN])
        ->get(route('auth.google.callback'));

    $user->refresh();

    $response->assertRedirect(route('user.dashboard'))
        ->assertSessionHas('success');
    $this->assertAuthenticatedAs($user);
    expect($user->email_verified_at)->not->toBeNull()
        ->and($user->google_id)->toBe('google-user-123')
        ->and($user->auth_provider)->toBe('google')
        ->and($user->password_login_enabled)->toBeFalse()
        ->and($user->password)->not->toBe($oldPasswordHash)
        ->and(Hash::check('password', $user->password))->toBeFalse()
        ->and($user->remember_token)->not->toBe('old-remember-token')
        ->and($user->xp)->toBe(120)
        ->and(Pengguna::where('email', $user->email)->count())->toBe(1)
        ->and(DB::table('password_reset_tokens')->where('email', $user->email)->exists())->toBeFalse();
    Notification::assertNothingSent();
});

test('verified manual account can link Google without replacing its password', function () {
    Notification::fake();
    $user = Pengguna::factory()->create([
        'email' => 'google@example.com',
        'password_login_enabled' => true,
        'auth_provider' => 'email',
        'google_id' => null,
    ]);
    $oldPasswordHash = $user->password;
    mockGoogleUser();

    $this->withSession([LoginSosialController::OAUTH_INTENT => LoginSosialController::OAUTH_INTENT_LOGIN])
        ->get(route('auth.google.callback'))
        ->assertRedirect(route('user.dashboard'));

    expect($user->refresh()->password)->toBe($oldPasswordHash)
        ->and($user->password_login_enabled)->toBeTrue()
        ->and($user->auth_provider)->toBe('email');
    $this->assertAuthenticatedAs($user);
});

test('Google does not mutate an inactive unverified account', function (string $status) {
    Notification::fake();
    $user = Pengguna::factory()->unverified()->create([
        'email' => 'google@example.com',
        'status' => $status,
        'google_id' => null,
        'avatar' => null,
    ]);
    $before = $user->refresh()->getAttributes();
    mockGoogleUser();

    $this->withSession([LoginSosialController::OAUTH_INTENT => LoginSosialController::OAUTH_INTENT_LOGIN])
        ->get(route('auth.google.callback'))
        ->assertRedirect(route('login'))
        ->assertSessionHasErrors('email');

    expect($user->refresh()->getAttributes())->toBe($before);
    $this->assertGuest();
})->with(['suspended', 'anonymized']);

test('Google rejects an email already bound to a different Google identity without changes', function () {
    $user = Pengguna::factory()->create([
        'email' => 'google@example.com',
        'google_id' => 'another-google-identity',
    ]);
    $before = $user->refresh()->getAttributes();
    mockGoogleUser();

    $this->withSession([LoginSosialController::OAUTH_INTENT => LoginSosialController::OAUTH_INTENT_LOGIN])
        ->get(route('auth.google.callback'))
        ->assertRedirect(route('login'))
        ->assertSessionHasErrors('email');

    expect($user->refresh()->getAttributes())->toBe($before);
    $this->assertGuest();
});

test('Google account with unverified email is rejected', function () {
    Notification::fake();
    mockGoogleUser(['email_verified' => false]);

    $response = $this
        ->withSession([LoginSosialController::OAUTH_INTENT => LoginSosialController::OAUTH_INTENT_LOGIN])
        ->from(route('login'))
        ->get(route('auth.google.callback'));

    $response->assertRedirect(route('login'))
        ->assertSessionHasErrors('email');
    $this->assertGuest();
    expect(Pengguna::where('email', 'google@example.com')->exists())->toBeFalse();
    Notification::assertNothingSent();
});

test('verified administrator email can be linked to Google and keeps its role', function () {
    Notification::fake();
    $admin = Pengguna::factory()->create([
        'email' => 'google@example.com',
        'role' => 'admin',
        'google_id' => null,
    ]);
    mockGoogleUser();

    $response = $this
        ->withSession([LoginSosialController::OAUTH_INTENT => LoginSosialController::OAUTH_INTENT_LOGIN])
        ->from(route('login'))
        ->get(route('auth.google.callback'));

    $response->assertRedirect(route('admin.dashboard'));
    $this->assertAuthenticatedAs($admin);
    expect($admin->refresh()->google_id)->toBe('google-user-123')
        ->and($admin->role)->toBe('admin');
    Notification::assertNothingSent();
});

test('suspended Google account cannot log in', function () {
    Notification::fake();
    Pengguna::factory()->create([
        'email' => 'google@example.com',
        'auth_provider' => 'google',
        'google_id' => 'google-user-123',
        'status' => 'suspended',
    ]);
    mockGoogleUser();

    $response = $this
        ->withSession([LoginSosialController::OAUTH_INTENT => LoginSosialController::OAUTH_INTENT_LOGIN])
        ->from(route('login'))
        ->get(route('auth.google.callback'));

    $response->assertRedirect(route('login'))
        ->assertSessionHasErrors('email');
    $this->assertGuest();
    Notification::assertNothingSent();
});

test('Google-only user can confirm identity and delete account without password', function () {
    Notification::fake();
    Http::fake([
        'https://oauth2.googleapis.com/revoke' => Http::response(status: 200),
    ]);
    $user = Pengguna::factory()->create([
        'email' => 'google@example.com',
        'password_login_enabled' => false,
        'auth_provider' => 'google',
        'google_id' => 'google-user-123',
    ]);
    mockGoogleUser();

    $confirmationResponse = $this->actingAs($user)
        ->withSession([
            'auth.google.intent' => 'delete_account',
            'auth.google.intent_user_id' => $user->id,
        ])
        ->get(route('auth.google.callback'));

    $confirmationResponse
        ->assertRedirect(route('profile.edit'))
        ->assertSessionMissing(LoginSosialController::OAUTH_INTENT)
        ->assertSessionMissing(LoginSosialController::OAUTH_INTENT_USER_ID)
        ->assertSessionHas('profile.account_deletion.google_confirmed_user_id', $user->id)
        ->assertSessionHas('profile.account_deletion.google_confirmed_at')
        ->assertSessionHas(LoginSosialController::ACCOUNT_DELETION_GOOGLE_TOKEN);

    $deleteResponse = $this->delete(route('profile.destroy'), [
        'confirmation_username' => $user->username,
    ]);

    $deleteResponse->assertSessionHasNoErrors()->assertRedirect('/');
    $this->assertGuest();
    expect($user->fresh())->toBeNull();
    Http::assertSent(fn ($request) => $request->url() === 'https://oauth2.googleapis.com/revoke'
        && $request['token'] === 'fake-token');
    Notification::assertNothingSent();
});

test('Google deletion confirmation rejects a different Google account', function () {
    Notification::fake();
    $user = Pengguna::factory()->create([
        'email' => 'google@example.com',
        'password_login_enabled' => false,
        'auth_provider' => 'google',
        'google_id' => 'google-user-123',
    ]);
    mockGoogleUser([
        'id' => 'different-google-user',
        'email' => 'different@example.com',
    ]);

    $response = $this->actingAs($user)
        ->withSession([
            'auth.google.intent' => 'delete_account',
            'auth.google.intent_user_id' => $user->id,
        ])
        ->get(route('auth.google.callback'));

    $response
        ->assertRedirect(route('profile.edit'))
        ->assertSessionHasErrors('google_confirmation')
        ->assertSessionMissing('profile.account_deletion.google_confirmed_at');
    $this->assertAuthenticatedAs($user);
    Notification::assertNothingSent();
});
