<?php

use App\Models\Berita;
use App\Models\Pengguna;
use Illuminate\Support\Facades\Artisan;

it('serves published news through both its slug and legacy numeric URL', function () {
    $user = Pengguna::factory()->create(['role' => 'user']);
    $news = Berita::create([
        'title' => 'Rencana Belajar N3',
        'slug' => 'rencana-belajar-n3',
        'body' => '<p>Konten berita.</p>',
        'status' => 'published',
        'audience' => 'students',
        'category' => 'materi-belajar',
        'published_at' => now(),
    ]);

    $this->actingAs($user)
        ->get(route('user.news.show', $news->slug))
        ->assertOk();

    $this->actingAs($user)
        ->get(route('user.news.show', $news->id))
        ->assertOk();
});

it('publishes scheduled news only after its scheduled time', function () {
    $due = Berita::create([
        'title' => 'Berita Terjadwal',
        'slug' => 'berita-terjadwal',
        'status' => 'scheduled',
        'audience' => 'students',
        'category' => 'platform',
        'scheduled_at' => now()->subMinute(),
    ]);
    $future = Berita::create([
        'title' => 'Berita Masa Depan',
        'slug' => 'berita-masa-depan',
        'status' => 'scheduled',
        'audience' => 'students',
        'category' => 'platform',
        'scheduled_at' => now()->addMinute(),
    ]);

    Artisan::call('news:publish-scheduled');

    expect($due->fresh()->status)->toBe('published')
        ->and($due->fresh()->published_at)->not->toBeNull()
        ->and($future->fresh()->status)->toBe('scheduled');
});

it('lets a superadmin save portal metadata as a draft', function () {
    $admin = Pengguna::factory()->create(['role' => 'superadmin']);

    $this->actingAs($admin)
        ->post(route('superadmin.content.news.store'), [
            'title' => 'Info Kelas Musim Panas',
            'slug' => 'info-kelas-musim-panas',
            'excerpt' => 'Ringkasan berita.',
            'body' => '<h2>Informasi</h2><p>Isi berita.</p>',
            'status' => 'draft',
            'audience' => 'students',
            'category' => 'pengumuman',
            'is_pinned' => false,
            'seo_title' => 'Info Kelas Musim Panas',
            'seo_description' => 'Informasi kelas musim panas TOKU-UP.',
        ])
        ->assertRedirect();

    $news = Berita::where('slug', 'info-kelas-musim-panas')->firstOrFail();

    expect($news->status)->toBe('draft')
        ->and($news->category)->toBe('pengumuman')
        ->and($news->seo_description)->toBe('Informasi kelas musim panas TOKU-UP.');
});

it('cleans empty reading blocks and ignores scheduled_at for draft news', function () {
    $admin = Pengguna::factory()->create(['role' => 'superadmin']);

    $this->actingAs($admin)
        ->post(route('superadmin.content.news.store'), [
            'title' => 'Berita Sanitasi Sukses',
            'status' => 'draft',
            'audience' => 'students',
            'category' => 'platform',
            'scheduled_at' => now()->subDays(5)->toDateTimeString(),
            'reading_blocks' => [
                ['japanese' => '', 'reading' => '', 'translation' => ''],
                ['japanese' => '日本語', 'reading' => 'にほんご', 'translation' => 'Bahasa Jepang'],
                ['japanese' => '   ', 'reading' => '   ', 'translation' => 'kosong'],
            ],
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    $news = Berita::where('title', 'Berita Sanitasi Sukses')->firstOrFail();

    expect($news->status)->toBe('draft')
        ->and($news->scheduled_at)->toBeNull()
        ->and($news->reading_blocks)->toHaveCount(1)
        ->and($news->reading_blocks[0]['japanese'])->toBe('日本語');
});

it('requires scheduled_at when status is scheduled', function () {
    $admin = Pengguna::factory()->create(['role' => 'superadmin']);

    $this->actingAs($admin)
        ->post(route('superadmin.content.news.store'), [
            'title' => 'Berita Gagal Terjadwal',
            'status' => 'scheduled',
            'audience' => 'students',
            'category' => 'platform',
            'scheduled_at' => null,
        ])
        ->assertSessionHasErrors(['scheduled_at']);
});

it('validates ends_at must be after or equal to starts_at', function () {
    $admin = Pengguna::factory()->create(['role' => 'superadmin']);

    $this->actingAs($admin)
        ->post(route('superadmin.content.news.store'), [
            'title' => 'Berita Jadwal Tidak Valid',
            'status' => 'draft',
            'audience' => 'students',
            'category' => 'platform',
            'starts_at' => now()->addDays(5)->toDateString(),
            'ends_at' => now()->addDays(2)->toDateString(),
        ])
        ->assertSessionHasErrors(['ends_at']);
});

