<?php

use App\Models\AnggotaKloter;
use App\Models\KloterBelajar;
use App\Models\Langganan;
use App\Models\LevelPembelajaran;
use App\Models\PaketPembayaran;
use App\Models\Pengguna;
use App\Models\ProgramPembelajaran;
use App\Models\Transaksi;
use App\Services\AksesLanggananService;
use App\Services\KloterBelajarService;
use Database\Seeders\DemoDataSeeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Validation\ValidationException;
use Inertia\Testing\AssertableInertia as Assert;

function createAdminGlobalKloterFixture(): array
{
    $level = LevelPembelajaran::create([
        'level_name' => 'N3 Scope',
        'stage' => 90,
        'is_premium' => true,
    ]);
    $programA = ProgramPembelajaran::create([
        'level_id' => $level->id,
        'title' => 'Program Scope A',
        'slug' => 'program-scope-a',
        'status' => 'published',
        'sort_order' => 1,
    ]);
    $programB = ProgramPembelajaran::create([
        'level_id' => $level->id,
        'title' => 'Program Scope B',
        'slug' => 'program-scope-b',
        'status' => 'published',
        'sort_order' => 2,
    ]);
    $globalAdmin = Pengguna::factory()->create([
        'username' => 'Global Admin',
        'role' => 'admin',
        'admin_scope' => Pengguna::ADMIN_SCOPE_GLOBAL,
        'status' => 'active',
    ]);
    $kloterAdmin = Pengguna::factory()->create([
        'username' => 'Kloter Admin A',
        'role' => 'admin',
        'admin_scope' => Pengguna::ADMIN_SCOPE_KLOTER,
        'status' => 'active',
    ]);
    $otherKloterAdmin = Pengguna::factory()->create([
        'username' => 'Kloter Admin B',
        'role' => 'admin',
        'admin_scope' => Pengguna::ADMIN_SCOPE_KLOTER,
        'status' => 'active',
    ]);
    $studentA = Pengguna::factory()->create(['role' => 'user', 'status' => 'active']);
    $studentB = Pengguna::factory()->create(['role' => 'user', 'status' => 'active']);
    $kloterA = KloterBelajar::create([
        'program_pembelajaran_id' => $programA->id,
        'admin_id' => $kloterAdmin->id,
        'nama' => 'Kloter Scope A',
        'kode' => 'KLT-SCOPE-A',
        'tanggal_mulai' => now()->subWeek()->toDateString(),
        'tanggal_selesai' => now()->addMonth()->toDateString(),
        'status' => 'active',
    ]);
    $kloterB = KloterBelajar::create([
        'program_pembelajaran_id' => $programB->id,
        'admin_id' => $otherKloterAdmin->id,
        'nama' => 'Kloter Scope B',
        'kode' => 'KLT-SCOPE-B',
        'tanggal_mulai' => now()->subWeek()->toDateString(),
        'tanggal_selesai' => now()->addMonth()->toDateString(),
        'status' => 'active',
    ]);

    foreach ([[$kloterA, $studentA], [$kloterB, $studentB]] as [$kloter, $student]) {
        AnggotaKloter::create([
            'kloter_belajar_id' => $kloter->id,
            'user_id' => $student->id,
            'joined_at' => now(),
            'status' => 'active',
        ]);
    }

    return compact(
        'level',
        'programA',
        'programB',
        'globalAdmin',
        'kloterAdmin',
        'otherKloterAdmin',
        'studentA',
        'studentB',
        'kloterA',
        'kloterB'
    );
}

it('keeps shared content routes available to global and kloter admins', function () {
    $fixture = createAdminGlobalKloterFixture();

    $this->actingAs($fixture['globalAdmin'])
        ->get(route('admin.modules.index'))
        ->assertOk();

    $this->actingAs($fixture['kloterAdmin'])
        ->get(route('admin.modules.index'))
        ->assertOk();
});

it('activates a self paced class immediately after successful payment', function () {
    $fixture = createAdminGlobalKloterFixture();
    $student = Pengguna::factory()->create(['role' => 'user', 'status' => 'active']);
    $plan = PaketPembayaran::create([
        'name' => 'Mandiri Scope A',
        'slug' => 'mandiri-scope-a',
        'scope_type' => 'program',
        'program_pembelajaran_id' => $fixture['programA']->id,
        'price' => 79000,
        'duration_days' => 30,
        'is_active' => true,
    ]);
    $transaction = Transaksi::create([
        'transaction_code' => 'TRX-MANDIRI-SCOPE-A',
        'user_id' => $student->id,
        'payment_plan_id' => $plan->id,
        'scope_type' => 'program',
        'program_pembelajaran_id' => $fixture['programA']->id,
        'amount' => 79000,
        'payment_method' => 'midtrans',
        'status' => 'success',
        'processed_at' => now(),
    ]);

    $subscription = app(AksesLanggananService::class)->activateFromTransaction($transaction);

    expect($subscription)->not->toBeNull()
        ->and($subscription->scope_type)->toBe('program')
        ->and($transaction->fresh()->subscription_id)->toBe($subscription->id)
        ->and($student->fresh()->subscription_status)->toBe('premium');
});

it('keeps mentor access pending until its assigned admin approves it idempotently', function () {
    Notification::fake();
    $fixture = createAdminGlobalKloterFixture();
    $student = Pengguna::factory()->create(['role' => 'user', 'status' => 'active']);
    $plan = PaketPembayaran::create([
        'name' => 'Mentor Scope A',
        'slug' => 'mentor-scope-a',
        'scope_type' => 'kloter',
        'program_pembelajaran_id' => $fixture['programA']->id,
        'price' => 99000,
        'duration_days' => 30,
        'is_active' => true,
    ]);
    $transaction = Transaksi::create([
        'transaction_code' => 'TRX-MENTOR-SCOPE-A',
        'user_id' => $student->id,
        'payment_plan_id' => $plan->id,
        'scope_type' => 'kloter',
        'program_pembelajaran_id' => $fixture['programA']->id,
        'kloter_belajar_id' => $fixture['kloterA']->id,
        'amount' => 99000,
        'payment_method' => 'midtrans',
        'status' => 'success',
        'processed_at' => now(),
    ]);
    $membership = app(KloterBelajarService::class)->reservePaymentSeat(
        $student,
        $fixture['kloterA'],
        $transaction
    );

    $subscription = app(AksesLanggananService::class)->activateFromTransaction($transaction);
    $membership->refresh();

    expect($subscription)->toBeNull()
        ->and($membership->status)->toBe('paid_pending_approval')
        ->and($transaction->fresh()->subscription_id)->toBeNull();

    $this->actingAs($fixture['otherKloterAdmin'])
        ->patch(route('admin.kloters.enrollments.approve', [$fixture['kloterA'], $membership]))
        ->assertForbidden();

    $this->actingAs($fixture['kloterAdmin'])
        ->patch(route('admin.kloters.enrollments.approve', [$fixture['kloterA'], $membership]))
        ->assertRedirect();
    $this->actingAs($fixture['kloterAdmin'])
        ->patch(route('admin.kloters.enrollments.approve', [$fixture['kloterA'], $membership]))
        ->assertRedirect();

    expect($membership->fresh()->status)->toBe('active')
        ->and($transaction->fresh()->subscription_id)->not->toBeNull()
        ->and(Langganan::where('user_id', $student->id)
            ->where('program_pembelajaran_id', $fixture['programA']->id)
            ->count())->toBe(1);
});

it('allows global admin to approve enrollment from any active cohort', function () {
    Notification::fake();
    $fixture = createAdminGlobalKloterFixture();
    $student = Pengguna::factory()->create(['role' => 'user', 'status' => 'active']);
    $plan = PaketPembayaran::create([
        'name' => 'Mentor Global Approval',
        'slug' => 'mentor-global-approval',
        'scope_type' => 'kloter',
        'program_pembelajaran_id' => $fixture['programB']->id,
        'price' => 99000,
        'duration_days' => 30,
        'is_active' => true,
    ]);
    $transaction = Transaksi::create([
        'transaction_code' => 'TRX-GLOBAL-APPROVAL',
        'user_id' => $student->id,
        'payment_plan_id' => $plan->id,
        'scope_type' => 'kloter',
        'program_pembelajaran_id' => $fixture['programB']->id,
        'kloter_belajar_id' => $fixture['kloterB']->id,
        'amount' => 99000,
        'payment_method' => 'midtrans',
        'status' => 'success',
        'processed_at' => now(),
    ]);
    $membership = AnggotaKloter::create([
        'kloter_belajar_id' => $fixture['kloterB']->id,
        'user_id' => $student->id,
        'transaction_id' => $transaction->id,
        'joined_at' => now(),
        'status' => 'paid_pending_approval',
    ]);

    $this->actingAs($fixture['globalAdmin'])
        ->patch(route('admin.kloters.enrollments.approve', [$fixture['kloterB'], $membership]))
        ->assertRedirect();

    expect($membership->fresh()->status)->toBe('active')
        ->and($transaction->fresh()->subscription_id)->not->toBeNull();
});

it('does not recreate a missing mentor reservation after payment succeeds', function () {
    $fixture = createAdminGlobalKloterFixture();
    $student = Pengguna::factory()->create(['role' => 'user', 'status' => 'active']);
    $plan = PaketPembayaran::create([
        'name' => 'Mentor Missing Reservation',
        'slug' => 'mentor-missing-reservation',
        'scope_type' => 'kloter',
        'program_pembelajaran_id' => $fixture['programA']->id,
        'price' => 99000,
        'duration_days' => 30,
        'is_active' => true,
    ]);
    $transaction = Transaksi::create([
        'transaction_code' => 'TRX-MISSING-RESERVATION',
        'user_id' => $student->id,
        'payment_plan_id' => $plan->id,
        'scope_type' => 'kloter',
        'program_pembelajaran_id' => $fixture['programA']->id,
        'kloter_belajar_id' => $fixture['kloterA']->id,
        'amount' => 99000,
        'payment_method' => 'midtrans',
        'status' => 'success',
        'processed_at' => now(),
    ]);

    expect(fn () => app(AksesLanggananService::class)->activateFromTransaction($transaction))
        ->toThrow(ValidationException::class);

    expect(AnggotaKloter::where('transaction_id', $transaction->id)->exists())->toBeFalse()
        ->and($transaction->fresh()->subscription_id)->toBeNull();
});

it('shows every student to global admin and only assigned students to kloter admin', function () {
    $fixture = createAdminGlobalKloterFixture();

    $this->actingAs($fixture['globalAdmin'])
        ->get(route('admin.users'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/DataUser/DataUser')
            ->where('adminScope', Pengguna::ADMIN_SCOPE_GLOBAL)
            ->has('students.data', 2)
            ->has('kloters', 2));

    $this->actingAs($fixture['kloterAdmin'])
        ->get(route('admin.users'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/DataUser/DataUser')
            ->where('adminScope', Pengguna::ADMIN_SCOPE_KLOTER)
            ->has('students.data', 1)
            ->where('students.data.0.id', $fixture['studentA']->id)
            ->has('kloters', 1));
});

it('shows pending approvals from every managed cohort without requiring a cohort filter', function () {
    $fixture = createAdminGlobalKloterFixture();
    $student = Pengguna::factory()->create(['role' => 'user', 'status' => 'active']);
    $plan = PaketPembayaran::create([
        'name' => 'Mentor Approval Scope A',
        'slug' => 'mentor-approval-scope-a',
        'scope_type' => 'kloter',
        'program_pembelajaran_id' => $fixture['programA']->id,
        'price' => 99000,
        'duration_days' => 30,
        'is_active' => true,
    ]);
    $transaction = Transaksi::create([
        'transaction_code' => 'TRX-PENDING-APPROVAL-SCOPE-A',
        'user_id' => $student->id,
        'payment_plan_id' => $plan->id,
        'scope_type' => 'kloter',
        'program_pembelajaran_id' => $fixture['programA']->id,
        'kloter_belajar_id' => $fixture['kloterA']->id,
        'amount' => 99000,
        'payment_method' => 'midtrans',
        'status' => 'success',
        'processed_at' => now(),
    ]);
    AnggotaKloter::create([
        'kloter_belajar_id' => $fixture['kloterA']->id,
        'user_id' => $student->id,
        'transaction_id' => $transaction->id,
        'joined_at' => now(),
        'status' => 'paid_pending_approval',
    ]);

    $unpaidTransaction = Transaksi::create([
        'transaction_code' => 'TRX-NOT-PAID-APPROVAL',
        'user_id' => $fixture['studentB']->id,
        'payment_plan_id' => $plan->id,
        'scope_type' => 'kloter',
        'program_pembelajaran_id' => $fixture['programA']->id,
        'kloter_belajar_id' => $fixture['kloterA']->id,
        'amount' => 99000,
        'payment_method' => 'midtrans',
        'status' => 'pending',
    ]);
    AnggotaKloter::create([
        'kloter_belajar_id' => $fixture['kloterA']->id,
        'user_id' => $fixture['studentB']->id,
        'transaction_id' => $unpaidTransaction->id,
        'joined_at' => now(),
        'status' => 'paid_pending_approval',
    ]);

    $this->actingAs($fixture['globalAdmin'])
        ->get(route('admin.users'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/DataUser/DataUser')
            ->has('pendingEnrollments', 1)
            ->where('pendingEnrollments.0.kloter.id', $fixture['kloterA']->id)
            ->where('pendingEnrollments.0.kloter.mentor.id', $fixture['kloterAdmin']->id)
            ->where('pendingEnrollments.0.user.id', $student->id));
});

it('rejects student and cohort access outside a kloter admin assignment', function () {
    $fixture = createAdminGlobalKloterFixture();

    $this->actingAs($fixture['kloterAdmin'])
        ->get(route('admin.users.show', $fixture['studentB']))
        ->assertForbidden();

    $this->actingAs($fixture['kloterAdmin'])
        ->get(route('admin.users', ['kloter' => $fixture['kloterB']->id]))
        ->assertNotFound();

    $this->actingAs($fixture['kloterAdmin'])
        ->patch(route('admin.kloters.schedule.update', $fixture['kloterB']), [
            'tanggal_mulai' => now()->toDateString(),
            'tanggal_selesai' => now()->addMonth()->toDateString(),
        ])
        ->assertForbidden();
});

it('renders a content workspace for global admin and an intervention workspace for kloter admin', function () {
    $fixture = createAdminGlobalKloterFixture();

    $this->actingAs($fixture['globalAdmin'])
        ->get(route('admin.dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Beranda/Beranda')
            ->where('workspace', 'content')
            ->where('adminScope', Pengguna::ADMIN_SCOPE_GLOBAL)
            ->has('stats', 4)
            ->has('actionItems', 3));

    $this->actingAs($fixture['kloterAdmin'])
        ->get(route('admin.dashboard', ['kloter' => $fixture['kloterA']->id]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Beranda/Beranda')
            ->where('workspace', 'kloter')
            ->where('adminScope', Pengguna::ADMIN_SCOPE_KLOTER)
            ->where('cohorts.0.id', $fixture['kloterA']->id)
            ->has('stats', 4)
            ->has('actionItems', 3));
});

it('returns an empty student scope when a kloter admin has no assignment', function () {
    createAdminGlobalKloterFixture();
    $unassigned = Pengguna::factory()->create([
        'role' => 'admin',
        'admin_scope' => Pengguna::ADMIN_SCOPE_KLOTER,
        'status' => 'active',
    ]);

    $this->actingAs($unassigned)
        ->get(route('admin.users'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/DataUser/DataUser')
            ->has('students.data', 0)
            ->has('kloters', 0));
});

it('lets an assigned admin update schedule and manage roster without deleting access', function () {
    $fixture = createAdminGlobalKloterFixture();
    $candidate = Pengguna::factory()->create(['role' => 'user', 'status' => 'active']);
    $plan = PaketPembayaran::create([
        'name' => 'Program Scope A',
        'slug' => 'program-scope-a-plan',
        'scope_type' => 'program',
        'program_pembelajaran_id' => $fixture['programA']->id,
        'price' => 10000,
        'duration_days' => 30,
        'is_active' => true,
    ]);
    $subscription = Langganan::create([
        'user_id' => $candidate->id,
        'payment_plan_id' => $plan->id,
        'scope_type' => 'program',
        'program_pembelajaran_id' => $fixture['programA']->id,
        'status' => 'active',
        'start_date' => now()->toDateString(),
        'end_date' => now()->addMonth()->toDateString(),
        'auto_renew' => false,
    ]);

    $this->actingAs($fixture['kloterAdmin'])
        ->patch(route('admin.kloters.schedule.update', $fixture['kloterA']), [
            'tanggal_mulai' => now()->addDay()->toDateString(),
            'tanggal_selesai' => now()->addMonths(2)->toDateString(),
        ])
        ->assertRedirect();

    $this->actingAs($fixture['kloterAdmin'])
        ->post(route('admin.kloters.users.store', $fixture['kloterA']), [
            'user_id' => $candidate->id,
        ])
        ->assertRedirect();

    $membership = AnggotaKloter::where('kloter_belajar_id', $fixture['kloterA']->id)
        ->where('user_id', $candidate->id)
        ->firstOrFail();

    expect($membership->status)->toBe('active')
        ->and($subscription->fresh()->kloter_belajar_id)->toBe($fixture['kloterA']->id);

    $this->actingAs($fixture['kloterAdmin'])
        ->delete(route('admin.kloters.users.destroy', [$fixture['kloterA'], $candidate]))
        ->assertRedirect();

    expect($membership->fresh()->status)->toBe('removed')
        ->and($subscription->fresh()->status)->toBe('active');
});

it('allows superadmin to provision scoped admins and lists active admins as instructors', function () {
    $fixture = createAdminGlobalKloterFixture();
    $superadmin = Pengguna::factory()->create([
        'role' => 'superadmin',
        'admin_scope' => null,
        'status' => 'active',
    ]);

    $this->actingAs($superadmin)
        ->post(route('superadmin.admins.store'), [
            'username' => 'Mentor Kelas Baru',
            'email' => 'admin-kloter-baru@example.com',
            'password' => 'password1234',
            'role' => 'admin',
            'admin_scope' => Pengguna::ADMIN_SCOPE_KLOTER,
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('users', [
        'email' => 'admin-kloter-baru@example.com',
        'role' => 'admin',
        'admin_scope' => Pengguna::ADMIN_SCOPE_KLOTER,
    ]);
    $newKloterAdmin = Pengguna::where('email', 'admin-kloter-baru@example.com')->firstOrFail();

    $this->actingAs($superadmin)
        ->get(route('superadmin.kloters'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('SuperAdmin/Kloter/Kloter')
            ->has('admins', 4)
            ->where('admins', fn ($admins) => collect($admins)->pluck('id')->contains($newKloterAdmin->id)
                && collect($admins)->pluck('id')->contains($fixture['globalAdmin']->id)));
});

it('opens live classroom setup with assigned cohorts for kloter admin and all cohorts for global admin', function () {
    $fixture = createAdminGlobalKloterFixture();

    $this->actingAs($fixture['kloterAdmin'])
        ->get(route('admin.live-classes.create', ['program_id' => $fixture['programA']->id]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/RuangKelas/Show')
            ->where('setup.program.id', $fixture['programA']->id)
            ->has('setup.kloters', 1)
            ->where('setup.kloters.0.id', $fixture['kloterA']->id));

    $this->actingAs($fixture['globalAdmin'])
        ->get(route('admin.live-classes.create', ['program_id' => $fixture['programA']->id]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/RuangKelas/Show')
            ->has('setup.kloters', 1)
            ->where('setup.kloters.0.id', $fixture['kloterA']->id));
});

it('prevents removing kloter scope while an admin still owns a cohort', function () {
    $fixture = createAdminGlobalKloterFixture();
    $superadmin = Pengguna::factory()->create([
        'role' => 'superadmin',
        'admin_scope' => null,
        'status' => 'active',
    ]);

    $this->actingAs($superadmin)
        ->patch(route('superadmin.admins.scope', $fixture['kloterAdmin']), [
            'admin_scope' => Pengguna::ADMIN_SCOPE_GLOBAL,
        ])
        ->assertSessionHasErrors('admin_scope');

    expect($fixture['kloterAdmin']->fresh()->admin_scope)->toBe(Pengguna::ADMIN_SCOPE_KLOTER);
});

it('prevents a superadmin from resetting their own password', function () {
    $superadmin = Pengguna::factory()->create([
        'role' => 'superadmin',
        'admin_scope' => null,
        'status' => 'active',
    ]);
    $passwordHash = $superadmin->password;

    $this->actingAs($superadmin)
        ->post(route('superadmin.admins.reset-password', $superadmin))
        ->assertUnprocessable();

    expect($superadmin->fresh()->password)->toBe($passwordHash);
});

it('seeds global and kloter admins and assigns demo cohorts to the kloter admin', function () {
    Pengguna::factory()->unverified()->create([
        'email' => 'admin@toku-up.com',
        'password' => Hash::make('password-client'),
        'role' => 'admin',
        'status' => 'active',
    ]);

    $this->seed(DemoDataSeeder::class);
    $this->seed(DemoDataSeeder::class);

    $globalAdmin = Pengguna::where('email', 'admin@toku-up.com')->firstOrFail();
    $kloterAdmin = Pengguna::where('email', 'admin.kloter@toku-up.com')->firstOrFail();

    expect($globalAdmin->admin_scope)->toBe(Pengguna::ADMIN_SCOPE_GLOBAL)
        ->and($kloterAdmin->admin_scope)->toBe(Pengguna::ADMIN_SCOPE_KLOTER)
        ->and($globalAdmin->hasVerifiedEmail())->toBeTrue()
        ->and($kloterAdmin->hasVerifiedEmail())->toBeTrue()
        ->and(Hash::check('TOKU-UP#2026', $globalAdmin->password))->toBeTrue()
        ->and(Pengguna::where('email', 'admin.kloter@toku-up.com')->count())->toBe(1);

    expect(KloterBelajar::where('admin_id', $kloterAdmin->id)->count())->toBe(1)
        ->and(KloterBelajar::where('admin_id', $globalAdmin->id)->count())->toBe(0);
});
