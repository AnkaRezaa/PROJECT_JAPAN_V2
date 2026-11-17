<?php

use App\Exceptions\EmailDeliveryUnavailable;
use App\Models\Pengguna;
use Illuminate\Notifications\Channels\MailChannel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\RateLimiter;
use Symfony\Component\Mailer\Exception\TransportException;

beforeEach(function () {
    config([
        'services.mailtrap.templates_enabled' => true,
        'services.mailtrap.api_token' => 'test-token',
        'services.mailtrap.api_endpoint' => 'https://send.api.mailtrap.io/api/send',
        'services.mailtrap.sandbox_inbox_id' => null,
        'services.mailtrap.templates.verify_email' => 'verification-template',
        'services.mailtrap.templates.password_reset_otp' => 'otp-template',
    ]);
    Http::preventStrayRequests();
    Http::fake(['send.api.mailtrap.io/*' => Http::sequence()
        ->push(['errors' => ['Monthly messages limit reached']], 429)
        ->push(['success' => true])]);
});

test('registration keeps one unverified account and shows email failure instead of a server error', function () {
    $this->post('/register', [
        'name' => 'Email Failure',
        'email' => 'email-failure@example.test',
        'password' => 'password-123',
        'password_confirmation' => 'password-123',
    ])->assertRedirect(route('verification.notice'))
        ->assertSessionHasErrors(['verification' => 'Akun Anda sudah tersimpan. '.EmailDeliveryUnavailable::USER_MESSAGE]);

    $user = Pengguna::where('email', 'email-failure@example.test')->firstOrFail();
    expect($user->hasVerifiedEmail())->toBeFalse();
    $this->assertAuthenticatedAs($user);
    $this->assertDatabaseCount('users', 1);
    Http::assertSentCount(1);
});

test('verification failure has no sent status or success cooldown and can recover', function () {
    $user = Pengguna::factory()->unverified()->create();
    $this->actingAs($user)->from('/verify-email')
        ->post(route('verification.send'))
        ->assertRedirect('/verify-email')
        ->assertSessionHasErrors(['verification' => EmailDeliveryUnavailable::USER_MESSAGE])
        ->assertSessionMissing('status')
        ->assertSessionMissing('verification_email_sent_at');

    expect(RateLimiter::attempts('email-verification:resend:cooldown:'.$user->id))->toBe(0);
    expect($user->fresh()->hasVerifiedEmail())->toBeFalse();

    $this->get('/verify-email')->assertOk();
    $this->post(route('verification.send'))
        ->assertSessionHas('status', 'verification-link-sent');
});

test('OTP failure removes the unusable token and keeps the same neutral response as an unknown account', function () {
    $user = Pengguna::factory()->create(['password_login_enabled' => true]);
    $response = $this->post(route('password.email'), ['email' => $user->email]);
    $response->assertRedirect(route('password.reset', ['email' => $user->email]))
        ->assertSessionHasNoErrors();
    $status = session('status');
    expect($status)->toContain('hubungi admin')->not->toContain('telah dikirim');

    expect(DB::table('password_reset_tokens')->where('email', $user->email)->exists())->toBeFalse();

    $this->post(route('password.email'), ['email' => 'unknown@example.test'])
        ->assertRedirect(route('password.reset', ['email' => 'unknown@example.test']))
        ->assertSessionHas('status', $status)
        ->assertSessionHasNoErrors();
    Http::assertSentCount(1);

    $this->get('/forgot-password')->assertOk();
    $this->post(route('password.email'), ['email' => $user->email])
        ->assertRedirect(route('password.reset', ['email' => $user->email]))
        ->assertSessionHas('status');
    expect(DB::table('password_reset_tokens')->where('email', $user->email)->exists())->toBeTrue();
});

test('SMTP monthly quota failure is shown through existing verification validation errors', function () {
    config(['services.mailtrap.templates_enabled' => false]);
    $smtp = Mockery::mock(MailChannel::class);
    $smtp->shouldReceive('send')->once()->andThrow(new TransportException('535 5.7.0 Monthly messages limit reached'));
    Notification::extend('mail', fn () => $smtp);
    $user = Pengguna::factory()->unverified()->create();

    $this->actingAs($user)->post(route('verification.send'))
        ->assertSessionHasErrors(['verification' => EmailDeliveryUnavailable::USER_MESSAGE]);
    Http::assertNothingSent();
});
