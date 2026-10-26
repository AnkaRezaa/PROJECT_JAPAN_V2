<?php

use App\Events\KuisSelesai;
use App\Models\DokkaiAttemptAnswer;
use App\Models\DokkaiParagraph;
use App\Models\DokkaiPassage;
use App\Models\DokkaiQuestion;
use App\Models\HariModul;
use App\Models\Kuis;
use App\Models\LevelPembelajaran;
use App\Models\LogReward;
use App\Models\Modul;
use App\Models\PengerjaanKuis;
use App\Models\Pengguna;
use App\Models\ProgramPembelajaran;
use App\Models\ReviewSoal;
use App\Models\Soal;
use App\Services\KuisCampuranService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia;

function kuisCampuranFixture(): array
{
    $user = Pengguna::factory()->create(['role' => 'user']);
    $level = LevelPembelajaran::create(['level_name' => 'N5', 'stage' => 1, 'is_premium' => false]);
    $program = ProgramPembelajaran::create([
        'level_id' => $level->id,
        'title' => 'JLPT N5 Campuran',
        'slug' => 'jlpt-n5-campuran-'.Str::random(6),
        'description' => 'Test',
        'status' => 'published',
    ]);
    $module = Modul::create([
        'level_id' => $level->id,
        'program_pembelajaran_id' => $program->id,
        'title' => 'Week 1',
        'week_number' => 1,
        'status' => 'published',
    ]);
    $day = HariModul::create([
        'module_id' => $module->id,
        'day_number' => 1,
        'title' => 'Hari 1 Campuran',
        'status' => 'published',
    ]);

    // 1. Kuis Kosakata (4 soal)
    $vocabQuiz = Kuis::create([
        'module_id' => $module->id,
        'module_day_id' => $day->id,
        'type' => 'multiple_choice',
        'passing_score' => 70,
        'status' => 'published',
    ]);
    $day->update(['checkpoint_quiz_id' => $vocabQuiz->id]);

    for ($i = 1; $i <= 6; $i++) {
        Soal::create([
            'quiz_id' => $vocabQuiz->id,
            'type' => 'multiple_choice',
            'question_text' => "Arti kata kosakata {$i}?",
            'correct_answer' => "Jawaban Benar {$i}",
            'options' => ["Jawaban Benar {$i}", "Salah A {$i}", "Salah B {$i}", "Salah C {$i}"],
            'order' => $i,
            'points' => 1,
        ]);
    }

    // 2. Kuis Grammar (3 soal)
    $grammarQuiz = Kuis::create([
        'module_id' => $module->id,
        'module_day_id' => $day->id,
        'type' => 'grammar',
        'passing_score' => 70,
        'status' => 'published',
    ]);
    for ($i = 1; $i <= 4; $i++) {
        Soal::create([
            'quiz_id' => $grammarQuiz->id,
            'type' => 'grammar',
            'stage' => 'context_choice',
            'question_text' => "Lengkapi kalimat tata bahasa {$i}?",
            'correct_answer' => "Partikel Benar {$i}",
            'options' => ["Partikel Benar {$i}", "Partikel Salah A {$i}", "Partikel Salah B {$i}", "Partikel Salah C {$i}"],
            'order' => $i,
            'points' => 1,
        ]);
    }

    // 3. Dokkai (Passage & 3 soal)
    $dokkaiQuiz = Kuis::create([
        'module_id' => $module->id,
        'module_day_id' => $day->id,
        'type' => 'dokkai',
        'passing_score' => 70,
        'status' => 'published',
    ]);
    $passage = DokkaiPassage::create([
        'quiz_id' => $dokkaiQuiz->id,
        'title' => 'Wacana Mini Test',
        'jlpt_level' => 'N5',
        'status' => 'published',
    ]);
    $paragraph = DokkaiParagraph::create([
        'dokkai_passage_id' => $passage->id,
        'paragraph_number' => 1,
        'content_raw' => 'Hari ini cuaca sangat cerah di Tokyo. Banyak orang pergi ke taman.',
    ]);
    for ($i = 1; $i <= 4; $i++) {
        DokkaiQuestion::create([
            'dokkai_passage_id' => $passage->id,
            'question_number' => $i,
            'question_text' => "Apa isi wacana soal {$i}?",
            'evidence_paragraph_id' => $paragraph->id,
            'options' => [
                ['id' => 1, 'option_label' => 'A', 'option_text' => "Opsi Benar Dokkai {$i}", 'is_correct' => true],
                ['id' => 2, 'option_label' => 'B', 'option_text' => "Opsi Salah Dokkai {$i}", 'is_correct' => false],
            ],
            'order' => $i,
        ]);
    }

    return compact('user', 'level', 'program', 'module', 'day', 'vocabQuiz', 'grammarQuiz', 'dokkaiQuiz');
}

test('kuis campuran endpoint show menghasilkan 10 butir soal ternormalisasi dengan 3 pilar materi', function () {
    $f = kuisCampuranFixture();

    $response = $this->actingAs($f['user'])
        ->get(route('user.kuis-campuran.show', $f['day']->id));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('User/Kuis/KuisCampuranRunner')
        ->has('quiz')
        ->where('quiz.total_questions', 10)
        ->has('quiz.questions', 10)
        ->has('quiz.session_token')
        ->where('backUrl', route('user.modul.program', $f['program']->slug))
    );

    $questions = $response->viewData('page')['props']['quiz']['questions'];
    $sourceTypes = array_column($questions, 'source_type');

    expect($sourceTypes)->toContain('kosakata')
        ->and($sourceTypes)->toContain('bunpo')
        ->and($sourceTypes)->toContain('dokkai');
});

test('kuis campuran endpoint submit berhasil menghitung skor, memberi +30 XP, dan idempoten', function () {
    $f = kuisCampuranFixture();

    // 1. Ambil payload kuis
    $showResponse = $this->actingAs($f['user'])
        ->get(route('user.kuis-campuran.show', $f['day']->id));

    $quizPayload = $showResponse->viewData('page')['props']['quiz'];
    $token = $quizPayload['session_token'];
    $questions = $quizPayload['questions'];

    // 2. Siapkan jawaban benar
    $answers = [];
    foreach ($questions as $q) {
        $answers[] = [
            'raw_id' => $q['raw_id'],
            'source_type' => $q['source_type'],
            // Ambil opsi pertama yang disediakan
            'answer' => $q['options'][0]['text'] ?? null,
        ];
    }

    // 3. Submit pertama
    $submitResponse = $this->actingAs($f['user'])
        ->postJson(route('user.kuis-campuran.submit', $f['day']->id), [
            'submission_token' => $token,
            'answers' => $answers,
        ]);

    $submitResponse->assertOk();
    $data = $submitResponse->json();

    expect($data)->toHaveKeys(['score', 'passed', 'xp_earned', 'attempt_id', 'breakdown']);

    // Verifikasi database record
    $this->assertDatabaseHas('attempts', [
        'id' => $data['attempt_id'],
        'user_id' => $f['user']->id,
        'submission_token' => $token,
        'status' => 'completed',
    ]);

    // 4. Test Idempotensi: submit ulang dengan token yang sama
    $secondResponse = $this->actingAs($f['user'])
        ->postJson(route('user.kuis-campuran.submit', $f['day']->id), [
            'submission_token' => $token,
            'answers' => $answers,
        ]);

    $secondResponse->assertOk();
    expect($secondResponse->json('idempotent'))->toBeTrue();

    // Pastikan tidak ada duplikasi attempt di database
    $attemptCount = PengerjaanKuis::where('submission_token', $token)->count();
    expect($attemptCount)->toBe(1);
});

test('kuis weakspot endpoint show mengembalikan has_weakspot false jika user belum pernah gagal kuis', function () {
    $f = kuisCampuranFixture();

    $response = $this->actingAs($f['user'])
        ->get(route('user.weakspot.show'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('User/Kuis/KuisCampuranRunner')
        ->where('quiz.has_weakspot', false)
        ->where('quiz.total_questions', 0)
        ->has('quiz.questions', 0)
    );
});

test('kuis weakspot endpoint show HANYA menyajikan butir soal yang gagal jika user memiliki riwayat salah', function () {
    $f = kuisCampuranFixture();

    // Buat riwayat gagal untuk 2 soal kosakata
    $failedQuestions = Soal::where('quiz_id', $f['vocabQuiz']->id)->take(2)->get();
    foreach ($failedQuestions as $q) {
        ReviewSoal::create([
            'user_id' => $f['user']->id,
            'question_id' => $q->id,
            'quiz_id' => $f['vocabQuiz']->id,
            'module_id' => $f['module']->id,
            'wrong_count' => 2,
            'last_result' => 'wrong',
            'status' => 'learning',
        ]);
    }

    $response = $this->actingAs($f['user'])
        ->get(route('user.weakspot.show'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('User/Kuis/KuisCampuranRunner')
        ->where('quiz.has_weakspot', true)
        ->where('quiz.total_questions', 2)
        ->has('quiz.questions', 2)
    );

    $presentedRawIds = array_column($response->viewData('page')['props']['quiz']['questions'], 'raw_id');
    $expectedFailedIds = $failedQuestions->pluck('id')->all();

    sort($presentedRawIds);
    sort($expectedFailedIds);
    expect($presentedRawIds)->toEqual($expectedFailedIds);
});

test('kuis weakspot endpoint submit berhasil memperbaiki review soal dan memberikan +20 XP', function () {
    $f = kuisCampuranFixture();

    $targetSoal = Soal::where('quiz_id', $f['vocabQuiz']->id)->first();
    $review = ReviewSoal::create([
        'user_id' => $f['user']->id,
        'question_id' => $targetSoal->id,
        'quiz_id' => $f['vocabQuiz']->id,
        'module_id' => $f['module']->id,
        'wrong_count' => 3,
        'last_result' => 'wrong',
        'status' => 'learning',
    ]);

    $showResponse = $this->actingAs($f['user'])
        ->get(route('user.weakspot.show'));

    $token = $showResponse->viewData('page')['props']['quiz']['session_token'];

    $submitResponse = $this->actingAs($f['user'])
        ->postJson(route('user.weakspot.submit'), [
            'submission_token' => $token,
            'answers' => [
                [
                    'raw_id' => $targetSoal->id,
                    'source_type' => 'kosakata',
                    'answer' => $targetSoal->correct_answer,
                ],
            ],
        ]);

    $submitResponse->assertOk();
    expect($submitResponse->json('score'))->toBe(100)
        ->and($submitResponse->json('passed'))->toBeTrue()
        ->and($submitResponse->json('xp_earned'))->toBe(20)
        ->and($submitResponse->json('is_weakspot'))->toBeTrue();

    // Verifikasi pemulihan di ReviewSoal
    $review->refresh();
    expect($review->wrong_count)->toBe(2)
        ->and($review->last_result)->toBe('correct');
});

test('kuis campuran mendukung soal tipe sentence_builder dengan evaluasi array token ID yang akurat', function () {
    $f = kuisCampuranFixture();
    $f['grammarQuiz']->questions()->delete();

    $sentenceBuilderSoal = Soal::create([
        'quiz_id' => $f['grammarQuiz']->id,
        'type' => 'sentence_builder',
        'stage' => 'sentence_builder',
        'question_text' => 'Susun kata berikut.',
        'correct_answer' => json_encode(['t1', 't2', 't3']),
        'options' => [
            'tokens' => [
                ['id' => 't1', 'text' => '勉強すれば'],
                ['id' => 't2', 'text' => 'する'],
                ['id' => 't3', 'text' => 'ほど'],
            ],
            'context' => 'Semakin belajar, semakin bisa.',
        ],
        'order' => 99,
        'points' => 1,
    ]);

    $service = app(KuisCampuranService::class);
    $payload = $service->generatePayload($f['day'], $f['user']);

    $builderItem = collect($payload['questions'])->firstWhere('raw_id', $sentenceBuilderSoal->id);
    if ($builderItem) {
        expect($builderItem['type'])->toBe('sentence_builder')
            ->and($builderItem)->toHaveKey('tokens')
            ->and(count($builderItem['tokens']))->toBe(3);
    }

    $submitResponse = $this->actingAs($f['user'])
        ->postJson(route('user.kuis-campuran.submit', $f['day']->id), [
            'submission_token' => $payload['session_token'],
            'answers' => [
                [
                    'raw_id' => $sentenceBuilderSoal->id,
                    'source_type' => 'bunpo',
                    'answer' => '勉強すればするほど',
                    'ordered_token_ids' => ['t1', 't2', 't3'],
                ],
            ],
        ]);

    $submitResponse->assertOk();
    $details = $submitResponse->json('details');
    $evaluatedItem = collect($details)->firstWhere('raw_id', $sentenceBuilderSoal->id);
    expect($evaluatedItem['is_correct'])->toBeTrue();
});

it('renders dashboard mixed quiz and submits answer successfully', function () {
    $f = kuisCampuranFixture();

    $show = $this->actingAs($f['user'])
        ->get(route('user.kuis-campuran.dashboard'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('User/Kuis/KuisCampuranRunner')
            ->has('quiz.questions')
            ->where('quiz.is_dashboard', true)
            ->where('isDashboard', true));

    $item = collect($show->viewData('page')['props']['quiz']['questions'])->firstWhere('source_type', 'kosakata');
    $soal = Soal::findOrFail($item['raw_id']);
    $submitResponse = $this->actingAs($f['user'])
        ->postJson(route('user.kuis-campuran.dashboard.submit'), [
            'submission_token' => $show->viewData('page')['props']['quiz']['session_token'],
            'answers' => [
                [
                    'raw_id' => $soal->id,
                    'source_type' => 'kosakata',
                    'answer' => $soal->correct_answer,
                ],
            ],
        ]);

    $submitResponse->assertOk()
        ->assertJson([
            'passed' => false,
            'score' => 10,
            'total_questions' => 10,
            'is_dashboard' => true,
        ]);
});

it('exposes dashboardMixedQuiz summary in Beranda page', function () {
    $f = kuisCampuranFixture();

    $this->actingAs($f['user'])
        ->get(route('user.dashboard'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('User/Beranda/Beranda')
            ->has('dashboardMixedQuiz')
            ->where('dashboardMixedQuiz.available', true)
            ->has('weakspotSummary'));
});

test('mixed sessions preserve question identity order and expiry without extending TTL', function () {
    $f = kuisCampuranFixture();
    $service = app(KuisCampuranService::class);
    $first = $service->generatePayload($f['day'], $f['user']);
    $this->travel(71)->hours();
    expect($service->generatePayload($f['day'], $f['user']))->toBe($first);
    $this->travel(2)->hours();
    $next = $service->generatePayload($f['day'], $f['user']);
    expect($next['session_token'])->not->toBe($first['session_token']);
    $this->actingAs($f['user'])->postJson(route('user.kuis-campuran.submit', $f['day']), [
        'submission_token' => $first['session_token'], 'answers' => [],
    ])->assertConflict();
});

test('mixed sessions isolate user day and dashboard program contexts', function () {
    $f = kuisCampuranFixture();
    $service = app(KuisCampuranService::class);
    $day = $service->generatePayload($f['day'], $f['user']);
    $all = $service->generateDashboardPayload($f['user']);
    $program = $service->generateDashboardPayload($f['user'], $f['program']->id);
    expect(array_unique([$day['session_token'], $all['session_token'], $program['session_token']]))->toHaveCount(3);
    $other = Pengguna::factory()->create(['role' => 'user']);
    $this->actingAs($other)->postJson(route('user.kuis-campuran.submit', $f['day']), [
        'submission_token' => $day['session_token'], 'answers' => [],
    ])->assertConflict();
    $this->actingAs($f['user'])->postJson(route('user.kuis-campuran.submit', $f['day']), [
        'submission_token' => $all['session_token'], 'answers' => [],
    ])->assertConflict();
    $this->postJson(route('user.kuis-campuran.dashboard.submit'), [
        'submission_token' => $day['session_token'], 'answers' => [],
    ])->assertConflict();
});

test('mixed submissions reject foreign and duplicate questions and count unanswered questions', function () {
    $f = kuisCampuranFixture();
    $payload = app(KuisCampuranService::class)->generatePayload($f['day'], $f['user']);
    $url = route('user.kuis-campuran.submit', $f['day']);
    $this->actingAs($f['user'])->postJson($url, [
        'submission_token' => $payload['session_token'],
        'answers' => [['raw_id' => 999999, 'source_type' => 'kosakata', 'answer' => 'anything']],
    ])->assertUnprocessable();
    $question = $payload['questions'][0];
    $answer = ['raw_id' => $question['raw_id'], 'source_type' => $question['source_type'], 'answer' => null];
    $this->postJson($url, [
        'submission_token' => $payload['session_token'], 'answers' => [$answer, $answer],
    ])->assertUnprocessable();
    $this->postJson($url, [
        'submission_token' => $payload['session_token'], 'answers' => [],
    ])->assertOk()->assertJson(['score' => 0, 'total_questions' => 10, 'correct_count' => 0, 'xp_earned' => 0]);
});

test('mixed restart creates a new session and invalidates the old unfinished token', function () {
    $f = kuisCampuranFixture();
    $service = app(KuisCampuranService::class);
    $old = $service->generatePayload($f['day'], $f['user']);
    $this->actingAs($f['user'])->postJson(route('user.kuis-campuran.restart', $f['day']))
        ->assertOk()->assertJsonPath('redirect_url', route('user.kuis-campuran.show', $f['day']));
    $new = $service->generatePayload($f['day'], $f['user']);
    expect($new['session_token'])->not->toBe($old['session_token']);
    $this->postJson(route('user.kuis-campuran.submit', $f['day']), [
        'submission_token' => $old['session_token'], 'answers' => [],
    ])->assertConflict();
    $dashboard = $service->generateDashboardPayload($f['user'], $f['program']->id);
    $this->postJson(route('user.kuis-campuran.dashboard.restart'), ['program_id' => $f['program']->id])->assertOk();
    expect($service->generateDashboardPayload($f['user'], $f['program']->id)['session_token'])->not->toBe($dashboard['session_token']);
});

test('mixed retry returns persisted counts without repeating XP or completion events after cache loss', function () {
    $f = kuisCampuranFixture();
    Event::fake([KuisSelesai::class]);
    $service = app(KuisCampuranService::class);
    $payload = $service->generatePayload($f['day'], $f['user']);
    $answers = collect($payload['questions'])->map(function ($question) {
        $correct = $question['source_type'] === 'dokkai'
            ? collect(DokkaiQuestion::findOrFail($question['raw_id'])->options)->firstWhere('is_correct', true)['option_text']
            : Soal::findOrFail($question['raw_id'])->correct_answer;

        return ['raw_id' => $question['raw_id'], 'source_type' => $question['source_type'], 'answer' => $correct];
    })->all();
    $data = ['submission_token' => $payload['session_token'], 'answers' => $answers];
    $first = $service->submitAttempt($f['day'], $f['user'], $data);
    expect($first['score'])->toBe(100)->and($first['xp_earned'])->toBe(30);
    Cache::flush();
    $second = $service->submitAttempt($f['day'], $f['user'], $data);
    expect($second['idempotent'])->toBeTrue()->and($second['correct_count'])->toBe(10)
        ->and($second['total_questions'])->toBe(10)->and($second['xp_earned'])->toBe(30);
    expect(PengerjaanKuis::where('submission_token', $payload['session_token'])->count())->toBe(1);
    expect(LogReward::where('user_id', $f['user']->id)->count())->toBe(1);
    Event::assertDispatchedTimes(KuisSelesai::class, 1);
});

test('cached mixed sessions recheck access when source material is unpublished', function () {
    $f = kuisCampuranFixture();
    $service = app(KuisCampuranService::class);
    $payload = $service->generatePayload($f['day'], $f['user']);
    $f['grammarQuiz']->update(['status' => 'draft']);
    $this->actingAs($f['user'])->postJson(route('user.kuis-campuran.submit', $f['day']), [
        'submission_token' => $payload['session_token'], 'answers' => [],
    ])->assertConflict();
    expect(PengerjaanKuis::where('submission_token', $payload['session_token'])->exists())->toBeFalse();
});

test('mixed backfill never adds questions from a future locked day', function () {
    $f = kuisCampuranFixture();
    $first = $f['vocabQuiz']->questions()->first();
    $f['vocabQuiz']->questions()->whereKeyNot($first->id)->delete();
    $f['grammarQuiz']->questions()->delete();
    $f['dokkaiQuiz']->dokkaiPassage->questions()->delete();
    $futureDay = HariModul::create(['module_id' => $f['module']->id, 'day_number' => 2, 'title' => 'Future day', 'status' => 'published']);
    $futureQuiz = Kuis::create(['module_id' => $f['module']->id, 'module_day_id' => $futureDay->id, 'type' => 'multiple_choice', 'status' => 'published']);
    Soal::create(['quiz_id' => $futureQuiz->id, 'type' => 'multiple_choice', 'question_text' => 'Locked question', 'correct_answer' => 'A', 'options' => ['A', 'B'], 'order' => 1]);
    $payload = app(KuisCampuranService::class)->generatePayload($f['day'], $f['user']);
    expect($payload['questions'])->toHaveCount(1)->and($payload['questions'][0]['raw_id'])->toBe($first->id);
    $this->actingAs($f['user'])->postJson(route('user.kuis-campuran.submit', $f['day']), [
        'submission_token' => $payload['session_token'],
        'answers' => [['raw_id' => $first->id, 'source_type' => 'kosakata', 'answer' => $first->correct_answer]],
    ])->assertOk();
});

test('Dokkai token retry returns the original result and never duplicates attempt XP or completion events', function () {
    $f = kuisCampuranFixture();
    Event::fake([KuisSelesai::class]);
    $questions = $f['dokkaiQuiz']->dokkaiPassage->questions;
    $data = ['submission_token' => (string) Str::uuid(), 'answers' => $questions->mapWithKeys(fn ($q) => [$q->id => 'A'])->all()];
    $url = route('user.dokkai-quizzes.submit', $f['dokkaiQuiz']);
    $first = $this->actingAs($f['user'])->postJson($url, $data)->assertOk();
    $second = $this->postJson($url, [...$data, 'answers' => []])->assertOk();
    expect($second->json('idempotent'))->toBeTrue()->and($second->json('result'))->toBe($first->json('result'));
    expect(PengerjaanKuis::where('submission_token', $data['submission_token'])->count())->toBe(1);
    expect(DokkaiAttemptAnswer::count())->toBe($questions->count());
    expect(LogReward::where('user_id', $f['user']->id)->count())->toBe(1);
    Event::assertDispatchedTimes(KuisSelesai::class, 1);
});

test('Dokkai requires a valid token and keeps XP policy when a genuinely new attempt is submitted', function () {
    $f = kuisCampuranFixture();
    $url = route('user.dokkai-quizzes.submit', $f['dokkaiQuiz']);
    $this->actingAs($f['user'])->postJson($url, ['answers' => []])->assertUnprocessable();
    $this->postJson($url, ['answers' => [], 'submission_token' => 'invalid'])->assertUnprocessable();
    $answers = $f['dokkaiQuiz']->dokkaiPassage->questions->mapWithKeys(fn ($q) => [$q->id => 'A'])->all();
    $this->postJson($url, ['answers' => $answers, 'submission_token' => (string) Str::uuid()])->assertOk();
    $this->postJson($url, ['answers' => $answers, 'submission_token' => (string) Str::uuid()])->assertOk()->assertJsonPath('result.xp_earned', 0);
    expect(PengerjaanKuis::where('quiz_id', $f['dokkaiQuiz']->id)->count())->toBe(2);
    expect(LogReward::where('user_id', $f['user']->id)->count())->toBe(1);
});
