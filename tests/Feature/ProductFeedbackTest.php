<?php

use App\Models\Pengguna;
use App\Models\UmpanBalikProduk;

it('stores authenticated product feedback with a role snapshot', function () {
    $user = Pengguna::factory()->create(['role' => 'user', 'status' => 'active']);

    $this->actingAs($user)
        ->from('/user/dashboard')
        ->post(route('product-feedback.store'), [
            'category' => 'bug',
            'message' => 'Tombol lanjut tidak merespons pada kuis.',
            'page_url' => '/user/quiz/1',
        ])
        ->assertRedirect('/user/dashboard');

    $this->assertDatabaseHas('product_feedback', [
        'user_id' => $user->id,
        'role_snapshot' => 'user',
        'category' => 'bug',
        'source' => 'manual',
        'response_type' => 'submitted',
        'status' => 'new',
    ]);
});

it('lets a superadmin resolve and export product feedback safely', function () {
    $superadmin = Pengguna::factory()->create(['role' => 'superadmin', 'status' => 'active']);
    $feedback = UmpanBalikProduk::create([
        'user_id' => $superadmin->id,
        'role_snapshot' => 'superadmin',
        'category' => 'suggestion',
        'message' => '=HYPERLINK("https://example.test")',
        'status' => 'new',
    ]);

    $this->actingAs($superadmin)
        ->patch(route('superadmin.activity.feedback.update', $feedback), [
            'status' => 'resolved',
            'resolution_note' => 'Sudah ditinjau.',
        ])
        ->assertRedirect();

    expect($feedback->refresh()->status)->toBe('resolved')
        ->and($feedback->handled_by)->toBe($superadmin->id);

    $response = $this->actingAs($superadmin)
        ->get(route('superadmin.activity.feedback.export'));

    $response->assertOk();
    expect($response->streamedContent())
        ->toStartWith("\xEF\xBB\xBF")
        ->toContain("'=HYPERLINK");

    if (class_exists(ZipArchive::class)) {
        $this->actingAs($superadmin)
            ->get(route('superadmin.activity.feedback.export-xlsx'))
            ->assertOk()
            ->assertHeader('content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    }
});

it('rejects product feedback from guests', function () {
    $this->post(route('product-feedback.store'), [
        'category' => 'bug',
        'message' => 'Pesan cukup panjang untuk validasi.',
    ])->assertRedirect(route('login'));
});
