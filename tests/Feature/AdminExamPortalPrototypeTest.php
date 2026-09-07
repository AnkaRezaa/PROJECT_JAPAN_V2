<?php

use App\Models\Exam;
use App\Models\ExamVersion;
use App\Models\LevelPembelajaran;
use App\Models\Pengguna;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->admin = Pengguna::factory()->create([
        'role' => 'admin',
        'status' => 'active',
        'email_verified_at' => now(),
    ]);

    $level = LevelPembelajaran::firstOrCreate(['level_name' => 'N3'], ['stage' => 3]);
    $this->exam = Exam::create([
        'level_id' => $level->id,
        'slug' => 'simulasi-jlpt-n3-september-2026',
        'title' => 'Simulasi JLPT N3 September 2026',
        'type' => 'simulation',
        'access_type' => 'all',
        'status' => 'draft',
        'created_by' => $this->admin->id,
        'updated_by' => $this->admin->id,
    ]);
    ExamVersion::create([
        'exam_id' => $this->exam->id,
        'version_number' => 1,
        'status' => 'draft',
    ]);
});

it('renders the admin exam management pages', function (string $routeName, string $component) {
    $this->actingAs($this->admin)
        ->get(route($routeName))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component($component)
            ->where('is_prototype', false)
            ->has('exam_packages', 1)
            ->has('sessions', 0)
            ->has('results', 0));
})->with([
    ['admin.exams.index', 'Admin/Ujian/Index'],
    ['admin.exams.create', 'Admin/Ujian/Editor'],
    ['admin.exams.sessions', 'Admin/Ujian/Sessions'],
    ['admin.exams.results', 'Admin/Ujian/Results'],
]);

it('renders known edit and preview pages and rejects unknown exams', function () {
    $slug = 'simulasi-jlpt-n3-september-2026';

    $this->actingAs($this->admin)
        ->get(route('admin.exams.edit', $slug))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Ujian/Editor')
            ->where('mode', 'edit')
            ->where('exam.slug', $slug));

    $this->actingAs($this->admin)
        ->get(route('admin.exams.preview', $slug))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Ujian/Preview')
            ->where('exam.slug', $slug));

    $this->actingAs($this->admin)
        ->get(route('admin.exams.edit', 'tidak-ada'))
        ->assertNotFound();
});

it('does not expose admin exam management to regular users', function () {
    $user = Pengguna::factory()->create([
        'role' => 'user',
        'status' => 'active',
        'email_verified_at' => now(),
    ]);

    $this->actingAs($user)
        ->get(route('admin.exams.index'))
        ->assertForbidden();
});
