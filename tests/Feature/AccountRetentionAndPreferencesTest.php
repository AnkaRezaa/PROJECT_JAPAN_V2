<?php

use App\Models\KloterBelajar;
use App\Models\LevelPembelajaran;
use App\Models\Pengguna;
use App\Models\ProgramPembelajaran;
use App\Models\Transaksi;
use App\Services\AccountDeletionService;
use App\Services\AccountSuspensionService;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

it('persists user learning preferences', function () {
    $user = Pengguna::factory()->create([
        'role' => 'user',
        'status' => 'active',
        'password_login_enabled' => true,
    ]);

    $this->actingAs($user)
        ->patch(route('profile.learning-preferences.update'), [
            'show_romaji' => true,
            'show_indonesian_translation' => true,
        ])
        ->assertRedirect();

    expect($user->refresh()->show_romaji)->toBeTrue()
        ->and($user->show_indonesian_translation)->toBeTrue();
});

it('schedules anonymization and cancels it when reactivated', function () {
    $actor = Pengguna::factory()->create(['role' => 'superadmin', 'status' => 'active']);
    $user = Pengguna::factory()->create(['role' => 'user', 'status' => 'active']);
    $service = app(AccountSuspensionService::class);

    $service->changeStatus($user, 'suspended', 'Uji retensi', $actor);
    expect($user->refresh()->scheduled_anonymization_at)->not->toBeNull();

    $service->changeStatus($user, 'active', null, $actor);
    expect($user->refresh()->scheduled_anonymization_at)->toBeNull();
});

it('anonymizes identity without deleting the account row', function () {
    $user = Pengguna::factory()->create([
        'role' => 'user',
        'status' => 'suspended',
        'scheduled_anonymization_at' => now()->subMinute(),
    ]);

    expect(app(AccountSuspensionService::class)->anonymizeDueAccounts())->toBe(1);

    $user->refresh();
    expect($user->status)->toBe('anonymized')
        ->and($user->email)->toEndWith('@anonymized.invalid')
        ->and($user->google_id)->toBeNull()
        ->and($user->anonymized_at)->not->toBeNull();
});

it('requires mentor kloters to be reassigned before suspension', function () {
    $level = LevelPembelajaran::create(['level_name' => 'Mentor', 'stage' => 99, 'is_premium' => true]);
    $program = ProgramPembelajaran::create([
        'level_id' => $level->id,
        'title' => 'Kelas Mentor Test',
        'slug' => 'kelas-mentor-test',
        'status' => 'published',
        'sort_order' => 99,
    ]);
    $mentor = Pengguna::factory()->create([
        'role' => 'admin',
        'admin_scope' => Pengguna::ADMIN_SCOPE_KLOTER,
        'status' => 'active',
    ]);
    expect($mentor->isMentor())->toBeTrue()
        ->and($mentor->isAdminKloter())->toBeTrue();

    KloterBelajar::create([
        'program_pembelajaran_id' => $program->id,
        'admin_id' => $mentor->id,
        'nama' => 'Kloter Mentor Test',
        'kode' => 'KMT-001',
        'tanggal_mulai' => now()->toDateString(),
        'status' => 'active',
    ]);

    expect(fn () => app(AccountSuspensionService::class)->changeStatus($mentor, 'suspended', null))
        ->toThrow(ValidationException::class);
});

it('permanently deletes a user without retained financial history', function () {
    $user = Pengguna::factory()->create([
        'role' => 'user',
        'status' => 'active',
        'password' => Hash::make('password'),
        'password_login_enabled' => true,
    ]);

    $this->actingAs($user)
        ->delete(route('profile.destroy'), [
            'confirmation_username' => $user->username,
            'password' => 'password',
        ])
        ->assertRedirect('/');

    $this->assertDatabaseMissing('users', ['id' => $user->id]);
});

it('anonymizes a user and retains financial history', function () {
    $user = Pengguna::factory()->create([
        'role' => 'user',
        'status' => 'active',
        'password' => Hash::make('password'),
        'password_login_enabled' => true,
    ]);
    $transaction = Transaksi::create([
        'transaction_code' => 'RETENTION-'.$user->id,
        'user_id' => $user->id,
        'amount' => 69000,
        'payment_method' => 'midtrans',
        'status' => 'settlement',
    ]);

    $this->actingAs($user)
        ->delete(route('profile.destroy'), [
            'confirmation_username' => $user->username,
            'password' => 'password',
        ])
        ->assertRedirect('/');

    expect($user->refresh()->status)->toBe('anonymized')
        ->and($transaction->refresh()->user_id)->toBe($user->id);
});

it('blocks permanent deletion of the last active superadmin', function () {
    $superadmin = Pengguna::factory()->create(['role' => 'superadmin', 'status' => 'active']);

    expect(app(AccountDeletionService::class)->canPermanentlyDelete($superadmin))->toBeFalse()
        ->and(app(AccountDeletionService::class)->canAnonymize($superadmin))->toBeFalse();
});
