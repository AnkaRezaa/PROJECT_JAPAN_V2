<?php

use App\Models\Pengguna;
use App\Notifications\NotifikasiPengguna;
use Inertia\Testing\AssertableInertia as Assert;

it('shows only the authenticated account notifications in the shared inbox', function () {
    $admin = Pengguna::factory()->create([
        'role' => 'admin',
        'status' => 'active',
    ]);
    $student = Pengguna::factory()->create([
        'role' => 'user',
        'status' => 'active',
    ]);

    $admin->notify(new NotifikasiPengguna(
        'kloter_enrollment_pending',
        'Peserta menunggu persetujuan',
        'Ada peserta yang menunggu persetujuan kelas.',
        route('admin.users'),
        ['kloter_id' => 10, 'dedupe_key' => 'kloter_id:10'],
        'access',
        'warning',
        false,
    ));
    $student->notify(new NotifikasiPengguna(
        'payment_success',
        'Pembayaran berhasil',
        'Akses kelas sudah aktif.',
        route('user.kelas.index'),
        ['transaction_id' => 10, 'dedupe_key' => 'transaction_id:10'],
        'payment',
        'success',
        false,
    ));

    $this->actingAs($admin)
        ->getJson(route('notifications.index'))
        ->assertOk()
        ->assertJsonPath('unread_count', 1)
        ->assertJsonPath('notifications.0.data.type', 'kloter_enrollment_pending');

    $this->actingAs($student)
        ->getJson(route('notifications.index'))
        ->assertOk()
        ->assertJsonPath('unread_count', 1)
        ->assertJsonPath('notifications.0.data.type', 'payment_success');
});

it('uses a role-aware inbox page while preserving the previous user notification URL', function () {
    $admin = Pengguna::factory()->create([
        'role' => 'admin',
        'status' => 'active',
    ]);
    $student = Pengguna::factory()->create([
        'role' => 'user',
        'status' => 'active',
    ]);

    $this->actingAs($admin)
        ->get(route('notifications.page'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Notifikasi/Index')
            ->where('unreadCount', 0));

    $this->actingAs($student)
        ->get(route('user.notifications.index'))
        ->assertRedirect(route('notifications.page'));
});
