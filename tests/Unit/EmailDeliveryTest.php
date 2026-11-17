<?php

use App\Exceptions\EmailDeliveryUnavailable;
use App\Models\Pengguna;
use App\Notifications\Channels\MailtrapTemplateChannel;
use App\Notifications\EmailVerificationNotification;
use App\Services\EmailDeliveryService;
use App\Services\MailtrapTemplateService;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Notifications\Channels\MailChannel;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Symfony\Component\Mailer\Exception\TransportException;
use Tests\TestCase;

uses(TestCase::class);

test('email delivery succeeds without changing the sending callback', function () {
    $sent = false;
    app(EmailDeliveryService::class)->send(function () use (&$sent) {
        $sent = true;
    });

    expect($sent)->toBeTrue();
});

test('SMTP quota and connection failures become a safe delivery error', function (string $detail) {
    Log::spy();

    expect(fn () => app(EmailDeliveryService::class)->send(fn () => throw new TransportException($detail)))
        ->toThrow(EmailDeliveryUnavailable::class, EmailDeliveryUnavailable::USER_MESSAGE);

    Log::shouldHaveReceived('warning')->once()->withArgs(fn ($message, $context) => ! str_contains(json_encode([$message, $context]), $detail)
        && $context['exception_class'] === TransportException::class
    );
})->with([
    'monthly quota' => '535 5.7.0 Monthly messages limit reached',
    'daily quota' => '550 Daily messages limit exceeded',
    'connection' => 'Connection failed with secret-smtp-password',
]);

test('email delivery does not hide programming errors', function () {
    expect(fn () => app(EmailDeliveryService::class)->send(fn () => throw new LogicException('Programming error')))
        ->toThrow(LogicException::class, 'Programming error');
});

test('Mailtrap rejection does not retry through SMTP', function (int $status, string $error) {
    config([
        'services.mailtrap.api_token' => 'test-token',
        'services.mailtrap.api_endpoint' => 'https://send.api.mailtrap.io/api/send',
        'services.mailtrap.sandbox_inbox_id' => null,
        'services.mailtrap.templates.verify_email' => 'test-template',
    ]);
    Http::preventStrayRequests();
    Http::fake(['send.api.mailtrap.io/*' => Http::response(['errors' => [$error]], $status)]);
    $smtp = Mockery::mock(MailChannel::class);
    $smtp->shouldNotReceive('send');
    $channel = new MailtrapTemplateChannel(app(MailtrapTemplateService::class), $smtp);
    $recipient = new Pengguna(['username' => 'Test', 'email' => 'test@example.test']);
    $recipient->id = 1;

    expect(fn () => app(EmailDeliveryService::class)->send(
        fn () => $channel->send($recipient, new EmailVerificationNotification)
    ))->toThrow(EmailDeliveryUnavailable::class);
    Http::assertSentCount(1);
})->with([
    'rate limit' => [429, 'Too many requests'],
    'quota as forbidden' => [403, 'Monthly messages limit reached'],
    'quota as unprocessable' => [422, 'Monthly quota exceeded'],
    'provider outage' => [503, 'Unavailable'],
]);

test('Mailtrap template validation errors still allow SMTP fallback', function () {
    config([
        'services.mailtrap.api_token' => 'test-token',
        'services.mailtrap.api_endpoint' => 'https://send.api.mailtrap.io/api/send',
        'services.mailtrap.sandbox_inbox_id' => null,
        'services.mailtrap.templates.verify_email' => 'test-template',
    ]);
    Http::preventStrayRequests();
    Http::fake(['send.api.mailtrap.io/*' => Http::response(['errors' => ['Invalid template']], 422)]);
    $smtp = Mockery::mock(MailChannel::class);
    $smtp->shouldReceive('send')->once();
    $channel = new MailtrapTemplateChannel(app(MailtrapTemplateService::class), $smtp);
    $recipient = new Pengguna(['username' => 'Test', 'email' => 'test@example.test']);
    $recipient->id = 1;

    app(EmailDeliveryService::class)->send(fn () => $channel->send($recipient, new EmailVerificationNotification));
    Http::assertSentCount(1);
});

test('Mailtrap network timeout becomes a safe error without SMTP fallback', function () {
    $smtp = Mockery::mock(MailChannel::class);
    $smtp->shouldNotReceive('send');
    $api = Mockery::mock(MailtrapTemplateService::class);
    $api->shouldReceive('send')->once()->andThrow(new ConnectionException('Timeout'));
    $channel = new MailtrapTemplateChannel($api, $smtp);
    $recipient = new Pengguna(['username' => 'Test', 'email' => 'test@example.test']);
    $recipient->id = 1;

    expect(fn () => app(EmailDeliveryService::class)->send(
        fn () => $channel->send($recipient, new EmailVerificationNotification)
    ))->toThrow(EmailDeliveryUnavailable::class);
});
