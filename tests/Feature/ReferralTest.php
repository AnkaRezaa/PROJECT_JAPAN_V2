<?php

use App\Http\Controllers\Auth\LoginSosialController;
use App\Models\Pengguna;
use App\Services\ReferralService;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;
use Laravel\Socialite\Contracts\Provider;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\User as GoogleUser;

beforeEach(function () {
    config(['referrals.enabled' => true]);
    Notification::fake();
});

function referralOwner(): Pengguna
{
    $user = Pengguna::factory()->create(['role' => 'user', 'status' => 'active']);
    app(ReferralService::class)->issue($user);

    return $user->fresh();
}

function referralGoogle(): void
{
    $provider = Mockery::mock(Provider::class);
    $provider->shouldReceive('user')->once()->andReturn(GoogleUser::fake([
        'id' => 'referral-google', 'name' => 'New Google', 'email' => 'referral-google@example.com', 'email_verified' => true,
    ]));
    Socialite::shouldReceive('driver')->with('google')->once()->andReturn($provider);
}

test('referral code is stable unique hidden and counts contain no recipient identity', function () {
    $owner = referralOwner();
    expect(app(ReferralService::class)->issue($owner))->toBe($owner->referral_code)
        ->and($owner->referral_code)->toMatch('/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/')
        ->and(referralOwner()->referral_code)->not->toBe($owner->referral_code)
        ->and($owner->toArray())->not->toHaveKeys(['referral_code', 'referred_by_user_id']);
    $child = Pengguna::factory()->unverified()->create();
    $child->forceFill(['referred_by_user_id' => $owner->id])->save();
    $this->actingAs($owner)->get(route('user.referrals.index'))->assertInertia(fn (Assert $page) => $page
        ->component('User/Referral/Index')->where('summary.registered', 1)->where('summary.verified', 0)->missing('recipients'));
    $child->markEmailAsVerified();
    expect(app(ReferralService::class)->summary($owner))->toBe(['registered' => 1, 'verified' => 1]);
});

test('referral issuance endpoint is idempotent and GET does not issue a code', function () {
    $user = Pengguna::factory()->create();
    $this->actingAs($user)->get(route('user.referrals.index'))->assertOk();
    expect($user->fresh()->referral_code)->toBeNull();
    $this->post(route('user.referrals.code'))->assertRedirect(route('user.referrals.index'));
    $code = $user->fresh()->referral_code;
    $this->post(route('user.referrals.code'))->assertRedirect();
    expect($user->fresh()->referral_code)->toBe($code);
});

test('database rejects duplicate referral codes and deletion detaches recipients', function () {
    $owner = referralOwner();
    $child = Pengguna::factory()->create();
    $child->forceFill(['referred_by_user_id' => $owner->id])->save();
    expect(fn () => DB::transaction(fn () => $child->forceFill(['referral_code' => $owner->referral_code])->save()))
        ->toThrow(UniqueConstraintViolationException::class);
    $owner->delete();
    expect($child->fresh()->referred_by_user_id)->toBeNull();
});

test('referrals disabled blocks issuance and attribution but preserves normal registration', function () {
    $owner = referralOwner();
    config(['referrals.enabled' => false]);
    $this->actingAs($owner)->get(route('user.referrals.index'))->assertForbidden();
    $this->post(route('user.referrals.code'))->assertForbidden();
    auth()->logout();
    $payload = ['name' => 'New Student', 'email' => 'new-referral@example.com', 'password' => 'password', 'password_confirmation' => 'password'];
    $this->post('/register', [...$payload, 'referral_code' => $owner->referral_code])->assertSessionHasErrors('referral_code');
    $this->assertDatabaseMissing('users', ['email' => $payload['email']]);
    $this->post('/register', $payload)->assertSessionHasNoErrors()->assertRedirect();
});

test('only verified active students may issue codes', function (array $attributes, int $status) {
    $user = Pengguna::factory()->create($attributes);
    $this->actingAs($user)->post(route('user.referrals.code'))->assertStatus($status);
})->with([
    [['role' => 'admin'], 403],
    [['email_verified_at' => null], 302],
    [['status' => 'suspended'], 302],
]);

test('email registration attributes exactly once and ignores a forged referrer ID', function () {
    $owner = referralOwner();
    $this->get('/register?ref='.$owner->referral_code)->assertInertia(fn (Assert $page) => $page
        ->where('referralCode', $owner->referral_code)->where('referralsEnabled', true));
    $this->post('/register', [
        'name' => 'Invited', 'email' => 'invited@example.com', 'password' => 'password', 'password_confirmation' => 'password',
        'referral_code' => strtolower($owner->referral_code), 'referred_by_user_id' => 999999,
    ])->assertSessionHasNoErrors();
    $child = Pengguna::where('email', 'invited@example.com')->firstOrFail();
    expect($child->referred_by_user_id)->toBe($owner->id)->and($child->email_verified_at)->toBeNull();
});

test('invalid and suspended owner codes never create accounts', function () {
    $owner = referralOwner();
    $owner->update(['status' => 'suspended']);
    foreach (['INVALID1', $owner->referral_code] as $code) {
        $this->post('/register', [
            'name' => 'Invalid', 'email' => 'invalid@example.com', 'password' => 'password', 'password_confirmation' => 'password', 'referral_code' => $code,
        ])->assertSessionHasErrors('referral_code');
        $this->assertDatabaseMissing('users', ['email' => 'invalid@example.com']);
    }
});

test('google redirect stores validated referral separately from OAuth security intent', function () {
    $owner = referralOwner();
    $provider = Mockery::mock(Provider::class);
    $provider->shouldReceive('with')->once()->with(['prompt' => 'select_account'])->andReturnSelf();
    $provider->shouldReceive('redirect')->once()->andReturn(redirect()->away('https://accounts.google.test/oauth'));
    Socialite::shouldReceive('driver')->with('google')->once()->andReturn($provider);
    $this->get(route('auth.google.redirect', ['referral_code' => $owner->referral_code]))
        ->assertRedirect('https://accounts.google.test/oauth')
        ->assertSessionHas('referrals.google.code', $owner->referral_code)
        ->assertSessionHas(LoginSosialController::OAUTH_INTENT, 'login');
});

test('new google account receives referrer and consumed context is cleared', function () {
    $owner = referralOwner();
    referralGoogle();
    $this->withSession([
        LoginSosialController::OAUTH_INTENT => 'login',
        'referrals.google' => ['code' => $owner->referral_code, 'expires_at' => now()->addHour()->timestamp],
    ])->get(route('auth.google.callback'))->assertRedirect(route('user.dashboard'))->assertSessionMissing('referrals.google');
    expect(Pengguna::where('email', 'referral-google@example.com')->firstOrFail()->referred_by_user_id)->toBe($owner->id);
});

test('failed OAuth clears pending referral without creating an account', function () {
    $provider = Mockery::mock(Provider::class);
    $provider->shouldReceive('user')->once()->andThrow(new RuntimeException('Provider unavailable'));
    Socialite::shouldReceive('driver')->with('google')->once()->andReturn($provider);
    $this->withSession([
        LoginSosialController::OAUTH_INTENT => 'login',
        'referrals.google' => ['code' => 'ABCDEFGH', 'expires_at' => now()->addHour()->timestamp],
    ])->get(route('auth.google.callback'))->assertRedirect(route('login'))->assertSessionMissing('referrals.google');
    $this->assertGuest();
});

test('superadmin detail includes referral counts and referrer while students cannot access it', function () {
    $owner = referralOwner();
    $student = Pengguna::factory()->create();
    $student->forceFill(['referred_by_user_id' => $owner->id])->save();
    $admin = Pengguna::factory()->create(['role' => 'superadmin']);
    $this->actingAs($admin)->get(route('superadmin.users.show', $student))->assertInertia(fn (Assert $page) => $page
        ->where('student.referral.referrer', $owner->username)->where('student.referral.registered', 0));
    $this->actingAs($student)->get(route('superadmin.users.show', $owner))->assertForbidden();
});

test('existing google login never acquires or replaces referrer', function () {
    $owner = referralOwner();
    $user = Pengguna::factory()->create(['email' => 'referral-google@example.com']);
    referralGoogle();
    $this->withSession([
        LoginSosialController::OAUTH_INTENT => 'login',
        'referrals.google' => ['code' => $owner->referral_code, 'expires_at' => now()->subDay()->timestamp],
    ])->get(route('auth.google.callback'))->assertRedirect(route('user.dashboard'));
    expect($user->fresh()->referred_by_user_id)->toBeNull();
});

test('expired or revoked referral rolls back new google account', function (bool $expired) {
    $owner = referralOwner();
    if (! $expired) {
        $owner->update(['status' => 'suspended']);
    }
    referralGoogle();
    $this->withSession([
        LoginSosialController::OAUTH_INTENT => 'login',
        'referrals.google' => ['code' => $owner->referral_code, 'expires_at' => now()->addSeconds($expired ? -1 : 100)->timestamp],
    ])->get(route('auth.google.callback'))->assertRedirect(route('register', ['ref' => $owner->referral_code]))
        ->assertSessionHasErrors('referral_code')->assertSessionMissing('referrals.google');
    $this->assertDatabaseMissing('users', ['email' => 'referral-google@example.com']);
})->with([true, false]);
