<?php

use App\Exceptions\EmailDeliveryUnavailable;
use App\Models\Pengguna;
use App\Notifications\EmailVerificationNotification;
use App\Services\EmailDeliveryService;
use Illuminate\Auth\Events\Verified;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\URL;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->withoutVite();
    Notification::fake();
    DB::table('app_settings')->where('key', 'beta_access')->update(['value' => json_encode([
        'enabled' => true, 'registration_open' => true, 'opens_at' => null, 'opened_at' => null,
    ])]);
});

function betaSignupPayload(): array
{
    return ['name' => 'Beta User', 'email' => 'preregister@example.test', 'password' => 'password-123',
        'password_confirmation' => 'password-123', 'terms_accepted' => true];
}

test('temporary beta form is public noindex and separate from ordinary registration', function () {
    $this->get('/daftar-beta')->assertOk()->assertHeader('X-Robots-Tag', 'noindex, nofollow')
        ->assertInertia(fn (Assert $page) => $page->component('Public/Beta/Register')->where('beta.limit', 50));
    $this->get('/register')->assertInertia(fn (Assert $page) => $page->component('Auth/Register'));
});

test('beta signup saves a real account without authenticating or opening the application', function () {
    $this->post('/daftar-beta', betaSignupPayload())
        ->assertRedirect(route('public.beta.confirmation'))->assertSessionHasNoErrors()
        ->assertSessionHas('status', 'verification-link-sent');
    $user = Pengguna::where('email', 'preregister@example.test')->firstOrFail();
    $this->assertGuest();
    expect($user->beta_registered_at)->not->toBeNull()
        ->and($user->hasVerifiedEmail())->toBeFalse()
        ->and(Hash::check('password-123', $user->password))->toBeTrue();
    Notification::assertSentTo($user, EmailVerificationNotification::class);
    $this->get('/daftar-beta/selesai')->assertInertia(fn (Assert $page) => $page
        ->component('Public/Beta/Confirmation')->where('registration.email', $user->email)
        ->where('registration.verified', false)->where('released', false));
    $this->get('/user/dashboard')->assertRedirect(route('login'));
});

test('beta signup requires terms and matching passwords before creating an account', function () {
    $this->post('/daftar-beta', [...betaSignupPayload(), 'terms_accepted' => false, 'password_confirmation' => 'different'])
        ->assertSessionHasErrors(['terms_accepted', 'password']);
    $this->assertDatabaseCount('users', 0);
    Notification::assertNothingSent();
});

test('temporary beta endpoint cannot become ordinary registration after it is disabled or released', function (array $settings) {
    DB::table('app_settings')->where('key', 'beta_access')->update(['value' => json_encode($settings)]);
    $this->get('/daftar-beta')->assertRedirect(route('home'));
    $this->post('/daftar-beta', betaSignupPayload())->assertSessionHasErrors('beta');
    $this->assertDatabaseCount('users', 0);
    $this->assertGuest();
})->with([
    'disabled' => [['enabled' => false, 'registration_open' => true, 'opens_at' => null, 'opened_at' => null]],
    'opened manually' => [['enabled' => true, 'registration_open' => true, 'opens_at' => null, 'opened_at' => '2026-01-01T00:00:00Z']],
    'scheduled opening passed' => [['enabled' => true, 'registration_open' => true, 'opens_at' => '2026-01-01T00:00:00Z', 'opened_at' => null]],
]);

test('closing beta registration or filling the quota rejects direct posts without deleting accounts', function (bool $full) {
    if ($full) {
        Pengguna::factory()->count(50)->create(['beta_registered_at' => now()]);
    } else {
        DB::table('app_settings')->where('key', 'beta_access')->update(['value' => json_encode([
            'enabled' => true, 'registration_open' => false, 'opens_at' => null, 'opened_at' => null,
        ])]);
    }
    $this->get('/daftar-beta')->assertOk();
    $this->post('/daftar-beta', betaSignupPayload())->assertSessionHasErrors('beta');
    $this->assertDatabaseMissing('users', ['email' => 'preregister@example.test']);
    $this->assertDatabaseCount('users', $full ? 50 : 0);
})->with([true, false]);

test('signed beta verification works in a fresh browser without login and is idempotent', function () {
    $user = Pengguna::factory()->unverified()->create(['beta_registered_at' => now()]);
    $url = (new EmailVerificationNotification)->toMail($user)->actionUrl;
    expect($url)->toContain('/daftar-beta/verifikasi/');
    Event::fake([Verified::class]);

    $this->get($url)->assertRedirect(route('public.beta.confirmation'));
    $this->assertGuest();
    expect($user->fresh()->hasVerifiedEmail())->toBeTrue();
    $this->get($url)->assertRedirect(route('public.beta.confirmation'));
    Event::assertDispatchedTimes(Verified::class, 1);
    $this->get('/daftar-beta/selesai')->assertInertia(fn (Assert $page) => $page
        ->component('Public/Beta/Confirmation')->where('registration.verified', true)->where('released', false));
    $this->assertDatabaseCount('exam_attempts', 0);
});

test('invalid expired and mismatched beta verification links cannot verify an account', function () {
    $user = Pengguna::factory()->unverified()->create(['beta_registered_at' => now()]);
    $url = (new EmailVerificationNotification)->toMail($user)->actionUrl;
    $this->get($url.'tampered')->assertForbidden();
    $wrongHash = URL::temporarySignedRoute('public.beta.verify', now()->addMinutes(60), ['id' => $user->id, 'hash' => sha1('wrong')]);
    $this->get($wrongHash)->assertForbidden();
    $this->travel(61)->minutes();
    $this->get($url)->assertForbidden();
    expect($user->fresh()->hasVerifiedEmail())->toBeFalse();
    $this->assertGuest();
});

test('ordinary accounts cannot be verified using the public beta verification route', function () {
    $user = Pengguna::factory()->unverified()->create();
    $url = URL::temporarySignedRoute('public.beta.verify', now()->addMinutes(60), ['id' => $user->id, 'hash' => sha1($user->email)]);
    $this->get($url)->assertNotFound();
    expect($user->fresh()->hasVerifiedEmail())->toBeFalse();
    expect((new EmailVerificationNotification)->toMail($user)->actionUrl)->toContain('/verify-email/');
});

test('confirmation and resend cannot select another account from client input', function () {
    $first = Pengguna::factory()->unverified()->create(['beta_registered_at' => now()]);
    $other = Pengguna::factory()->unverified()->create(['beta_registered_at' => now()]);
    $this->post('/daftar-beta/kirim-ulang', ['id' => $other->id, 'email' => $other->email])->assertForbidden();
    $this->get('/daftar-beta/selesai')->assertRedirect(route('public.beta.register'));

    $this->withSession(['beta_registration_user_id' => $first->id])
        ->post('/daftar-beta/kirim-ulang', ['id' => $other->id, 'email' => $other->email])
        ->assertRedirect(route('public.beta.confirmation'));
    Notification::assertSentTo($first, EmailVerificationNotification::class);
    Notification::assertNotSentTo($other, EmailVerificationNotification::class);
    $this->assertGuest();
});

test('beta resend shares verification cooldown and only permits five sends per window', function () {
    $this->post('/daftar-beta', betaSignupPayload())->assertSessionHasNoErrors();
    $user = Pengguna::where('email', 'preregister@example.test')->firstOrFail();
    $this->post('/daftar-beta/kirim-ulang')->assertSessionHasErrors('verification');
    foreach (range(1, 4) as $attempt) {
        $this->travel(181)->seconds();
        $this->post('/daftar-beta/kirim-ulang')->assertRedirect(route('public.beta.confirmation'));
    }
    $this->travel(181)->seconds();
    $this->post('/daftar-beta/kirim-ulang')->assertSessionHasErrors('verification');
    Notification::assertSentToTimes($user, EmailVerificationNotification::class, 5);
});

test('email outage keeps the beta account and guest session and supports safe resend recovery', function () {
    $sender = Mockery::mock(EmailDeliveryService::class);
    $sender->shouldReceive('send')->once()->andThrow(new EmailDeliveryUnavailable);
    app()->instance(EmailDeliveryService::class, $sender);
    $this->post('/daftar-beta', betaSignupPayload())
        ->assertRedirect(route('public.beta.confirmation'))
        ->assertSessionHasErrors(['verification' => EmailDeliveryUnavailable::USER_MESSAGE])
        ->assertSessionMissing('status');
    $this->assertGuest();
    $this->assertDatabaseCount('users', 1);
    $user = Pengguna::where('email', 'preregister@example.test')->firstOrFail();
    expect($user->hasVerifiedEmail())->toBeFalse();
    $this->get('/daftar-beta/selesai')->assertOk();
    app()->forgetInstance(EmailDeliveryService::class);
    $this->post('/daftar-beta/kirim-ulang')->assertSessionHas('status', 'verification-link-sent');
    Notification::assertSentTo($user, EmailVerificationNotification::class);
});

test('closing temporary registration does not break verification or delete an existing beta account', function () {
    $this->post('/daftar-beta', betaSignupPayload());
    $user = Pengguna::where('email', 'preregister@example.test')->firstOrFail();
    $url = (new EmailVerificationNotification)->toMail($user)->actionUrl;
    DB::table('app_settings')->where('key', 'beta_access')->update(['value' => json_encode([
        'enabled' => false, 'registration_open' => false, 'opens_at' => null, 'opened_at' => now()->toIso8601String(),
    ])]);
    $this->get('/daftar-beta')->assertRedirect(route('home'));
    $this->get($url)->assertRedirect(route('public.beta.confirmation'));
    $this->get('/daftar-beta/selesai')->assertInertia(fn (Assert $page) => $page->where('released', true)->where('registration.verified', true));
    $this->assertGuest();
    $this->assertDatabaseHas('users', ['id' => $user->id]);
});
