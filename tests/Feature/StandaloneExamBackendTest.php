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

it('defaults exams created by legacy code to the jlpt category', function () {
    $admin = Pengguna::factory()->create(['role' => 'admin', 'admin_scope' => 'global']);
    ['exam' => $exam] = createPublishedStandaloneExam($admin);
    expect($exam->fresh()->category)->toBe('jlpt')
        ->and($exam->fresh()->ssw_field)->toBeNull();
});

it('preserves published exam identity and prevents status-only publication', function () {
    $admin = Pengguna::factory()->create(['role' => 'admin', 'admin_scope' => 'global']);
    ['exam' => $exam] = createPublishedStandaloneExam($admin);
    $newLevel = LevelPembelajaran::firstOrCreate(['level_name' => 'N2'], ['stage' => 2]);
    $this->actingAs($admin)->patchJson(route('admin.exams.update', $exam), ['type' => 'practice'])->assertUnprocessable();
    $this->actingAs($admin)->patchJson(route('admin.exams.update', $exam), ['level_id' => $newLevel->id])->assertUnprocessable();
    $this->actingAs($admin)->patch(route('admin.exams.update', $exam), ['title' => 'Judul diperbarui', 'type' => 'simulation', 'level_id' => $exam->level_id])->assertRedirect();
    expect($exam->fresh()->title)->toBe('Judul diperbarui')->and($exam->fresh()->type)->toBe('simulation');

    $this->actingAs($admin)->post(route('admin.exams.store'), ['title' => 'Draft saja', 'level_id' => $newLevel->id, 'type' => 'practice', 'access_type' => 'all'])->assertRedirect();
    $draft = Exam::where('title', 'Draft saja')->firstOrFail();
    $this->actingAs($admin)->patchJson(route('admin.exams.update', $draft), ['status' => 'published'])->assertUnprocessable();
    expect($draft->fresh()->status)->toBe('draft');
});

it('creates a non jlpt draft without a jlpt level and keeps the category on edit', function () {
    $admin = Pengguna::factory()->create(['role' => 'admin', 'admin_scope' => 'global']);
    $this->actingAs($admin)->post(route('admin.exams.store'), [
        'title' => 'JFT latihan', 'category' => 'jft_basic', 'level_id' => null,
        'type' => 'practice', 'access_type' => 'all',
    ])->assertRedirect();
    $exam = Exam::where('title', 'JFT latihan')->firstOrFail();
    expect($exam->category)->toBe('jft_basic')->and($exam->level_id)->toBeNull();
    expect($exam->versions()->firstOrFail()->total_time_limit_seconds)->toBe(3600);
    $this->actingAs($admin)->get(route('admin.exams.edit', $exam))->assertInertia(fn (Assert $page) => $page
        ->where('exam_packages.0.category', 'jft_basic')->where('exam_packages.0.level', null));
    $this->actingAs($admin)->patch(route('admin.exams.update', $exam), ['title' => 'JFT revisi', 'level_id' => null])->assertRedirect();
    expect($exam->fresh()->category)->toBe('jft_basic');
    $this->actingAs($admin)->postJson(route('admin.exam-versions.publish', $exam->versions()->firstOrFail()))
        ->assertUnprocessable()->assertJsonValidationErrors('version');
    expect($exam->fresh()->status)->toBe('draft');
});

it('validates section keys against the exam category', function () {
    $admin = Pengguna::factory()->create(['role' => 'admin', 'admin_scope' => 'global']);
    ['exam' => $exam, 'version' => $version] = createPublishedStandaloneExam($admin);
    $version->update(['status' => 'draft']);
    $section = ['key' => 'conversation', 'title' => 'Percakapan', 'short_title' => 'Percakapan', 'sort_order' => 1, 'time_limit_seconds' => 900, 'estimated_max_score' => 50, 'estimated_pass_score' => 0];

    $this->actingAs($admin)->putJson(route('admin.exam-versions.sections.sync', $version), ['sections' => [$section]])->assertUnprocessable();
    $exam->update(['category' => 'jft_basic', 'level_id' => null]);
    $this->actingAs($admin)->putJson(route('admin.exam-versions.sections.sync', $version), ['sections' => [$section]])->assertOk();
    $exam->update(['category' => 'ssw', 'ssw_field' => 'Perawatan']);
    $section['key'] = 'practical_skill';
    $this->actingAs($admin)->putJson(route('admin.exam-versions.sections.sync', $version), ['sections' => [$section]])->assertOk();
    $section['key'] = str_repeat('a', 41);
    $this->actingAs($admin)->putJson(route('admin.exam-versions.sections.sync', $version), ['sections' => [$section]])->assertUnprocessable();
});

it('runs a configurable ssw exam from authoring to released result', function () {
    $admin = Pengguna::factory()->create(['role' => 'admin', 'admin_scope' => 'global']);
    $student = Pengguna::factory()->create(['role' => 'user', 'xp' => 25]);
    $this->actingAs($admin)->post(route('admin.exams.store'), [
        'title' => 'Ujian bidang uji', 'category' => 'ssw', 'ssw_field' => 'Bidang uji',
        'type' => 'simulation', 'access_type' => 'all', 'estimated_total_pass_score' => 60,
        'result_release_policy' => 'immediate', 'ranking_policy' => 'first_attempt',
    ])->assertRedirect();
    $exam = Exam::where('title', 'Ujian bidang uji')->firstOrFail();
    $version = $exam->versions()->firstOrFail();
    $this->actingAs($admin)->putJson(route('admin.exam-versions.sections.sync', $version), ['sections' => [[
        'key' => 'technical_skill', 'title' => 'Kemampuan teknis', 'sort_order' => 1,
        'time_limit_seconds' => 1200, 'estimated_max_score' => 100, 'estimated_pass_score' => 60,
    ]]])->assertOk();
    $section = $version->sections()->firstOrFail();
    $this->actingAs($admin)->putJson(route('admin.exam-sections.questions.sync', $section), ['questions' => [[
        'type' => 'multiple_choice', 'sort_order' => 1, 'points' => 1,
        'question_text' => 'Pertanyaan uji', 'options' => ['A', 'B'], 'correct_answer' => 'A',
    ]]])->assertOk();
    $question = $section->questions()->firstOrFail();
    $this->actingAs($admin)->postJson(route('admin.exam-versions.publish', $version))->assertOk();
    $session = $this->actingAs($admin)->postJson(route('admin.exam-versions.sessions.store', $version), [
        'name' => 'Sesi uji', 'status' => 'active', 'starts_at' => now()->subMinute()->toDateTimeString(),
        'ends_at' => now()->addHour()->toDateTimeString(), 'ranking_enabled' => true,
    ])->assertCreated()->json('session.id');
    $this->actingAs($student)->get(route('user.exams.library'))->assertInertia(fn (Assert $page) => $page
        ->where('exam_packages.0.category', 'ssw')->where('exam_packages.0.ssw_field', 'Bidang uji'));
    $attemptId = $this->actingAs($student)->postJson(route('user.exams.attempts.start', $exam), [
        'session_id' => $session, 'submission_token' => (string) Str::uuid(), 'mode' => 'full', 'agreement_accepted' => true,
    ])->assertCreated()->json('attempt.id');
    $this->actingAs($student)->putJson(route('user.exam-attempts.answers', $attemptId), [
        'autosave_token' => (string) Str::uuid(), 'client_revision' => 0, 'answers' => [['question_id' => $question->id, 'answer_text' => 'A']],
    ])->assertOk();
    $this->actingAs($student)->postJson(route('user.exam-attempts.submit', $attemptId))->assertOk()
        ->assertJsonPath('result.status', 'passed')->assertJsonPath('result.score', 100);
    $this->actingAs($student)->get(route('user.exams.history', ['session_id' => $session]))->assertInertia(fn (Assert $page) => $page
        ->where('history.0.category', 'ssw')->where('history.0.sections.0.title', 'Kemampuan teknis')
        ->where('history.0.sections.0.max_score', 100)->has('ranking', 1));
    expect($student->fresh()->xp)->toBe(25);
});

it('runs a jft simulation through all sections with sequential listening', function () {
    $admin = Pengguna::factory()->create(['role' => 'admin', 'admin_scope' => 'global']);
    $student = Pengguna::factory()->create(['role' => 'user']);
    $this->actingAs($admin)->post(route('admin.exams.store'), [
        'title' => 'JFT uji', 'category' => 'jft_basic', 'type' => 'simulation', 'access_type' => 'all',
        'estimated_total_pass_score' => 120, 'result_release_policy' => 'immediate', 'ranking_policy' => 'first_attempt',
    ])->assertRedirect();
    $exam = Exam::where('title', 'JFT uji')->firstOrFail();
    $version = $exam->versions()->firstOrFail();
    $keys = ['vocabulary', 'conversation', 'listening', 'reading'];
    $sections = [];
    foreach ($keys as $index => $key) {
        $sections[] = ['key' => $key, 'title' => ucfirst($key), 'sort_order' => $index + 1, 'time_limit_seconds' => 900, 'estimated_max_score' => 50, 'estimated_pass_score' => 0];
    }
    $this->actingAs($admin)->putJson(route('admin.exam-versions.sections.sync', $version), ['sections' => $sections])->assertOk();
    $ids = [];
    foreach ($version->sections()->orderBy('sort_order')->get() as $section) {
        $items = [];
        foreach (range(1, $section->key === 'listening' ? 2 : 1) as $index) {
            $items[] = ['type' => $section->key === 'listening' ? 'listening' : 'multiple_choice', 'sort_order' => $index, 'points' => 1,
                'question_text' => 'Pertanyaan uji '.$section->key.$index, 'options' => ['A', 'B'], 'correct_answer' => 'A',
                'audio_path' => $section->key === 'listening' ? '/test-audio.mp3' : null];
        }
        $this->actingAs($admin)->putJson(route('admin.exam-sections.questions.sync', $section), ['questions' => $items])->assertOk();
        $ids = [...$ids, ...$section->questions()->orderBy('sort_order')->pluck('id')->all()];
    }
    $this->actingAs($admin)->postJson(route('admin.exam-versions.publish', $version))->assertOk();
    $sessionId = $this->actingAs($admin)->postJson(route('admin.exam-versions.sessions.store', $version), [
        'name' => 'Sesi uji', 'status' => 'active', 'starts_at' => now()->subMinute()->toDateTimeString(),
        'ends_at' => now()->addHours(2)->toDateTimeString(), 'ranking_enabled' => true,
    ])->assertCreated()->json('session.id');
    $start = $this->actingAs($student)->postJson(route('user.exams.attempts.start', $exam), [
        'session_id' => $sessionId, 'submission_token' => (string) Str::uuid(), 'mode' => 'full', 'agreement_accepted' => true,
    ])->assertCreated()->assertJsonPath('attempt.exam.category', 'jft_basic');
    expect($start->json('attempt.remaining_seconds'))->toBeGreaterThan(3500);
    $attemptId = $start->json('attempt.id');
    $revision = 0;
    foreach ($ids as $index => $id) {
        $this->actingAs($student)->getJson(route('user.exam-attempts.show', $attemptId))->assertOk()
            ->assertJsonPath('attempt.sections.0.questions.0.id', $id);
        $this->actingAs($student)->putJson(route('user.exam-attempts.answers', $attemptId), [
            'autosave_token' => (string) Str::uuid(), 'client_revision' => $revision, 'answers' => [['question_id' => $id, 'answer_text' => 'A']],
        ])->assertOk()->assertJsonPath('server_revision', ++$revision);
        if ($index < count($ids) - 1) {
            $this->actingAs($student)->postJson(route('user.exam-attempts.advance', $attemptId), ['client_revision' => $revision])->assertOk()
                ->assertJsonPath('attempt.server_revision', ++$revision);
        }
    }
    $this->actingAs($student)->postJson(route('user.exam-attempts.submit', $attemptId))->assertOk()
        ->assertJsonPath('result.status', 'passed')->assertJsonPath('result.score', 200)->assertJsonCount(4, 'result.sections');
    $this->actingAs($student)->get(route('user.exams.history', ['session_id' => $sessionId]))->assertInertia(fn (Assert $page) => $page
        ->where('history.0.category', 'jft_basic')->where('history.0.score', 200)->has('ranking', 1));
});

it('uses the configured total threshold without a sectional threshold for jft simulations', function () {
    $admin = Pengguna::factory()->create(['role' => 'admin']);
    $user = Pengguna::factory()->create(['role' => 'user']);
    ['exam' => $exam, 'version' => $version, 'section' => $section, 'question' => $question, 'session' => $session] = createPublishedStandaloneExam($admin);
    $exam->update(['category' => 'jft_basic', 'level_id' => null]);
    $version->update(['estimated_total_pass_score' => 30, 'total_time_limit_seconds' => 3600]);
    $section->update(['raw_max_points' => 2, 'estimated_pass_score' => 50]);
    $start = $this->actingAs($user)->postJson(route('user.exams.attempts.start', $exam), ['session_id' => $session->id, 'submission_token' => (string) Str::uuid(), 'mode' => 'full', 'agreement_accepted' => true])->assertCreated();
    $attempt = ExamAttempt::findOrFail($start->json('attempt.id'));
    $this->actingAs($user)->putJson(route('user.exam-attempts.answers', $attempt), ['autosave_token' => (string) Str::uuid(), 'client_revision' => 0, 'answers' => [['question_id' => $question->id, 'answer_text' => $question->correct_answer]]])->assertOk();
    $this->actingAs($user)->postJson(route('user.exam-attempts.submit', $attempt))->assertOk()->assertJsonPath('result.score', 30)->assertJsonPath('result.status', 'passed');
});

it('grades a sentence builder using the text submitted by the exam runner', function () {
    $admin = Pengguna::factory()->create(['role' => 'admin']);
    $user = Pengguna::factory()->create(['role' => 'user']);
    ['exam' => $exam, 'question' => $question, 'session' => $session] = createPublishedStandaloneExam($admin);
    $question->update(['type' => 'sentence_builder', 'options' => ['one', 'two'], 'correct_answer' => 'onetwo']);
    $attemptId = $this->actingAs($user)->postJson(route('user.exams.attempts.start', $exam), [
        'session_id' => $session->id, 'submission_token' => (string) Str::uuid(), 'mode' => 'full', 'agreement_accepted' => true,
    ])->assertCreated()->json('attempt.id');
    $this->actingAs($user)->putJson(route('user.exam-attempts.answers', $attemptId), [
        'autosave_token' => (string) Str::uuid(), 'client_revision' => 0, 'answers' => [['question_id' => $question->id, 'answer_text' => 'onetwo', 'answer_payload' => ['option_indexes' => [0, 1]]]],
    ])->assertOk();
    $this->actingAs($user)->getJson(route('user.exam-attempts.show', $attemptId))->assertOk()
        ->assertJsonPath('attempt.sections.0.questions.0.answer.answer_payload.option_indexes', [0, 1]);
    $this->actingAs($user)->postJson(route('user.exam-attempts.submit', $attemptId))->assertOk()->assertJsonPath('result.score', 60);
    expect(ExamAttempt::findOrFail($attemptId)->answers()->firstOrFail()->is_correct)->toBeTrue();
});

it('includes unanswered questions in review without counting flags as answers', function () {
    $admin = Pengguna::factory()->create(['role' => 'admin']);
    $user = Pengguna::factory()->create(['role' => 'user']);
    ['exam' => $exam, 'section' => $section, 'question' => $question, 'session' => $session] = createPublishedStandaloneExam($admin);
    $question->update(['correct_answer' => 'A', 'options' => ['A', 'B']]);
    foreach ([2, 3] as $index) {
        $section->questions()->create(['type' => 'multiple_choice', 'sort_order' => $index, 'points' => 1,
            'question_text' => 'Soal uji '.$index, 'options' => ['A', 'B'], 'correct_answer' => 'A', 'content_hash' => str_repeat('c', 64)]);
    }
    $section->update(['raw_max_points' => 3]);
    $flagged = $section->questions()->where('sort_order', 2)->firstOrFail();
    $id = $this->actingAs($user)->postJson(route('user.exams.attempts.start', $exam), ['session_id' => $session->id,
        'submission_token' => (string) Str::uuid(), 'mode' => 'full', 'agreement_accepted' => true])->assertCreated()->json('attempt.id');
    $this->actingAs($user)->putJson(route('user.exam-attempts.answers', $id), ['autosave_token' => (string) Str::uuid(), 'client_revision' => 0,
        'answers' => [['question_id' => $question->id, 'answer_text' => 'A'], ['question_id' => $flagged->id, 'flagged' => true]]])->assertOk();
    $this->actingAs($user)->postJson(route('user.exam-attempts.submit', $id))->assertOk()
        ->assertJsonPath('result.question_count', 3)->assertJsonPath('result.sections.0.answered_count', 1)
        ->assertJsonCount(2, 'result.review')->assertJsonPath('result.review.0.answer_text', null)
        ->assertJsonPath('result.review.1.answer_text', null);
});

it('accepts large attempts as revision-ordered batches of at most 100 answers', function () {
    $admin = Pengguna::factory()->create(['role' => 'admin']);
    $user = Pengguna::factory()->create(['role' => 'user']);
    ['exam' => $exam, 'section' => $section, 'session' => $session] = createPublishedStandaloneExam($admin);
    $rows = [];
    foreach (range(2, 105) as $index) {
        $rows[] = ['exam_section_id' => $section->id, 'type' => 'typing', 'sort_order' => $index, 'points' => 1,
            'question_text' => 'Pertanyaan uji '.$index, 'correct_answer' => 'A', 'content_hash' => str_repeat('c', 64), 'created_at' => now(), 'updated_at' => now()];
    }
    \App\Models\ExamVersionQuestion::insert($rows);
    $ids = $section->questions()->orderBy('sort_order')->pluck('id')->all();
    $attemptId = $this->actingAs($user)->postJson(route('user.exams.attempts.start', $exam), [
        'session_id' => $session->id, 'submission_token' => (string) Str::uuid(), 'mode' => 'full', 'agreement_accepted' => true,
    ])->assertCreated()->json('attempt.id');
    $answers = array_map(fn ($id) => ['question_id' => $id, 'answer_text' => 'A'], $ids);
    $this->actingAs($user)->putJson(route('user.exam-attempts.answers', $attemptId), ['autosave_token' => (string) Str::uuid(), 'client_revision' => 0, 'answers' => $answers])->assertUnprocessable();
    $this->actingAs($user)->putJson(route('user.exam-attempts.answers', $attemptId), ['autosave_token' => (string) Str::uuid(), 'client_revision' => 0, 'answers' => array_slice($answers, 0, 100)])->assertOk()->assertJsonPath('server_revision', 1);
    $this->actingAs($user)->putJson(route('user.exam-attempts.answers', $attemptId), ['autosave_token' => (string) Str::uuid(), 'client_revision' => 1, 'answers' => array_slice($answers, 100)])->assertOk()->assertJsonPath('server_revision', 2);
    expect(ExamAttempt::findOrFail($attemptId)->answers()->count())->toBe(105);
});

it('accepts a jft estimated total above the jlpt limit on draft updates', function () {
    $admin = Pengguna::factory()->create(['role' => 'admin', 'admin_scope' => 'global']);
    ['exam' => $exam, 'version' => $version] = createPublishedStandaloneExam($admin);
    $version->update(['status' => 'draft']);
    $payload = ['result_release_policy' => 'manual', 'review_policy' => 'none', 'ranking_policy' => 'disabled', 'estimated_total_pass_score' => 200];
    $this->actingAs($admin)->patchJson(route('admin.exam-versions.update', $version), $payload)->assertUnprocessable();
    $exam->update(['category' => 'jft_basic', 'level_id' => null]);
    $this->actingAs($admin)->patchJson(route('admin.exam-versions.update', $version), $payload)->assertOk();
    expect($version->fresh()->estimated_total_pass_score)->toBe(200);
});

it('persists admin authoring and publishes an immutable exam version', function () {
    $admin = Pengguna::factory()->create(['role' => 'admin', 'admin_scope' => 'global']);
    $level = LevelPembelajaran::firstOrCreate(['level_name' => 'N3'], ['stage' => 3]);

    $this->actingAs($admin)->post(route('admin.exams.store'), ['title' => 'Latihan N3', 'description' => 'Latihan mandiri.', 'level_id' => $level->id, 'type' => 'practice', 'access_type' => 'all'])->assertRedirect();
    $exam = Exam::where('title', 'Latihan N3')->firstOrFail();
    $version = $exam->versions()->firstOrFail();

    $this->actingAs($admin)->putJson(route('admin.exam-versions.sections.sync', $version), ['sections' => [['key' => 'vocabulary', 'title' => 'Kosakata', 'short_title' => 'Kosakata', 'sort_order' => 1, 'time_limit_seconds' => 1200, 'estimated_max_score' => 100, 'estimated_pass_score' => 60]]])->assertOk();
    $section = $version->sections()->firstOrFail();
    $this->actingAs($admin)->putJson(route('admin.exam-sections.questions.sync', $section), ['questions' => [['code' => 'VOC-1', 'type' => 'multiple_choice', 'sort_order' => 1, 'points' => 1, 'question_text' => 'Arti 学校?', 'options' => ['Sekolah', 'Kantor'], 'correct_answer' => 'Sekolah']]])->assertOk();
    $this->actingAs($admin)->postJson(route('admin.exam-versions.publish', $version))->assertOk()->assertJsonPath('version.status', 'published');
    $this->actingAs($admin)->putJson(route('admin.exam-sections.questions.sync', $section), ['questions' => []])->assertStatus(409);
    $this->actingAs($admin)->putJson(route('admin.exam-versions.sections.sync', $version), ['sections' => [['key' => 'vocabulary', 'title' => 'Kosakata', 'sort_order' => 1, 'time_limit_seconds' => 1200, 'estimated_max_score' => 100, 'estimated_pass_score' => 60]]])->assertStatus(409);
    $this->actingAs($admin)->patchJson(route('admin.exam-versions.update', $version), ['result_release_policy' => 'immediate', 'review_policy' => 'full', 'ranking_policy' => 'disabled'])->assertStatus(409);
});

it('reports invalid jft structure before publication', function () {
    $admin = Pengguna::factory()->create(['role' => 'admin', 'admin_scope' => 'global']);
    ['exam' => $exam, 'version' => $version] = createPublishedStandaloneExam($admin);
    $exam->update(['category' => 'jft_basic', 'level_id' => null]);
    $version->update(['status' => 'draft', 'total_time_limit_seconds' => 1800]);
    $response = app(\App\Services\ExamAuthoringService::class)->readiness($version);
    expect($response['valid'])->toBeFalse()
        ->and(implode(' ', $response['errors']))->toContain('memerlukan bagian')->toContain('60 menit');
});

it('imports category-specific sections only into empty drafts without overwriting data', function (string $category, string $key) {
    $admin = Pengguna::factory()->create(['role' => 'admin']);
    ['exam' => $exam, 'version' => $version] = createPublishedStandaloneExam($admin);
    $version->update(['status' => 'draft']);
    $version->sections()->delete();
    $exam->update(['category' => $category, 'level_id' => null, 'ssw_field' => $category === 'ssw' ? 'Perawatan' : null]);
    $path = app(\App\Services\TemplateExcelService::class)->xlsxWorkbookPath([
        'Bagian' => ['headers' => ['section_key', 'judul', 'judul_singkat', 'urutan', 'durasi_menit', 'skor_maksimal', 'batas_lulus'], 'rows' => [[$key, 'Bagian', 'Bagian', 1, 15, 50, 0]]],
        'Soal' => ['headers' => ['section_key', 'kode', 'urutan', 'tipe', 'pertanyaan', 'opsi', 'jawaban_benar', 'bobot'], 'rows' => [[$key, 'C1', 1, 'multiple_choice', 'Pertanyaan uji', 'A|B', 'A', 1]]],
    ], 'exam-test-');
    try {
        $file = new \Illuminate\Http\UploadedFile($path, 'test.xlsx', null, null, true);
        $import = app(\App\Services\ExamImportService::class);
        expect($import->preview($version, $file)['valid'])->toBeTrue();
        $import->commit($version, $file);
        expect($version->sections()->where('key', $key)->firstOrFail()->questions()->count())->toBe(1)
            ->and($import->preview($version, $file)['valid'])->toBeFalse();
        expect(fn () => $import->commit($version, $file))->toThrow(\Illuminate\Validation\ValidationException::class);
        expect($version->sections()->firstOrFail()->questions()->count())->toBe(1);
    } finally {
        unlink($path);
    }
})->with([['jft_basic', 'conversation'], ['ssw', 'technical_skill']]);

it('persists the selected ranking policy when an admin creates a simulation', function () {
    $admin = Pengguna::factory()->create(['role' => 'admin', 'admin_scope' => 'global']);
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

it('rejects starting archived exams and finalizes attempts after their deadline', function () {
    $admin = Pengguna::factory()->create(['role' => 'admin']);
    $user = Pengguna::factory()->create(['role' => 'user']);
    ['exam' => $exam, 'session' => $session] = createPublishedStandaloneExam($admin);
    $payload = ['session_id' => $session->id, 'submission_token' => (string) Str::uuid(), 'mode' => 'full', 'agreement_accepted' => true];
    $exam->update(['status' => 'archived']);
    $this->actingAs($user)->postJson(route('user.exams.attempts.start', $exam), $payload)->assertForbidden();
    $exam->update(['status' => 'published']);
    $id = $this->actingAs($user)->postJson(route('user.exams.attempts.start', $exam), $payload)->assertCreated()->json('attempt.id');
    $attempt = ExamAttempt::findOrFail($id);
    $attempt->update(['deadline_at' => now()->subSecond()]);
    $this->artisan('exams:finalize-expired', ['--limit' => 10])->assertSuccessful();
    expect($attempt->fresh()->status)->toBe('timed_out')->and($attempt->fresh()->submitted_by)->toBe('timeout');
    $this->artisan('exams:finalize-expired', ['--limit' => 10])->assertSuccessful();
    expect($attempt->fresh()->status)->toBe('timed_out');
});

it('recovers an existing attempt by token after a session closes without allowing a new one', function () {
    $admin = Pengguna::factory()->create(['role' => 'admin']);
    $owner = Pengguna::factory()->create(['role' => 'user']);
    $other = Pengguna::factory()->create(['role' => 'user']);
    ['exam' => $exam, 'session' => $session] = createPublishedStandaloneExam($admin);
    $payload = ['session_id' => $session->id, 'submission_token' => (string) Str::uuid(), 'mode' => 'full', 'agreement_accepted' => true];
    $id = $this->actingAs($owner)->postJson(route('user.exams.attempts.start', $exam), $payload)->assertCreated()->json('attempt.id');
    $this->actingAs($owner)->postJson(route('user.exam-attempts.submit', $id))->assertOk();
    $session->update(['status' => 'closed']);
    $this->actingAs($owner)->postJson(route('user.exams.attempts.start', $exam), $payload)->assertCreated()
        ->assertJsonPath('attempt.id', $id)->assertJsonPath('attempt.status', 'submitted');
    $this->actingAs($other)->postJson(route('user.exams.attempts.start', $exam), $payload)->assertStatus(409);
    $this->actingAs($owner)->postJson(route('user.exams.attempts.start', $exam), [...$payload, 'submission_token' => (string) Str::uuid()])->assertForbidden();
    expect(ExamAttempt::where('exam_session_id', $session->id)->count())->toBe(1);
});

it('keeps jft navigation on the server and restricts answers to the active section', function () {
    $admin = Pengguna::factory()->create(['role' => 'admin']);
    $user = Pengguna::factory()->create(['role' => 'user']);
    $other = Pengguna::factory()->create(['role' => 'user']);
    ['exam' => $exam, 'version' => $version, 'section' => $section, 'question' => $question, 'session' => $session] = createPublishedStandaloneExam($admin);
    $exam->update(['category' => 'jft_basic', 'level_id' => null]);
    $version->update(['total_time_limit_seconds' => 3600]);
    $listening = $version->sections()->create(['key' => 'listening', 'title' => 'Listening', 'short_title' => 'Listening', 'sort_order' => 2, 'time_limit_seconds' => 600, 'raw_max_points' => 2, 'estimated_max_score' => 60, 'estimated_pass_score' => 0]);
    $first = $listening->questions()->create(['code' => 'L1', 'type' => 'multiple_choice', 'sort_order' => 1, 'points' => 1, 'question_text' => 'Question one', 'options' => ['A', 'B'], 'correct_answer' => 'A', 'content_hash' => str_repeat('c', 64)]);
    $second = $listening->questions()->create(['code' => 'L2', 'type' => 'multiple_choice', 'sort_order' => 2, 'points' => 1, 'question_text' => 'Question two', 'options' => ['A', 'B'], 'correct_answer' => 'A', 'content_hash' => str_repeat('d', 64)]);

    $start = $this->actingAs($user)->postJson(route('user.exams.attempts.start', $exam), ['session_id' => $session->id, 'submission_token' => (string) Str::uuid(), 'mode' => 'full', 'agreement_accepted' => true])->assertCreated()
        ->assertJsonPath('attempt.exam.category', 'jft_basic')->assertJsonCount(1, 'attempt.sections');
    $attempt = ExamAttempt::findOrFail($start->json('attempt.id'));
    $this->actingAs($other)->postJson(route('user.exam-attempts.advance', $attempt), ['client_revision' => 0])->assertNotFound();
    $this->actingAs($user)->putJson(route('user.exam-attempts.answers', $attempt), ['autosave_token' => (string) Str::uuid(), 'client_revision' => 0, 'answers' => [['question_id' => $first->id, 'answer_text' => 'A']]])->assertUnprocessable();
    $this->actingAs($user)->postJson(route('user.exam-attempts.advance', $attempt), ['client_revision' => 0])->assertOk()
        ->assertJsonPath('attempt.navigation.section_index', 1)->assertJsonPath('attempt.sections.0.questions.0.id', $first->id)->assertJsonCount(1, 'attempt.sections.0.questions');
    $this->actingAs($user)->postJson(route('user.exam-attempts.advance', $attempt), ['client_revision' => 0])->assertStatus(409);
    $this->actingAs($user)->getJson(route('user.exam-attempts.show', $attempt))->assertOk()->assertJsonPath('attempt.navigation.section_index', 1);
    $this->actingAs($user)->putJson(route('user.exam-attempts.answers', $attempt), ['autosave_token' => (string) Str::uuid(), 'client_revision' => 1, 'answers' => [['question_id' => $second->id, 'answer_text' => 'A']]])->assertUnprocessable();
    $this->actingAs($user)->postJson(route('user.exam-attempts.advance', $attempt), ['client_revision' => 1])->assertOk()
        ->assertJsonPath('attempt.navigation.question_index', 1)->assertJsonPath('attempt.sections.0.questions.0.id', $second->id)->assertJsonPath('attempt.navigation.has_next', false);
    $this->actingAs($user)->postJson(route('user.exam-attempts.advance', $attempt), ['client_revision' => 2])->assertStatus(409);
    $this->actingAs($user)->putJson(route('user.exam-attempts.answers', $attempt), ['autosave_token' => (string) Str::uuid(), 'client_revision' => 2, 'answers' => [['question_id' => $question->id, 'answer_text' => 'A']]])->assertUnprocessable();
    $attempt->update(['deadline_at' => now()->subSecond()]);
    $this->actingAs($user)->postJson(route('user.exam-attempts.advance', $attempt), ['client_revision' => 2])->assertStatus(409);
});

it('hides unreleased scores from history catalog and ranking until release', function () {
    $admin = Pengguna::factory()->create(['role' => 'admin']);
    $user = Pengguna::factory()->create(['role' => 'user']);
    ['exam' => $exam, 'version' => $version, 'question' => $question, 'session' => $session] = createPublishedStandaloneExam($admin);
    $version->update(['result_release_policy' => 'manual']);
    $start = $this->actingAs($user)->postJson(route('user.exams.attempts.start', $exam), ['session_id' => $session->id, 'submission_token' => (string) Str::uuid(), 'mode' => 'full', 'agreement_accepted' => true])->assertCreated();
    $attempt = ExamAttempt::findOrFail($start->json('attempt.id'));
    $this->actingAs($user)->putJson(route('user.exam-attempts.answers', $attempt), ['autosave_token' => (string) Str::uuid(), 'client_revision' => 0, 'answers' => [['question_id' => $question->id, 'answer_text' => $question->correct_answer]]])->assertOk();
    $this->actingAs($user)->postJson(route('user.exam-attempts.submit', $attempt))->assertOk()->assertJsonPath('result_available', false);
    $this->actingAs($user)->getJson(route('user.exam-attempts.result', $attempt))->assertForbidden();
    $this->actingAs($user)->get(route('user.exams.history'))->assertInertia(fn (Assert $page) => $page
        ->where('history.0.score', null)->where('history.0.status', 'pending')->where('history.0.sections', [])
        ->where('latest_result', null)->where('exam_packages.0.last_score', null)->has('ranking', 0));
    $session->update(['result_released_at' => now()->subSecond()]);
    $this->actingAs($user)->get(route('user.exams.history', ['session_id' => $session->id]))->assertInertia(fn (Assert $page) => $page
        ->where('history.0.score', 60)->where('history.0.sections.0.max_score', 60)
        ->where('exam_packages.0.last_score', 60)->has('ranking', 1)
        ->where('ranking.0.max_score', 60)->where('ranking.0.sections.0.key', 'vocabulary'));
    $exam->update(['status' => 'draft']);
    $this->actingAs($user)->get(route('user.exams.ranking', ['session_id' => $session->id]))->assertInertia(fn (Assert $page) => $page->has('ranking', 0));
});

it('selects ranking sessions by id and lists closed sessions', function () {
    $admin = Pengguna::factory()->create(['role' => 'admin']);
    $user = Pengguna::factory()->create(['role' => 'user']);
    ['version' => $version, 'session' => $session] = createPublishedStandaloneExam($admin);
    $closed = ExamSession::create(['exam_version_id' => $version->id, 'name' => 'Sesi sebelumnya', 'starts_at' => now()->subDays(2), 'ends_at' => now()->subDay(), 'status' => 'closed', 'ranking_enabled' => true, 'created_by' => $admin->id]);
    $this->actingAs($user)->get(route('user.exams.ranking', ['session_id' => $closed->id]))->assertInertia(fn (Assert $page) => $page
        ->where('ranking_session_id', $closed->id)->has('ranking_sessions', 2)->has('ranking', 0));
});
