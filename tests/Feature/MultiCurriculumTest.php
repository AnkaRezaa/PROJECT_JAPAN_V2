<?php

use App\Models\CurriculumTrack;
use App\Models\LevelPembelajaran;
use App\Models\Pengguna;
use App\Models\ProgramPembelajaran;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

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
        'title' => 'JLPT N4 Mingguan',
        'status' => 'draft',
        'sort_order' => 1,
    ])->assertSessionHasNoErrors();

    $this->actingAs($admin)->post(route('admin.programs.store'), [
        'curriculum_track_id' => $ssw->id,
        'level_id' => null,
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
        'title' => 'Kelas dengan Thumbnail',
        'status' => 'draft',
        'sort_order' => 1,
        'thumbnail_file' => UploadedFile::fake()->image('kelas.webp'),
    ])->assertSessionHasNoErrors();

    $program = ProgramPembelajaran::where('title', 'Kelas dengan Thumbnail')->firstOrFail();
    $thumbnailPath = ltrim(str_replace('/storage/', '', $program->thumbnail_url), '/');

    expect($thumbnailPath)->toStartWith('kelas-thumbnails/');
    Storage::disk('public')->assertExists($thumbnailPath);
});
