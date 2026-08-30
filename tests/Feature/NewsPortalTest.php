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
