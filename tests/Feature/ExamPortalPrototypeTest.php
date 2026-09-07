<?php

use App\Models\Exam;
use App\Models\ExamVersion;
use App\Models\LevelPembelajaran;
use App\Models\Pengguna;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->user = Pengguna::factory()->create([
        'role' => 'user',
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
        'status' => 'published',
    ]);
    ExamVersion::create([
        'exam_id' => $this->exam->id,
        'version_number' => 1,
        'status' => 'published',
        'content_hash' => str_repeat('a', 64),
        'published_at' => now(),
    ]);
});

it('renders every exam portal page for a user', function (string $routeName, string $component) {
    $this->actingAs($this->user)
        ->get(route($routeName))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component($component)
            ->where('is_prototype', false)
            ->has('active_exam')
            ->has('exam_packages', 1)
            ->has('ranking', 0)
            ->has('history', 0));
})->with([
    ['user.exams.index', 'User/Ujian/Portal/Index'],
    ['user.exams.library', 'User/Ujian/Portal/Library'],
    ['user.exams.ranking', 'User/Ujian/Portal/Ranking'],
    ['user.exams.history', 'User/Ujian/Portal/History'],
]);

it('renders a known exam detail and rejects an unknown slug', function () {
    $this->actingAs($this->user)
        ->get(route('user.exams.show', 'simulasi-jlpt-n3-september-2026'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('User/Ujian/Portal/Show')
            ->where('exam.type', 'simulation')
            ->where('exam.level', 'N3'));

    $this->actingAs($this->user)
        ->get(route('user.exams.show', 'ujian-tidak-ada'))
        ->assertNotFound();
});
