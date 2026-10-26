<?php

use App\Http\Controllers\PembayaranMidtransController;
use App\Models\Flashcard;
use App\Models\Langganan;
use App\Models\LevelPembelajaran;
use App\Models\LogReward;
use App\Models\Modul;
use App\Models\PaketPembayaran;
use App\Models\Pengguna;
use App\Models\ProgramPembelajaran;
use App\Models\SetFlashcard;
use App\Models\Transaksi;
use App\Services\AccountSuspensionService;
use App\Services\AksesFlashcardPenggunaService;
use App\Services\XpService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\HttpException;

function makeSecurityPaymentFixture(string $programStatus = 'published'): array
{
    config(['services.midtrans.server_key' => 'test-server-key', 'services.midtrans.is_production' => false]);
    Http::preventStrayRequests();
    Notification::fake();
    $user = Pengguna::factory()->create(['role' => 'user', 'status' => 'active']);
    $program = ProgramPembelajaran::create([
        'title' => 'Payment security program', 'slug' => 'payment-security-'.Str::uuid(), 'status' => $programStatus,
    ]);
    $plan = PaketPembayaran::create([
        'name' => 'Payment security plan', 'slug' => 'payment-security-'.Str::uuid(),
        'scope_type' => 'program', 'program_pembelajaran_id' => $program->id,
        'price' => 99000, 'duration_days' => 30, 'is_active' => true,
    ]);
    $transaction = Transaksi::create([
        'transaction_code' => 'MID-'.Str::upper(Str::random(10)), 'checkout_request_key' => (string) Str::uuid(),
        'user_id' => $user->id, 'payment_plan_id' => $plan->id,
        'scope_type' => 'program', 'program_pembelajaran_id' => $program->id,
        'amount' => $plan->price, 'payment_method' => 'midtrans', 'status' => 'pending',
    ]);

    return [$user, $program, $plan, $transaction];
}

it('rejects a previously authenticated suspended user on payment APIs and clears their session', function (string $endpoint) {
    [$user, , $plan, $transaction] = makeSecurityPaymentFixture();
    $this->post('/login', ['email' => $user->email, 'password' => 'password'])->assertRedirect();
    app(AccountSuspensionService::class)->changeStatus($user, 'suspended', 'Payment security test');
    Auth::forgetGuards();

    $parameters = $endpoint === 'checkout' ? [] : [$transaction->transaction_code];
    $this->postJson(route('payments.midtrans.'.$endpoint, $parameters), [
        'payment_plan_id' => $plan->id, 'checkout_request_key' => (string) Str::uuid(), 'payment_channel' => 'qris',
    ])->assertForbidden()->assertJsonStructure(['message']);

    $this->assertGuest();
    expect($transaction->fresh()->status)->toBe('pending')
        ->and(Transaksi::count())->toBe(1);
    Http::assertNothingSent();
})->with(['checkout', 'snap', 'charge', 'sync', 'cancel']);

it('preserves the login redirect for suspended users making page requests', function () {
    [$user] = makeSecurityPaymentFixture();
    $this->post('/login', ['email' => $user->email, 'password' => 'password'])->assertRedirect();
    app(AccountSuspensionService::class)->changeStatus($user, 'suspended', null);
    Auth::forgetGuards();

    $this->get(route('user.kelas.index'))->assertRedirect(route('login'))->assertSessionHasErrors('email');
    $this->assertGuest();
    Http::assertNothingSent();
});

it('blocks payment initiation for draft programs without contacting Midtrans', function (string $endpoint) {
    [$user, , $plan, $transaction] = makeSecurityPaymentFixture('draft');
    $parameters = $endpoint === 'checkout' ? [] : [$transaction->transaction_code];

    $this->actingAs($user)->postJson(route('payments.midtrans.'.$endpoint, $parameters), [
        'payment_plan_id' => $plan->id, 'checkout_request_key' => (string) Str::uuid(), 'payment_channel' => 'qris',
    ])->assertUnprocessable()->assertJsonPath('message', 'Kelas ini belum tersedia untuk pembayaran. Hubungi admin atau pilih kelas lain.');

    expect(Transaksi::count())->toBe(1)
        ->and($transaction->fresh()->status)->toBe('pending')
        ->and($transaction->midtrans_snap_token)->toBeNull();
    Http::assertNothingSent();
})->with(['checkout', 'snap', 'charge']);

it('does not expose draft transaction details through another users payment APIs', function (string $endpoint) {
    [, , , $transaction] = makeSecurityPaymentFixture('draft');
    $otherUser = Pengguna::factory()->create();

    $this->actingAs($otherUser)->postJson(route('payments.midtrans.'.$endpoint, $transaction->transaction_code), [
        'payment_channel' => 'qris',
    ])->assertNotFound();
    Http::assertNothingSent();
})->with(['snap', 'charge', 'sync']);

it('rejects inactive payment plans even when their program is published', function () {
    [$user, , $plan] = makeSecurityPaymentFixture();
    $plan->update(['is_active' => false]);

    $this->actingAs($user)->postJson(route('payments.midtrans.checkout'), [
        'payment_plan_id' => $plan->id, 'checkout_request_key' => (string) Str::uuid(),
    ])->assertNotFound();
    Http::assertNothingSent();
});

it('uses the database price for published program checkout regardless of client amounts', function () {
    [$user, , $plan, $transaction] = makeSecurityPaymentFixture();
    Http::fake([
        'https://app.sandbox.midtrans.com/snap/v1/transactions' => Http::response([
            'token' => 'price-test-token', 'redirect_url' => 'https://app.sandbox.midtrans.com/price-test',
        ]),
    ]);

    $this->actingAs($user)->postJson(route('payments.midtrans.checkout'), [
        'payment_plan_id' => $plan->id, 'checkout_request_key' => (string) Str::uuid(), 'amount' => 1, 'price' => 1,
    ])->assertOk();

    expect($transaction->fresh()->amount)->toBe(99000);
    Http::assertSent(fn ($request) => $request['transaction_details']['gross_amount'] === 99000);
    Http::assertSentCount(1);
});

it('preserves QR string instructions and does not charge a second time', function () {
    [$user, , , $transaction] = makeSecurityPaymentFixture();
    $transaction->update(['payment_channel' => 'qris', 'payment_payload' => ['qr_string' => 'existing-payment-qr']]);

    $this->actingAs($user)->postJson(route('payments.midtrans.charge', $transaction->transaction_code), [
        'payment_channel' => 'qris',
    ])->assertOk()->assertJsonPath('payment_payload.qr_string', 'existing-payment-qr');
    Http::assertNothingSent();
});

it('keeps historical checkout and payment sync available after a program becomes draft', function () {
    [$user, , , $transaction] = makeSecurityPaymentFixture('draft');
    Http::fake([
        'https://api.sandbox.midtrans.com/v2/*/status' => Http::response([
            'order_id' => $transaction->transaction_code, 'gross_amount' => '99000.00', 'transaction_status' => 'pending',
        ]),
    ]);

    $this->actingAs($user)->get(route('user.checkout', $transaction->transaction_code))->assertOk();
    $this->postJson(route('payments.midtrans.sync', $transaction->transaction_code))
        ->assertOk()->assertJsonPath('status', 'pending');
    Http::assertSentCount(1);
});

it('allows an owner to cancel a pending payment for a draft program', function () {
    [$user, , , $transaction] = makeSecurityPaymentFixture('draft');
    Http::fake([
        'https://api.sandbox.midtrans.com/v2/*/status' => Http::response([
            'order_id' => $transaction->transaction_code, 'gross_amount' => '99000.00', 'transaction_status' => 'pending',
        ]),
        'https://api.sandbox.midtrans.com/v2/*/cancel' => Http::response([
            'order_id' => $transaction->transaction_code, 'gross_amount' => '99000.00', 'transaction_status' => 'cancel',
        ]),
    ]);

    $this->actingAs($user)->postJson(route('payments.midtrans.cancel', $transaction->transaction_code))
        ->assertOk()->assertJsonPath('status', 'canceled');
    expect($transaction->fresh()->status)->toBe('canceled');
});

it('still records an authentic successful webhook for a suspended user and a draft program', function () {
    [$user, , , $transaction] = makeSecurityPaymentFixture('draft');
    app(AccountSuspensionService::class)->changeStatus($user, 'suspended', null);
    $payload = [
        'order_id' => $transaction->transaction_code, 'gross_amount' => '99000.00',
        'status_code' => '200', 'transaction_status' => 'settlement',
    ];
    $payload['signature_key'] = hash('sha512', $payload['order_id'].$payload['status_code'].$payload['gross_amount'].'test-server-key');

    $this->postJson(route('payments.midtrans.notification'), $payload)->assertOk();
    $this->postJson(route('payments.midtrans.notification'), $payload)->assertOk();
    expect($transaction->fresh()->status)->toBe('success')
        ->and(Langganan::where('user_id', $user->id)->count())->toBe(1);
    Http::assertNothingSent();
});

it('leaves QR generation to the browser without third party image URLs', function (string $channel, array $payload) {
    $method = new ReflectionMethod(PembayaranMidtransController::class, 'formatChargeResponse');
    $result = $method->invoke(app(PembayaranMidtransController::class), $channel, $payload, 'MID-QR-TEST');

    expect($result['qr_url'])->toBeNull();
    if (isset($payload['qr_string'])) {
        expect($result['qr_string'])->toBe($payload['qr_string']);
    }
    if (isset($payload['actions'][0]['url'])) {
        expect($result['deeplink_url'])->toBe($payload['actions'][0]['url']);
    }
})->with([
    'QRIS' => ['qris', ['qr_string' => 'payment-qr-reference']],
    'GoPay' => ['gopay', ['actions' => [['name' => 'deeplink-redirect', 'url' => 'gojek://payment/reference']]]],
]);

it('blocks direct flashcard access outside the allowed module access', function () {
    $user = Pengguna::factory()->create(['role' => 'user']);
    $level = LevelPembelajaran::create(['level_name' => 'N3', 'stage' => 1, 'is_premium' => true]);
    $module = Modul::create([
        'level_id' => $level->id,
        'title' => 'Week premium',
        'week_number' => 2,
        'description' => 'Konten premium.',
        'status' => 'published',
    ]);
    $set = SetFlashcard::create([
        'level_id' => $level->id,
        'module_id' => $module->id,
        'title' => 'Set premium',
        'status' => 'published',
    ]);
    $card = Flashcard::create([
        'flashcard_set_id' => $set->id,
        'front_text' => 'taberu',
        'back_text' => 'makan',
    ]);

    expect(fn () => app(AksesFlashcardPenggunaService::class)->abortJikaTerkunci($user, $set))
        ->toThrow(HttpException::class);
    expect(fn () => app(AksesFlashcardPenggunaService::class)->abortJikaKartuTerkunci($user, $card))
        ->toThrow(HttpException::class);
});

it('awards an identified reward only once', function () {
    $user = Pengguna::factory()->create(['role' => 'user', 'xp' => 0, 'level' => 1]);
    $xp = app(XpService::class);

    $first = $xp->awardXP($user, 10, 'flashcard', 99, 'Sesi flashcard');
    $second = $xp->awardXP($user->fresh(), 10, 'flashcard', 99, 'Sesi flashcard');

    expect($first['xp_awarded'])->toBe(10)
        ->and($second['duplicate'])->toBeTrue()
        ->and($user->fresh()->xp)->toBe(10)
        ->and(LogReward::where('user_id', $user->id)->where('source_type', 'flashcard')->where('source_id', 99)->count())->toBe(1);
});

it('maps Midtrans capture statuses without false success', function () {
    $method = new ReflectionMethod(PembayaranMidtransController::class, 'mapStatus');
    $controller = app(PembayaranMidtransController::class);

    expect($method->invoke($controller, 'capture', 'accept'))->toBe('success')
        ->and($method->invoke($controller, 'capture', 'challenge'))->toBe('pending')
        ->and($method->invoke($controller, 'capture', 'deny'))->toBe('failed')
        ->and($method->invoke($controller, 'capture', null))->toBe('pending')
        ->and($method->invoke($controller, 'settlement', null))->toBe('success')
        ->and($method->invoke($controller, 'cancel', null))->toBe('canceled')
        ->and($method->invoke($controller, 'refund', null))->toBe('refunded')
        ->and($method->invoke($controller, 'chargeback', null))->toBe('refunded');
});

it('rejects a signed Midtrans callback when its amount differs from the local transaction', function () {
    config(['services.midtrans.server_key' => 'test-server-key']);

    $user = Pengguna::factory()->create(['role' => 'user']);
    $transaction = Transaksi::create([
        'transaction_code' => 'MIDTRANS-AMOUNT-TEST',
        'user_id' => $user->id,
        'amount' => 99000,
        'payment_method' => 'midtrans',
        'status' => 'pending',
    ]);
    $payload = [
        'order_id' => $transaction->transaction_code,
        'status_code' => '200',
        'gross_amount' => '1000.00',
        'transaction_status' => 'capture',
        'fraud_status' => 'accept',
    ];
    $payload['signature_key'] = hash('sha512', $payload['order_id'].$payload['status_code'].$payload['gross_amount'].'test-server-key');

    $this->post(route('payments.midtrans.notification'), $payload)
        ->assertStatus(422);

    expect($transaction->fresh()->status)->toBe('pending');
});

it('reuses one pending Midtrans checkout for the same checkout intent', function () {
    config(['services.midtrans.server_key' => 'test-server-key']);

    $user = Pengguna::factory()->create(['role' => 'user']);
    $program = ProgramPembelajaran::create([
        'title' => 'Program checkout idempotent',
        'slug' => 'program-checkout-idempotent',
        'status' => 'published',
    ]);
    $plan = PaketPembayaran::create([
        'name' => 'Plan idempotent checkout',
        'slug' => 'plan-idempotent-checkout',
        'scope_type' => 'program',
        'program_pembelajaran_id' => $program->id,
        'price' => 99000,
        'duration_days' => 30,
        'is_active' => true,
    ]);
    $checkoutRequestKey = '510a13fc-736f-4a6f-8abc-8c5b5a89f104';

    Http::fake([
        'https://app.sandbox.midtrans.com/snap/v1/transactions' => Http::response([
            'token' => 'snap-token-idempotent',
            'redirect_url' => 'https://app.sandbox.midtrans.com/snap/v2/vtweb/snap-token-idempotent',
        ]),
        'https://api.sandbox.midtrans.com/v2/*/status' => function () use ($checkoutRequestKey) {
            $transaction = Transaksi::where('checkout_request_key', $checkoutRequestKey)->firstOrFail();

            return Http::response([
                'order_id' => $transaction->transaction_code, 'gross_amount' => '99000.00', 'transaction_status' => 'pending',
            ]);
        },
    ]);

    $first = $this->actingAs($user)->postJson(route('payments.midtrans.checkout'), [
        'payment_plan_id' => $plan->id,
        'checkout_request_key' => $checkoutRequestKey,
    ])->assertOk();
    $second = $this->actingAs($user)->postJson(route('payments.midtrans.checkout'), [
        'payment_plan_id' => $plan->id,
        'checkout_request_key' => '5ef2c99e-4d75-44a6-bc21-66ad7d15c8e3',
    ])->assertOk();

    expect($first->json('transaction_code'))->toBe($second->json('transaction_code'))
        ->and(Transaksi::where('checkout_request_key', $checkoutRequestKey)->count())->toBe(1)
        ->and(Transaksi::where('checkout_request_key', $checkoutRequestKey)->value('midtrans_snap_token'))->toBe('snap-token-idempotent');

    Http::assertSentCount(2);
    expect(Http::recorded(fn ($request) => $request->method() === 'POST')->count())->toBe(1);
});

it('expires a stale Midtrans checkout and allows a fresh order', function () {
    config([
        'services.midtrans.server_key' => 'test-server-key',
        'services.midtrans.snap_expiry_hours' => 24,
    ]);

    $user = Pengguna::factory()->create(['role' => 'user']);
    $program = ProgramPembelajaran::create([
        'title' => 'Program retry checkout',
        'slug' => 'program-retry-checkout',
        'status' => 'published',
    ]);
    $plan = PaketPembayaran::create([
        'name' => 'Plan retry checkout',
        'slug' => 'plan-retry-checkout',
        'scope_type' => 'program',
        'program_pembelajaran_id' => $program->id,
        'price' => 79000,
        'duration_days' => 30,
        'is_active' => true,
    ]);
    $expiredRequestKey = 'bd8c1e15-e3a2-4334-a48b-f1a102114fc0';
    $freshRequestKey = '3ce3f0da-7b40-41f0-a961-14427ba420df';
    $expiredTransaction = Transaksi::create([
        'transaction_code' => 'MID-EXPIRED-RETRY',
        'checkout_request_key' => $expiredRequestKey,
        'midtrans_snap_token' => 'expired-snap-token',
        'user_id' => $user->id,
        'payment_plan_id' => $plan->id,
        'scope_type' => 'program',
        'program_pembelajaran_id' => $program->id,
        'amount' => 79000,
        'payment_method' => 'midtrans',
        'status' => 'pending',
    ]);

    Http::fake([
        'https://api.sandbox.midtrans.com/v2/MID-EXPIRED-RETRY/status' => Http::response([
            'order_id' => 'MID-EXPIRED-RETRY',
            'gross_amount' => '79000.00',
            'transaction_status' => 'expire',
        ]),
        'https://app.sandbox.midtrans.com/snap/v1/transactions' => Http::response([
            'token' => 'fresh-snap-token',
            'redirect_url' => 'https://app.sandbox.midtrans.com/snap/v2/vtweb/fresh-snap-token',
        ]),
    ]);

    $this->actingAs($user)->postJson(route('payments.midtrans.checkout'), [
        'payment_plan_id' => $plan->id,
        'checkout_request_key' => $expiredRequestKey,
    ])->assertStatus(410);

    $freshResponse = $this->actingAs($user)->postJson(route('payments.midtrans.checkout'), [
        'payment_plan_id' => $plan->id,
        'checkout_request_key' => $freshRequestKey,
    ])->assertOk();

    expect($expiredTransaction->fresh()->status)->toBe('expired')
        ->and($freshResponse->json('transaction_code'))->not->toBe($expiredTransaction->transaction_code)
        ->and(Transaksi::where('checkout_request_key', $freshRequestKey)->value('midtrans_snap_token'))->toBe('fresh-snap-token');

    Http::assertSent(function ($request) {
        if (! str_ends_with($request->url(), '/snap/v1/transactions')) {
            return false;
        }

        return $request['callbacks']['finish'] === route('user.checkout', $request['transaction_details']['order_id'])
            && $request['callbacks']['error'] === route('user.checkout', $request['transaction_details']['order_id'])
            && $request['expiry'] === ['duration' => 24, 'unit' => 'hours'];
    });
});

it('cancels only the subscription linked to a refunded Midtrans transaction', function () {
    config(['services.midtrans.server_key' => 'test-server-key']);

    $user = Pengguna::factory()->create(['role' => 'user', 'subscription_status' => 'premium']);
    $plan = PaketPembayaran::create([
        'name' => 'Plan refund test',
        'slug' => 'plan-refund-test',
        'scope_type' => 'global',
        'price' => 99000,
        'duration_days' => 30,
        'is_active' => true,
    ]);
    $subscription = Langganan::create([
        'user_id' => $user->id,
        'payment_plan_id' => $plan->id,
        'scope_type' => 'global',
        'status' => 'active',
        'start_date' => now()->toDateString(),
        'end_date' => now()->addDays(30)->toDateString(),
        'auto_renew' => false,
    ]);
    $transaction = Transaksi::create([
        'transaction_code' => 'MIDTRANS-REFUND-TEST',
        'user_id' => $user->id,
        'payment_plan_id' => $plan->id,
        'subscription_id' => $subscription->id,
        'amount' => 99000,
        'payment_method' => 'midtrans',
        'status' => 'success',
    ]);
    $payload = [
        'order_id' => $transaction->transaction_code,
        'status_code' => '200',
        'gross_amount' => '99000.00',
        'transaction_status' => 'refund',
    ];
    $payload['signature_key'] = hash('sha512', $payload['order_id'].$payload['status_code'].$payload['gross_amount'].'test-server-key');

    $this->post(route('payments.midtrans.notification'), $payload)->assertOk();

    expect($transaction->fresh()->status)->toBe('refunded')
        ->and($subscription->fresh()->status)->toBe('cancelled')
        ->and($user->fresh()->subscription_status)->toBe('free');
});

it('does not downgrade a successful Midtrans transaction from a delayed pending callback', function () {
    config(['services.midtrans.server_key' => 'test-server-key']);

    $user = Pengguna::factory()->create(['role' => 'user']);
    $transaction = Transaksi::create([
        'transaction_code' => 'MIDTRANS-LATE-PENDING-TEST',
        'user_id' => $user->id,
        'amount' => 99000,
        'payment_method' => 'midtrans',
        'status' => 'success',
    ]);
    $payload = [
        'order_id' => $transaction->transaction_code,
        'status_code' => '201',
        'gross_amount' => '99000.00',
        'transaction_status' => 'pending',
    ];
    $payload['signature_key'] = hash('sha512', $payload['order_id'].$payload['status_code'].$payload['gross_amount'].'test-server-key');

    $this->post(route('payments.midtrans.notification'), $payload)->assertOk();

    expect($transaction->fresh()->status)->toBe('success');
});

it('lets the transaction owner cancel a pending Midtrans invoice', function () {
    config(['services.midtrans.server_key' => 'test-server-key']);

    $user = Pengguna::factory()->create(['role' => 'user']);
    $transaction = Transaksi::create([
        'transaction_code' => 'MIDTRANS-CANCEL-TEST',
        'user_id' => $user->id,
        'amount' => 99000,
        'payment_method' => 'midtrans',
        'status' => 'pending',
    ]);

    Http::fake([
        'https://api.sandbox.midtrans.com/v2/MIDTRANS-CANCEL-TEST/status' => Http::response([
            'order_id' => $transaction->transaction_code,
            'gross_amount' => '99000.00',
            'transaction_status' => 'pending',
        ]),
        'https://api.sandbox.midtrans.com/v2/MIDTRANS-CANCEL-TEST/cancel' => Http::response([
            'gross_amount' => '99000.00',
            'transaction_status' => 'cancel',
        ]),
    ]);

    $this->actingAs($user)
        ->postJson(route('payments.midtrans.cancel', $transaction->transaction_code))
        ->assertOk()
        ->assertJsonPath('status', 'canceled')
        ->assertJsonPath('canceled', true);

    expect($transaction->fresh()->status)->toBe('canceled')
        ->and($transaction->fresh()->subscription_id)->toBeNull();
});

it('cancels an uncharged Snap session when Midtrans has no transaction yet', function () {
    config(['services.midtrans.server_key' => 'test-server-key']);

    $user = Pengguna::factory()->create(['role' => 'user']);
    $transaction = Transaksi::create([
        'transaction_code' => 'MIDTRANS-SNAP-CANCEL-TEST',
        'midtrans_snap_token' => 'snap-token-to-cancel',
        'user_id' => $user->id,
        'amount' => 99000,
        'payment_method' => 'midtrans',
        'status' => 'pending',
    ]);

    Http::fake([
        'https://api.sandbox.midtrans.com/v2/MIDTRANS-SNAP-CANCEL-TEST/status' => Http::response([
            'status_code' => '404',
            'status_message' => 'Transaction does not exist.',
        ], 404),
        'https://app.sandbox.midtrans.com/snap/v1/transactions/snap-token-to-cancel/cancel' => Http::response([
            'canceled_at' => now()->toIso8601String(),
        ]),
    ]);

    $this->actingAs($user)
        ->postJson(route('payments.midtrans.cancel', $transaction->transaction_code))
        ->assertOk()
        ->assertJsonPath('status', 'canceled')
        ->assertJsonPath('canceled', true);

    expect($transaction->fresh()->status)->toBe('canceled');

    Http::assertSent(fn ($request) => $request->url()
        === 'https://app.sandbox.midtrans.com/snap/v1/transactions/snap-token-to-cancel/cancel'
        && $request->hasHeader('Authorization', 'Basic '.base64_encode('test-server-key:')));
});

it('keeps an uncharged Midtrans order pending when the user checks its status', function () {
    config(['services.midtrans.server_key' => 'test-server-key']);

    $user = Pengguna::factory()->create(['role' => 'user']);
    $transaction = Transaksi::create([
        'transaction_code' => 'MIDTRANS-UNCHARGED-SYNC',
        'midtrans_snap_token' => 'uncharged-snap-token',
        'user_id' => $user->id,
        'amount' => 69000,
        'payment_method' => 'midtrans',
        'status' => 'pending',
    ]);

    Http::fake([
        'https://api.sandbox.midtrans.com/v2/MIDTRANS-UNCHARGED-SYNC/status' => Http::response([
            'status_code' => '404',
            'status_message' => 'Transaction does not exist.',
        ]),
    ]);

    $this->actingAs($user)
        ->postJson(route('payments.midtrans.sync', $transaction->transaction_code))
        ->assertOk()
        ->assertJsonPath('status', 'pending')
        ->assertJsonPath('message', 'Pembayaran belum dimulai di Midtrans. Kamu masih dapat melanjutkan atau membatalkan pesanan ini.');

    expect($transaction->fresh()->status)->toBe('pending');
});

it('does not let another user cancel a Midtrans invoice', function () {
    $owner = Pengguna::factory()->create(['role' => 'user']);
    $otherUser = Pengguna::factory()->create(['role' => 'user']);
    $transaction = Transaksi::create([
        'transaction_code' => 'MIDTRANS-CANCEL-OWNER-TEST',
        'user_id' => $owner->id,
        'amount' => 99000,
        'payment_method' => 'midtrans',
        'status' => 'pending',
    ]);

    $this->actingAs($otherUser)
        ->postJson(route('payments.midtrans.cancel', $transaction->transaction_code))
        ->assertNotFound();

    expect($transaction->fresh()->status)->toBe('pending');
});

it('does not reactivate a canceled Midtrans invoice from a delayed success callback', function () {
    config(['services.midtrans.server_key' => 'test-server-key']);

    $user = Pengguna::factory()->create(['role' => 'user']);
    $transaction = Transaksi::create([
        'transaction_code' => 'MIDTRANS-LATE-CANCEL-TEST',
        'user_id' => $user->id,
        'amount' => 99000,
        'payment_method' => 'midtrans',
        'status' => 'canceled',
    ]);
    $payload = [
        'order_id' => $transaction->transaction_code,
        'status_code' => '200',
        'gross_amount' => '99000.00',
        'transaction_status' => 'settlement',
    ];
    $payload['signature_key'] = hash('sha512', $payload['order_id'].$payload['status_code'].$payload['gross_amount'].'test-server-key');

    $this->post(route('payments.midtrans.notification'), $payload)->assertOk();

    expect($transaction->fresh()->status)->toBe('canceled')
        ->and($user->fresh()->subscription_status)->not->toBe('premium');
});
