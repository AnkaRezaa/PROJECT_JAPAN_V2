<?php

use App\Models\Exam;
use App\Models\ExamAttempt;
use App\Models\ExamSection;
use App\Models\ExamSession;
use App\Models\ExamVersion;
use App\Models\LevelPembelajaran;
use App\Models\Pengguna;
use Database\Seeders\PenggunaSeeder;
use Database\Seeders\StandaloneExamDemoSeeder;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;

function createPublishedStandaloneExam(Pengguna $admin, string $access = 'all'): array
{
    $level = LevelPembelajaran::firstOrCreate(['level_name' => 'N3'], ['stage' => 3]);
    $exam = Exam::create(['level_id' => $level->id, 'slug' => 'simulasi-n3-test', 'title' => 'Simulasi N3 Test', 'description' => 'Paket pengujian.', 'type' => 'simulation', 'access_type' => $access, 'status' => 'published', 'created_by' => $admin->id, 'updated_by' => $admin->id]);
    $version = ExamVersion::create(['exam_id' => $exam->id, 'version_number' => 1, 'status' => 'published', 'attempt_limit' => 2, 'result_release_policy' => 'immediate', 'review_policy' => 'wrong_only', 'ranking_policy' => 'first_attempt', 'estimated_total_pass_score' => 1, 'content_hash' => str_repeat('a', 64), 'published_at' => now(), 'published_by' => $admin->id]);
    $section = ExamSection::create(['exam_version_id' => $version->id, 'key' => 'vocabulary', 'title' => 'Kosakata', 'short_title' => 'Kosakata', 'sort_order' => 1, 'time_limit_seconds' => 1800, 'raw_max_points' => 1, 'estimated_max_score' => 60, 'estimated_pass_score' => 19]);
    $question = $section->questions()->create(['code' => 'N3-001', 'type' => 'multiple_choice', 'sort_order' => 1, 'points' => 1, 'question_text' => '受付の読み方は？', 'options' => ['うけつけ', 'うけづけ'], 'correct_answer' => 'うけつけ', 'content_hash' => str_repeat('b', 64)]);
    $session = ExamSession::create(['exam_version_id' => $version->id, 'name' => 'September 2026', 'starts_at' => now()->subMinute(), 'ends_at' => now()->addHour(), 'status' => 'active', 'ranking_enabled' => true, 'created_by' => $admin->id]);

    return compact('exam', 'version', 'section', 'question', 'session');
}

it('seeds the standalone exam demo idempotently', function () {
    $this->seed(PenggunaSeeder::class);
    $this->seed(StandaloneExamDemoSeeder::class);
    $this->seed(StandaloneExamDemoSeeder::class);

    $exam = Exam::query()->where('slug', StandaloneExamDemoSeeder::EXAM_SLUG)->firstOrFail();
    $version = $exam->publishedVersion()->with('sections.questions', 'sessions')->firstOrFail();

    expect(Exam::query()->where('slug', StandaloneExamDemoSeeder::EXAM_SLUG)->count())->toBe(1)
        ->and($exam->type)->toBe('simulation')
        ->and($exam->access_type)->toBe('all')
        ->and($version->sections)->toHaveCount(2)
        ->and($version->sections->sum(fn ($section) => $section->questions->count()))->toBe(10)
        ->and($version->sessions)->toHaveCount(1);
});

it('persists admin authoring and publishes an immutable exam version', function () {
    $admin = Pengguna::factory()->create(['role' => 'admin', 'admin_scope' => 'kloter']);
    $level = LevelPembelajaran::firstOrCreate(['level_name' => 'N3'], ['stage' => 3]);

    $this->actingAs($admin)->post(route('admin.exams.store'), ['title' => 'Latihan N3', 'description' => 'Latihan mandiri.', 'level_id' => $level->id, 'type' => 'practice', 'access_type' => 'all'])->assertRedirect();
    $exam = Exam::where('title', 'Latihan N3')->firstOrFail();
    $version = $exam->versions()->firstOrFail();

    $this->actingAs($admin)->putJson(route('admin.exam-versions.sections.sync', $version), ['sections' => [['key' => 'vocabulary', 'title' => 'Kosakata', 'short_title' => 'Kosakata', 'sort_order' => 1, 'time_limit_seconds' => 1200, 'estimated_max_score' => 100, 'estimated_pass_score' => 60]]])->assertOk();
    $section = $version->sections()->firstOrFail();
    $this->actingAs($admin)->putJson(route('admin.exam-sections.questions.sync', $section), ['questions' => [['code' => 'VOC-1', 'type' => 'multiple_choice', 'sort_order' => 1, 'points' => 1, 'question_text' => 'Arti 学校?', 'options' => ['Sekolah', 'Kantor'], 'correct_answer' => 'Sekolah']]])->assertOk();
    $this->actingAs($admin)->postJson(route('admin.exam-versions.publish', $version))->assertOk()->assertJsonPath('version.status', 'published');
    $this->actingAs($admin)->putJson(route('admin.exam-sections.questions.sync', $section), ['questions' => []])->assertStatus(409);
});

it('persists the selected ranking policy when an admin creates a simulation', function () {
    $admin = Pengguna::factory()->create(['role' => 'admin', 'admin_scope' => 'kloter']);
    $level = LevelPembelajaran::firstOrCreate(['level_name' => 'N3'], ['stage' => 3]);

    $this->actingAs($admin)->post(route('admin.exams.store'), [
        'title' => 'Simulasi Tanpa Ranking',
        'level_id' => $level->id,
        'type' => 'simulation',
        'access_type' => 'all',
        'ranking_policy' => 'disabled',
    ])->assertRedirect();

    expect(Exam::where('title', 'Simulasi Tanpa Ranking')->firstOrFail()
        ->versions()->firstOrFail()->ranking_policy)->toBe('disabled');
});

it('runs a server-authoritative standalone exam without changing xp', function () {
    $admin = Pengguna::factory()->create(['role' => 'admin']);
    $user = Pengguna::factory()->create(['role' => 'user', 'xp' => 25]);
    ['exam' => $exam, 'question' => $question, 'session' => $session] = createPublishedStandaloneExam($admin);
    $token = (string) Str::uuid();

    $this->actingAs($user)->postJson(route('user.exams.attempts.start', $exam), ['session_id' => $session->id, 'submission_token' => $token, 'mode' => 'full'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('agreement_accepted');

    $start = $this->actingAs($user)->postJson(route('user.exams.attempts.start', $exam), ['session_id' => $session->id, 'submission_token' => $token, 'mode' => 'full', 'agreement_accepted' => true])
        ->assertCreated()->assertJsonMissing(['correct_answer' => 'うけつけ']);
    expect($start->json('attempt.remaining_seconds'))->toBeInt();
    $attemptId = $start->json('attempt.id');
    $attempt = ExamAttempt::findOrFail($attemptId);

    $autosaveToken = (string) Str::uuid();
    $answerPayload = ['autosave_token' => $autosaveToken, 'client_revision' => 0, 'answers' => [['question_id' => $question->id, 'answer_text' => 'うけつけ', 'flagged' => false]]];
    $this->actingAs($user)->putJson(route('user.exam-attempts.answers', $attempt), $answerPayload)->assertOk()->assertJsonPath('server_revision', 1);
    $this->actingAs($user)->putJson(route('user.exam-attempts.answers', $attempt), $answerPayload)->assertOk()->assertJsonPath('server_revision', 1);
    $this->actingAs($user)->putJson(route('user.exam-attempts.answers', $attempt), [...$answerPayload, 'autosave_token' => (string) Str::uuid()])->assertStatus(409);
    $this->actingAs($user)->postJson(route('user.exam-attempts.submit', $attempt))->assertOk()->assertJsonPath('result.score', 60)->assertJsonPath('result.status', 'passed');

    expect($user->refresh()->xp)->toBe(25);
    expect($attempt->refresh()->ranking_eligible)->toBeTrue();
    $this->actingAs($user)->postJson(route('user.exam-attempts.submit', $attempt))->assertOk()->assertJsonPath('result.score', 60);
    $this->actingAs($admin)->getJson(route('admin.exam-sessions.results', $session))->assertOk()->assertJsonPath('pagination.total', 1);

    Cache::put('exam:ranking:'.$session->id, (object) ['legacy' => true], now()->addMinutes(2));
    $this->actingAs($user)->get(route('user.exams.ranking', ['session_id' => $session->id]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->has('ranking', 1));
    expect(Cache::get('exam:ranking:'.$session->id))->toBeArray();
});

it('uses database data in the portal and prevents attempt idor', function () {
    $admin = Pengguna::factory()->create(['role' => 'admin']);
    $owner = Pengguna::factory()->create(['role' => 'user']);
    $other = Pengguna::factory()->create(['role' => 'user']);
    ['exam' => $exam, 'session' => $session] = createPublishedStandaloneExam($admin);

    $this->actingAs($owner)->get(route('user.exams.library'))->assertOk()->assertInertia(fn (Assert $page) => $page->component('User/Ujian/Portal/Library')->where('is_prototype', false)->has('exam_packages', 1));
    $response = $this->actingAs($owner)->postJson(route('user.exams.attempts.start', $exam), ['session_id' => $session->id, 'submission_token' => (string) Str::uuid(), 'mode' => 'full', 'agreement_accepted' => true])->assertCreated();
    $attempt = ExamAttempt::findOrFail($response->json('attempt.id'));
    $this->actingAs($other)->getJson(route('user.exam-attempts.show', $attempt))->assertNotFound();
});
