<?php

use App\Models\HariModul;
use App\Models\LevelPembelajaran;
use App\Models\LogAktivitas;
use App\Models\Modul;
use App\Models\PaketPembayaran;
use App\Models\Pengguna;
use App\Models\Progres;
use App\Models\ProgresHariModul;
use App\Models\RiwayatLogin;
use App\Models\Transaksi;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;

it('restores only the intended panel for superadmin login', function (string $intended, string $expected) {
    $operator = Pengguna::factory()->create(['role' => 'superadmin', 'status' => 'active']);

    $this->withSession(['url.intended' => $intended])
        ->post('/login', ['email' => $operator->email, 'password' => 'password'])
        ->assertRedirect($expected)
        ->assertSessionMissing('url.intended');
    $this->assertAuthenticatedAs($operator);
})->with([
    'admin panel in session' => ['/admin/dashboard', '/superadmin/dashboard'],
    'valid superadmin link' => ['/superadmin/payments?period=7', '/superadmin/payments?period=7'],
    'external destination' => ['https://example.test/', '/superadmin/dashboard'],
]);

it('keeps the admin dashboard restricted by its role policy even when the route group accepts a superadmin', function () {
    $operator = Pengguna::factory()->create(['role' => 'superadmin', 'status' => 'active']);
    $this->actingAs($operator)->get('/admin/dashboard')->assertForbidden();
    expect($operator->fresh()->role)->toBe('superadmin');
});

it('records distinct transport IPs for fresh logins without trusting forwarded headers from arbitrary clients', function () {
    $operator = Pengguna::factory()->create(['role' => 'superadmin', 'status' => 'active']);

    foreach (['192.0.2.11', '198.51.100.12'] as $address) {
        $this->withServerVariables(['REMOTE_ADDR' => $address])
            ->post('/login', ['email' => $operator->email, 'password' => 'password'], [
                'X-Forwarded-For' => '203.0.113.1',
            ])->assertRedirect('/superadmin/dashboard');
        $this->post('/logout')->assertRedirect();
    }

    expect(RiwayatLogin::where('user_id', $operator->id)->where('status', 'success')
        ->orderBy('id')->pluck('ip_address')->all())->toBe(['192.0.2.11', '198.51.100.12']);
});

it('validates and updates the password from the superadmin profile', function () {
    $operator = Pengguna::factory()->create(['role' => 'superadmin']);
    $this->actingAs($operator)->from('/superadmin/profile')
        ->put('/password', ['current_password' => 'wrong', 'password' => 'new-password', 'password_confirmation' => 'new-password'])
        ->assertRedirect('/superadmin/profile')->assertSessionHasErrors('current_password');
    expect(Hash::check('password', $operator->fresh()->password))->toBeTrue();

    $this->from('/superadmin/profile')
        ->put('/password', ['current_password' => 'password', 'password' => 'new-password', 'password_confirmation' => 'new-password'])
        ->assertRedirect('/superadmin/profile')->assertSessionHasNoErrors();
    expect(Hash::check('new-password', $operator->fresh()->password))->toBeTrue();
});

it('separates lifetime revenue from selected-period revenue and keeps the period in dashboard links', function () {
    Cache::flush();
    $operator = Pengguna::factory()->create(['role' => 'superadmin']);
    $student = Pengguna::factory()->create(['role' => 'user']);
    $plan = PaketPembayaran::create(['name' => 'Paket Audit', 'slug' => 'paket-audit', 'scope_type' => 'global', 'price' => 10000, 'duration_days' => 30]);
    foreach ([
        ['PAID-RECENT', 'success', 10000, now()->subDay()],
        ['PAID-OLD', 'success', 20000, now()->subDays(90)],
        ['WAITING', 'pending', 30000, now()],
    ] as [$code, $status, $amount, $processed]) {
        Transaksi::create([
            'transaction_code' => $code, 'user_id' => $student->id,
            'status' => $status, 'amount' => $amount, 'processed_at' => $processed, 'payment_method' => 'manual',
            'payment_plan_id' => $plan->id,
        ]);
    }
    $this->actingAs($operator)->get('/superadmin/payments?period=7')->assertInertia(
        fn (Assert $page) => $page
            ->where('filters.period', 7)
            ->where('stats.3.value', 'Rp 30,000')
            ->where('revenueSeries', fn ($rows) => collect($rows)->sum('revenue') === 10000)
            ->where('transactions.data.0.created_at', fn ($value) => is_string($value) && str_contains($value, 'T'))
    );
    $this->get('/superadmin/dashboard?period=7')->assertInertia(fn (Assert $page) => $page
        ->where('metrics.0.value', 'Rp 10,000')
        ->where('metrics.0.href', route('superadmin.payments', ['period' => 7]))
        ->where('quickActions', fn ($actions) => collect($actions)->contains(
            fn ($item) => $item['label'] === 'Pembayaran' && $item['href'] === route('superadmin.payments')
        )));

    $selected = Transaksi::where('transaction_code', 'WAITING')->firstOrFail();
    $this->from('/superadmin/payments')->patch(route('superadmin.payments.transactions.approve', $selected), [
        'notes' => 'Bukti pembayaran diperiksa.',
    ])->assertRedirect('/superadmin/payments');
    expect($selected->fresh()->notes)->toBe('Bukti pembayaran diperiksa.');
    $this->assertDatabaseHas('activity_logs', [
        'actor_id' => $operator->id,
        'action' => 'payment.transaction_approved',
        'target_id' => $selected->id,
    ]);
    expect(Transaksi::where('transaction_code', 'PAID-RECENT')->value('notes'))->toBeNull();

    $orphaned = Transaksi::create(['transaction_code' => 'NO-PLAN', 'user_id' => $student->id, 'status' => 'pending', 'amount' => 10000]);
    $this->from('/superadmin/payments')->patch(route('superadmin.payments.transactions.approve', $orphaned))
        ->assertRedirect('/superadmin/payments')->assertSessionHasErrors('transaction');
    expect($orphaned->fresh()->status)->toBe('pending');
});

it('requires a completion date and a published module in the superadmin student progress', function () {
    $operator = Pengguna::factory()->create(['role' => 'superadmin']);
    $student = Pengguna::factory()->create(['role' => 'user']);
    $level = LevelPembelajaran::create(['level_name' => 'Audit N4', 'stage' => 4]);
    foreach ([['published', null], ['published', now()], ['draft', now()]] as $index => [$status, $completed]) {
        $module = Modul::create([
            'level_id' => $level->id, 'title' => 'Audit module '.($index + 1), 'week_number' => $index + 1, 'status' => $status,
        ]);
        if ($completed) {
            Progres::create(['user_id' => $student->id, 'module_id' => $module->id, 'completed_at' => $completed]);
        } else {
            $day = HariModul::create(['module_id' => $module->id, 'day_number' => 1, 'status' => 'published', 'title' => 'Hari pertama']);
            HariModul::create(['module_id' => $module->id, 'day_number' => 2, 'status' => 'published', 'title' => 'Hari kedua']);
            ProgresHariModul::create(['user_id' => $student->id, 'module_day_id' => $day->id, 'completed_at' => now()]);
        }
    }
    $this->actingAs($operator)->get(route('superadmin.users.show', $student))->assertInertia(
        fn (Assert $page) => $page->where('student.lessons_done', 1)->has('recentProgress', 1)
            ->where('levelProgress', fn ($rows) => collect($rows)->contains(
                fn ($row) => $row['id'] === $level->id && $row['completed_lessons'] === 1 && $row['total_lessons'] === 2
            ))
    );
});

it('shows context for system activity and the actual login time in WIB', function () {
    $operator = Pengguna::factory()->create(['role' => 'superadmin']);
    LogAktivitas::create([
        'actor_id' => $operator->id, 'action' => 'beta.updated', 'target_type' => 'system',
        'description' => 'Pengaturan beta diperbarui.',
    ]);
    RiwayatLogin::create([
        'user_id' => $operator->id, 'email' => $operator->email, 'role' => $operator->role,
        'status' => 'success', 'logged_in_at' => '2026-11-19 14:08:00',
    ]);

    $this->actingAs($operator)->get('/superadmin/activity')->assertInertia(fn (Assert $page) => $page
        ->where('timeline.data.0.target', 'Sistem')
        ->where('timeline.data.0.description', 'Pengaturan beta diperbarui.')
        ->where('logins.data.0.logged_in_at', fn ($time) => str_ends_with($time, '21:08')));
});
