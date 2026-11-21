<?php

use App\Models\Exam;
use App\Models\ExamAttempt;
use App\Models\ExamVersion;
use App\Models\LevelPembelajaran;
use App\Models\Pengguna;
use Illuminate\Support\Str;
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
    ['admin.exams.create', 'Admin/Ujian/BuilderUjian'],
    ['admin.exams.sessions', 'Admin/Ujian/Sessions'],
    ['admin.exams.results', 'Admin/Ujian/Results'],
]);

it('renders known edit and preview pages and rejects unknown exams', function () {
    $slug = 'simulasi-jlpt-n3-september-2026';

    $this->actingAs($this->admin)
        ->get(route('admin.exams.edit', $slug))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Ujian/BuilderUjian')
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

it('counts only submitted and timed-out attempts on admin exam packages', function () {
    $version = $this->exam->versions()->firstOrFail();
    $session = $version->sessions()->create(['name' => 'Sesi audit', 'status' => 'active']);
    $student = Pengguna::factory()->create(['role' => 'user']);

    foreach (['submitted', 'timed_out', 'in_progress', 'invalidated'] as $index => $status) {
        ExamAttempt::create([
            'exam_session_id' => $session->id,
            'exam_version_id' => $version->id,
            'user_id' => $student->id,
            'submission_token' => (string) Str::uuid(),
            'attempt_number' => $index + 1,
            'status' => $status,
            'started_at' => now()->subMinute(),
            'deadline_at' => now()->addMinutes(10),
            'submitted_at' => $status === 'in_progress' ? null : now(),
        ]);
    }

    $this->actingAs($this->admin)->get(route('admin.exams.index'))
        ->assertInertia(fn (Assert $page) => $page->where('exam_packages.0.attempt_count', 2));
    $this->get(route('admin.exams.sessions'))
        ->assertInertia(fn (Assert $page) => $page->where('sessions.0.participants', 4));
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
