<?php

use App\Models\PaketPembayaran;
use App\Models\Pengguna;
use App\Models\ProgramPembelajaran;
use App\Models\Transaksi;
use App\Services\ReferralService;
use Illuminate\Support\Str;

it('removes third-party Soumatome wording from landing page source', function () {
    $source = file_get_contents(resource_path('js/Pages/LandingPage.jsx'));
    expect($source)->not->toContain('Soumatome');
});

it('allows superadmin to customize referral discount settings and blocks non-superadmin', function () {
    $superadmin = Pengguna::factory()->create(['role' => 'superadmin']);
    $admin = Pengguna::factory()->create(['role' => 'admin']);

    $payload = [
        'enabled' => true,
        'inviter_percent_per_referral' => 10,
        'invitee_percent' => 8,
        'max_discount_percent' => 60,
        'min_payable_amount' => 15000,
    ];

    $this->actingAs($admin)
        ->put(route('superadmin.system.referral-discount.update'), $payload)
        ->assertForbidden();

    $this->actingAs($superadmin)
        ->put(route('superadmin.system.referral-discount.update'), $payload)
        ->assertSessionHasNoErrors();

    $settings = app(ReferralService::class)->discountSettings();
    expect($settings['inviter_percent_per_referral'])->toBe(10)
        ->and($settings['invitee_percent'])->toBe(8)
        ->and($settings['max_discount_percent'])->toBe(60)
        ->and($settings['min_payable_amount'])->toBe(15000);
});

it('calculates capped referral discount for first checkout and prevents double use', function () {
    config(['referrals.enabled' => true]);
    $service = app(ReferralService::class);
    $service->saveDiscountSettings([
        'enabled' => true,
        'inviter_percent_per_referral' => 5,
        'invitee_percent' => 5,
        'max_discount_percent' => 15,
        'min_payable_amount' => 10000,
    ]);

    $inviter = Pengguna::factory()->create(['role' => 'user', 'email_verified_at' => now()]);
    foreach (range(1, 4) as $i) {
        Pengguna::factory()->create([
            'role' => 'user',
            'referred_by_user_id' => $inviter->id,
            'email_verified_at' => now(),
        ]);
    }

    $result = $service->discountForCheckout($inviter, 100000);
    expect($result['percent'])->toBe(15)
        ->and($result['discount_amount'])->toBe(15000)
        ->and($result['final_amount'])->toBe(85000);

    $program = ProgramPembelajaran::create([
        'title' => 'Kelas Referral Test',
        'slug' => 'kelas-ref-'.Str::uuid(),
        'status' => 'published',
    ]);
    $plan = PaketPembayaran::create([
        'name' => 'Paket Ref',
        'slug' => 'paket-ref-'.Str::uuid(),
        'scope_type' => 'program',
        'program_pembelajaran_id' => $program->id,
        'price' => 100000,
        'duration_days' => 30,
        'is_active' => true,
    ]);

    Transaksi::create([
        'transaction_code' => 'TRX-REF-'.Str::upper(Str::random(6)),
        'user_id' => $inviter->id,
        'payment_plan_id' => $plan->id,
        'scope_type' => 'program',
        'program_pembelajaran_id' => $program->id,
        'amount' => 85000,
        'original_amount' => 100000,
        'discount_amount' => 15000,
        'discount_meta' => $result['meta'],
        'payment_method' => 'midtrans',
        'status' => 'pending',
    ]);

    $second = $service->discountForCheckout($inviter, 100000);
    expect($second['discount_amount'])->toBe(0)
        ->and($second['final_amount'])->toBe(100000);
});
