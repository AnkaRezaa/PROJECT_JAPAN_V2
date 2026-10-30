<?php

use App\Models\CurriculumTrack;
use App\Models\LevelPembelajaran;
use App\Models\Modul;
use App\Models\Pengguna;
use App\Models\ProgramPembelajaran;

it('allows global admin to store, update, and destroy programs', function () {
    $admin = Pengguna::factory()->create([
        'role' => 'admin',
        'admin_scope' => 'global',
    ]);

    $track = CurriculumTrack::create([
        'code' => 'crud-test',
        'name' => 'CRUD Track',
        'status' => 'active',
        'sort_order' => 1,
    ]);

    $level = LevelPembelajaran::create([
        'curriculum_track_id' => $track->id,
        'level_name' => 'Level 1',
        'stage' => 1,
    ]);

    // 1. Store
    $storeResponse = $this->actingAs($admin)->post(route('admin.programs.store'), [
        'curriculum_track_id' => $track->id,
        'level_id' => $level->id,
        'title' => 'Kelas Baru CRUD',
        'description' => 'Deskripsi kelas',
        'instructor_name' => 'Sensei Budi',
        'status' => 'published',
        'sort_order' => 1,
    ]);

    $storeResponse->assertRedirect()->assertSessionHas('success');
    $this->assertDatabaseHas('program_pembelajaran', [
        'title' => 'Kelas Baru CRUD',
        'curriculum_track_id' => $track->id,
        'level_id' => $level->id,
    ]);

    $program = ProgramPembelajaran::where('title', 'Kelas Baru CRUD')->firstOrFail();

    // 2. Update
    $updateResponse = $this->actingAs($admin)->put(route('admin.programs.update', $program->id), [
        'curriculum_track_id' => $track->id,
        'level_id' => $level->id,
        'title' => 'Kelas Baru Diperbarui',
        'description' => 'Deskripsi diperbarui',
        'instructor_name' => 'Sensei Budi',
        'status' => 'published',
        'sort_order' => 2,
    ]);

    $updateResponse->assertRedirect()->assertSessionHas('success');
    $this->assertDatabaseHas('program_pembelajaran', [
        'id' => $program->id,
        'title' => 'Kelas Baru Diperbarui',
        'sort_order' => 2,
    ]);

    // 3. Destroy blocked when has modules
    Modul::create([
        'program_pembelajaran_id' => $program->id,
        'level_id' => $level->id,
        'title' => 'Modul 1',
        'week_number' => 1,
        'status' => 'published',
    ]);

    $destroyBlocked = $this->actingAs($admin)->delete(route('admin.programs.destroy', $program->id));
    $destroyBlocked->assertRedirect()->assertSessionHas('error');
    $this->assertDatabaseHas('program_pembelajaran', ['id' => $program->id]);

    // 4. Destroy succeeds when modules are removed
    $program->modules()->delete();
    $destroyAllowed = $this->actingAs($admin)->delete(route('admin.programs.destroy', $program->id));
    $destroyAllowed->assertRedirect()->assertSessionHas('success');
    $this->assertDatabaseMissing('program_pembelajaran', ['id' => $program->id]);
});

it('blocks mentor from storing, updating, or destroying programs', function () {
    $mentor = Pengguna::factory()->create([
        'role' => 'admin',
        'admin_scope' => 'kloter',
    ]);

    $track = CurriculumTrack::create([
        'code' => 'mentor-block',
        'name' => 'Mentor Track',
        'status' => 'active',
        'sort_order' => 1,
    ]);

    $program = ProgramPembelajaran::create([
        'curriculum_track_id' => $track->id,
        'title' => 'Kelas Asli',
        'slug' => 'kelas-asli',
        'status' => 'published',
        'sort_order' => 1,
    ]);

    $this->actingAs($mentor)->post(route('admin.programs.store'), [
        'curriculum_track_id' => $track->id,
        'title' => 'Kelas Bajakan',
        'status' => 'draft',
        'sort_order' => 1,
    ])->assertForbidden();

    $this->actingAs($mentor)->put(route('admin.programs.update', $program->id), [
        'curriculum_track_id' => $track->id,
        'title' => 'Kelas Bajakan Update',
        'status' => 'draft',
        'sort_order' => 1,
    ])->assertForbidden();

    $this->actingAs($mentor)->delete(route('admin.programs.destroy', $program->id))->assertForbidden();
});
