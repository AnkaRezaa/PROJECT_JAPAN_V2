<?php

use App\Models\CurriculumTrack;
use App\Models\LevelPembelajaran;
use App\Models\Pengguna;
use App\Models\ProgramPembelajaran;
use Database\Seeders\JlptLevelSeeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

it('adds the missing JLPT master levels without changing an existing level', function () {
    $track = CurriculumTrack::where('code', 'jlpt')->firstOrFail();
    $n3 = $track->levels()->create(['level_name' => 'N3', 'stage' => 3, 'is_premium' => true]);
    $admin = Pengguna::factory()->create(['role' => 'admin', 'admin_scope' => 'global']);

    $this->seed(JlptLevelSeeder::class);
    $this->seed(JlptLevelSeeder::class);

    $levels = $track->levels()->orderBy('stage')->pluck('level_name')->all();
    expect($levels)->toBe(['JLPT N1', 'JLPT N2', 'N3', 'JLPT N4', 'JLPT N5']);
    expect((bool) $n3->fresh()->is_premium)->toBeTrue();

    $this->actingAs($admin)->get(route('admin.programs.index'))->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('levels', fn ($rows) => collect($rows)
            ->where('curriculum_track_id', $track->id)->pluck('level_name')->all() === $levels));
    $this->actingAs($admin)->get(route('admin.exams.create'))->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('level_options', fn ($rows) => collect($rows)
            ->pluck('level_name')->intersect($levels)->values()->all() === $levels));
});

it('creates classes inside the selected curriculum track', function () {
    $admin = Pengguna::factory()->create(['role' => 'admin']);
    $jlpt = CurriculumTrack::create([
        'code' => 'jlpt-test',
        'name' => 'JLPT Test',
        'status' => 'active',
        'sort_order' => 1,
    ]);
    $ssw = CurriculumTrack::create([
        'code' => 'ssw-test',
        'name' => 'SSW Test',
        'status' => 'active',
        'sort_order' => 2,
    ]);
    $n4 = LevelPembelajaran::create([
        'curriculum_track_id' => $jlpt->id,
        'level_name' => 'N4',
        'stage' => 4,
    ]);

    $this->actingAs($admin)->post(route('admin.programs.store'), [
        'curriculum_track_id' => $jlpt->id,
        'level_id' => $n4->id,
        'learning_type' => 'mandiri',
        'title' => 'JLPT N4 Mingguan',
        'status' => 'draft',
        'sort_order' => 1,
    ])->assertSessionHasNoErrors();

    $this->actingAs($admin)->post(route('admin.programs.store'), [
        'curriculum_track_id' => $ssw->id,
        'level_id' => null,
        'learning_type' => 'mandiri',
        'title' => 'SSW Careworker',
        'status' => 'draft',
        'sort_order' => 2,
    ])->assertSessionHasNoErrors();

    $this->assertDatabaseHas('program_pembelajaran', [
        'title' => 'JLPT N4 Mingguan',
        'curriculum_track_id' => $jlpt->id,
        'level_id' => $n4->id,
    ])->assertDatabaseHas('program_pembelajaran', [
        'title' => 'SSW Careworker',
        'curriculum_track_id' => $ssw->id,
        'level_id' => null,
    ]);
});

it('rejects a level from a different curriculum track', function () {
    $admin = Pengguna::factory()->create(['role' => 'admin']);
    $jlpt = CurriculumTrack::create(['code' => 'jlpt-mismatch', 'name' => 'JLPT', 'status' => 'active', 'sort_order' => 1]);
    $ssw = CurriculumTrack::create(['code' => 'ssw-mismatch', 'name' => 'SSW', 'status' => 'active', 'sort_order' => 2]);
    $sswLevel = LevelPembelajaran::create([
        'curriculum_track_id' => $ssw->id,
        'level_name' => 'Careworker',
        'stage' => 1,
    ]);

    $this->actingAs($admin)->post(route('admin.programs.store'), [
        'curriculum_track_id' => $jlpt->id,
        'level_id' => $sswLevel->id,
        'learning_type' => 'mandiri',
        'title' => 'Kelas Tidak Valid',
        'status' => 'draft',
        'sort_order' => 1,
    ])->assertSessionHasErrors('level_id');

    $this->assertDatabaseMissing('program_pembelajaran', ['title' => 'Kelas Tidak Valid']);
});

it('stores an uploaded class thumbnail on the public disk', function () {
    Storage::fake('public');

    $admin = Pengguna::factory()->create(['role' => 'admin']);
    $track = CurriculumTrack::create([
        'code' => 'thumbnail-test',
        'name' => 'Thumbnail Test',
        'status' => 'active',
        'sort_order' => 1,
    ]);

    $this->actingAs($admin)->post(route('admin.programs.store'), [
        'curriculum_track_id' => $track->id,
        'learning_type' => 'mandiri',
        'title' => 'Kelas dengan Thumbnail',
        'status' => 'draft',
        'sort_order' => 1,
        'thumbnail_file' => UploadedFile::fake()->image('kelas.webp'),
    ])->assertSessionHasNoErrors();

    $program = ProgramPembelajaran::where('title', 'Kelas dengan Thumbnail')->firstOrFail();
    expect($program->thumbnail_url)
        ->toStartWith('/storage/kelas-thumbnails/')
        ->not->toContain('localhost');

    $thumbnailPath = ltrim(str_replace('/storage/', '', $program->thumbnail_url), '/');

    expect($thumbnailPath)->toStartWith('kelas-thumbnails/');
    Storage::disk('public')->assertExists($thumbnailPath);
});

it('normalizes legacy localhost storage thumbnail URLs and popup storage URLs', function () {
    $track = CurriculumTrack::create([
        'code' => 'legacy-thumb-test',
        'name' => 'Legacy Thumb Test',
        'status' => 'active',
        'sort_order' => 2,
    ]);

    $program = ProgramPembelajaran::create([
        'curriculum_track_id' => $track->id,
        'learning_type' => 'mandiri',
        'title' => 'JLPT N3',
        'slug' => 'jlpt-n3-test',
        'status' => 'published',
        'sort_order' => 1,
    ]);

    \Illuminate\Support\Facades\DB::table('program_pembelajaran')
        ->where('id', $program->id)
        ->update([
            'thumbnail_url' => 'http://localhost/storage/kelas-thumbnails/CzXOLPv5UEln4PmR0Meyiqh5kJrBOjQHoZZmrlCx.jpg',
        ]);

    $freshProgram = ProgramPembelajaran::findOrFail($program->id);
    expect($freshProgram->thumbnail_url)
        ->toBe('/storage/kelas-thumbnails/CzXOLPv5UEln4PmR0Meyiqh5kJrBOjQHoZZmrlCx.jpg');

    $popup = new \App\Models\BroadcastPopup([
        'image_path' => 'uploads/popups/banner.jpg',
    ]);
    expect($popup->imageUrl())->toBe('/storage/uploads/popups/banner.jpg');
});
