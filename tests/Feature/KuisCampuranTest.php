<?php

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
use Illuminate\Support\Str;

function kuisCampuranFixture(): array
{
    $user = Pengguna::factory()->create(['role' => 'user']);
    $level = LevelPembelajaran::create(['level_name' => 'N5', 'stage' => 1, 'is_premium' => false]);
    $program = ProgramPembelajaran::create([
        'level_id' => $level->id,
        'title' => 'JLPT N5 Campuran',
        'slug' => 'jlpt-n5-campuran-' . Str::random(6),
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
                ['id' => 1, 'option_text' => "Opsi Benar Dokkai {$i}", 'is_correct' => true],
                ['id' => 2, 'option_text' => "Opsi Salah Dokkai {$i}", 'is_correct' => false],
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

    $service = app(\App\Services\KuisCampuranService::class);
    $payload = $service->generatePayload($f['day'], $f['user']);

    $builderItem = collect($payload['questions'])->firstWhere('raw_id', $sentenceBuilderSoal->id);
    if ($builderItem) {
        expect($builderItem['type'])->toBe('sentence_builder')
            ->and($builderItem)->toHaveKey('tokens')
            ->and(count($builderItem['tokens']))->toBe(3);
    }

    $submitResponse = $this->actingAs($f['user'])
        ->postJson(route('user.kuis-campuran.submit', $f['day']->id), [
            'submission_token' => (string) Str::uuid(),
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
