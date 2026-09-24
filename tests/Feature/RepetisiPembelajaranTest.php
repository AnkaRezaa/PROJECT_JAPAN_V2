<?php

use App\Models\Flashcard;
use App\Models\HariModul;
use App\Models\Kuis;
use App\Models\LevelPembelajaran;
use App\Models\LogReward;
use App\Models\Modul;
use App\Models\PengerjaanKuis;
use App\Models\Pengguna;
use App\Models\ProgramPembelajaran;
use App\Models\ReviewFlashcard;
use App\Models\ReviewSoal;
use App\Models\SetFlashcard;
use App\Models\Soal;
use App\Services\RepetisiPembelajaranService;
use Inertia\Testing\AssertableInertia as Assert;

function createPublishedProgram(LevelPembelajaran $level): ProgramPembelajaran
{
    return ProgramPembelajaran::create([
        'level_id' => $level->id,
        'title' => 'JLPT N3',
        'slug' => 'jlpt-n3-'.str()->random(6),
        'description' => 'Program N3',
        'status' => 'published',
    ]);
}

it('updates question mastery using spaced repetition rules', function () {
    $user = Pengguna::factory()->create();
    $level = LevelPembelajaran::create([
        'level_name' => 'N3',
        'stage' => 1,
        'is_premium' => false,
    ]);
    $module = Modul::create([
        'level_id' => $level->id,
        'title' => 'Week 1',
        'week_number' => 1,
        'description' => 'Preview',
        'status' => 'published',
    ]);
    $quiz = Kuis::create([
        'module_id' => $module->id,
        'lesson_id' => null,
        'type' => 'typing',
        'time_limit' => 300,
        'status' => 'published',
    ]);
    $question = Soal::create([
        'quiz_id' => $quiz->id,
        'type' => 'typing',
        'question_text' => 'Apa arti taberu?',
        'correct_answer' => 'makan',
        'explanation' => 'Taberu berarti makan.',
        'options' => null,
        'order' => 1,
    ]);

    $service = app(RepetisiPembelajaranService::class);
    $service->catatJawabanSoal($user, $question, false, $quiz);
    $review = $service->catatJawabanSoal($user, $question, true, $quiz)->refresh();

    expect($review->status)->toBe('learning')
        ->and($review->mastery_level)->toBe(1)
        ->and($review->correct_streak)->toBe(1)
        ->and($review->wrong_count)->toBe(1)
        ->and($review->review_count)->toBe(2)
        ->and($review->last_result)->toBe('correct')
        ->and($review->next_review_at)->not->toBeNull();
});

it('stores quiz attempt once while processing repeated answer events for reviews', function () {
    $user = Pengguna::factory()->create(['role' => 'user']);
    $level = LevelPembelajaran::create([
        'level_name' => 'N3',
        'stage' => 1,
        'is_premium' => false,
    ]);
    $module = Modul::create([
        'level_id' => $level->id,
        'title' => 'Week 1',
        'week_number' => 1,
        'description' => 'Preview',
        'status' => 'published',
    ]);
    $quiz = Kuis::create([
        'module_id' => $module->id,
        'lesson_id' => null,
        'type' => 'typing',
        'time_limit' => 300,
        'status' => 'published',
    ]);
    $question = Soal::create([
        'quiz_id' => $quiz->id,
        'type' => 'typing',
        'question_text' => 'Apa arti taberu?',
        'correct_answer' => 'makan',
        'explanation' => 'Taberu berarti makan.',
        'options' => null,
        'order' => 1,
    ]);

    $response = $this->actingAs($user)->post(route('user.attempts.store'), [
        'quiz_id' => $quiz->id,
        'module_flow' => true,
        'answers' => [
            [
                'question_id' => $question->id,
                'answer_text' => 'minum',
                'answer_payload' => ['repeat_count' => 0],
            ],
            [
                'question_id' => $question->id,
                'answer_text' => 'makan',
                'answer_payload' => ['repeat_count' => 1],
            ],
        ],
    ]);

    $response->assertRedirect();

    $attempt = PengerjaanKuis::with('answers')->where('user_id', $user->id)->first();
    $review = ReviewSoal::where('user_id', $user->id)
        ->where('question_id', $question->id)
        ->first();

    expect($attempt)->not->toBeNull()
        ->and($attempt->score)->toBe(100)
        ->and($attempt->answers)->toHaveCount(1)
        ->and($attempt->answers->first()->answer_text)->toBe('makan')
        ->and($attempt->answers->first()->is_correct)->toBeTrue()
        ->and($review)->not->toBeNull()
        ->and($review->wrong_count)->toBe(1)
        ->and($review->review_count)->toBe(2)
        ->and($review->mastery_level)->toBe(1);

    $this->actingAs($user)->post(route('user.attempts.store'), [
        'quiz_id' => $quiz->id,
        'module_flow' => true,
        'answers' => [[
            'question_id' => $question->id,
            'answer_text' => 'makan',
        ]],
    ])->assertRedirect();

    expect(PengerjaanKuis::where('user_id', $user->id)->count())->toBe(2)
        ->and(PengerjaanKuis::where('user_id', $user->id)->latest('id')->value('xp_earned'))->toBe(0)
        ->and(LogReward::where('user_id', $user->id)->where('source_type', 'quiz')->where('source_id', $quiz->id)->count())->toBe(1);
});

it('stores an empty timeout quiz attempt without awarding xp', function () {
    $user = Pengguna::factory()->create(['role' => 'user', 'xp' => 0]);
    $level = LevelPembelajaran::create([
        'level_name' => 'N3',
        'stage' => 1,
        'is_premium' => false,
    ]);
    $module = Modul::create([
        'level_id' => $level->id,
        'title' => 'Week timeout',
        'week_number' => 1,
        'description' => 'Kuis waktunya habis.',
        'status' => 'published',
    ]);
    $quiz = Kuis::create([
        'module_id' => $module->id,
        'lesson_id' => null,
        'type' => 'typing',
        'time_limit' => 1,
        'status' => 'published',
    ]);
    Soal::create([
        'quiz_id' => $quiz->id,
        'type' => 'typing',
        'question_text' => 'Apa arti taberu?',
        'correct_answer' => 'makan',
        'explanation' => 'Taberu berarti makan.',
        'options' => null,
        'order' => 1,
    ]);

    $this->actingAs($user)
        ->post(route('user.attempts.store'), [
            'quiz_id' => $quiz->id,
            'module_flow' => true,
            'answers' => [],
        ])
        ->assertRedirect();

    $attempt = PengerjaanKuis::with('answers')->where('user_id', $user->id)->first();

    expect($attempt)->not->toBeNull()
        ->and($attempt->score)->toBe(0)
        ->and($attempt->xp_earned)->toBe(0)
        ->and($attempt->answers)->toHaveCount(0);
});

it('marks empty weekly modules as unavailable instead of showing an actionable start state', function () {
    $user = Pengguna::factory()->create(['role' => 'user']);
    $level = LevelPembelajaran::create([
        'level_name' => 'N3',
        'stage' => 1,
        'is_premium' => false,
    ]);
    $program = createPublishedProgram($level);

    Modul::create([
        'level_id' => $level->id,
        'program_pembelajaran_id' => $program->id,
        'title' => 'Week kosong',
        'week_number' => 1,
        'description' => 'Belum ada konten.',
        'status' => 'published',
    ]);

    $this->actingAs($user)
        ->get(route('user.modul.program', $program))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('User/Modul/DaftarModul')
            ->where('weeks.0.status', 'unavailable')
            ->where('weeks.0.has_content', false)
            ->where('weeks.0.lock_reason', 'Konten minggu ini belum tersedia.')
        );
});

it('does not treat published quizzes without questions as available weekly content', function () {
    $user = Pengguna::factory()->create(['role' => 'user']);
    $level = LevelPembelajaran::create([
        'level_name' => 'N3',
        'stage' => 1,
        'is_premium' => false,
    ]);
    $program = createPublishedProgram($level);
    $module = Modul::create([
        'level_id' => $level->id,
        'program_pembelajaran_id' => $program->id,
        'title' => 'Week tanpa soal',
        'week_number' => 1,
        'description' => 'Kuis belum siap.',
        'status' => 'published',
    ]);

    Kuis::create([
        'module_id' => $module->id,
        'lesson_id' => null,
        'type' => 'typing',
        'time_limit' => 300,
        'status' => 'published',
    ]);

    $this->actingAs($user)
        ->get(route('user.modul.program', $program))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('User/Modul/DaftarModul')
            ->where('weeks.0.status', 'unavailable')
            ->where('weeks.0.has_content', false)
            ->where('weeks.0.questions_count', 0)
        );
});

it('skips empty flashcard sets and sends weekly module users to the valid quiz', function () {
    $user = Pengguna::factory()->create(['role' => 'user']);
    $level = LevelPembelajaran::create([
        'level_name' => 'N3',
        'stage' => 1,
        'is_premium' => false,
    ]);
    $program = createPublishedProgram($level);
    $module = Modul::create([
        'level_id' => $level->id,
        'program_pembelajaran_id' => $program->id,
        'title' => 'Week kuis saja',
        'week_number' => 1,
        'description' => 'Flashcard belum diisi.',
        'status' => 'published',
    ]);
    SetFlashcard::create([
        'level_id' => $level->id,
        'module_id' => $module->id,
        'lesson_id' => null,
        'title' => 'Set kosong',
        'description' => 'Belum ada kartu.',
        'source_type' => 'manual',
        'status' => 'published',
    ]);
    $day = HariModul::create([
        'module_id' => $module->id,
        'day_number' => 1,
        'title' => 'Hari 1',
        'status' => 'published',
    ]);
    $quiz = Kuis::create([
        'module_id' => $module->id,
        'module_day_id' => $day->id,
        'lesson_id' => null,
        'type' => 'typing',
        'time_limit' => 300,
        'status' => 'published',
    ]);
    $day->update(['checkpoint_quiz_id' => $quiz->id]);
    Soal::create([
        'quiz_id' => $quiz->id,
        'type' => 'typing',
        'question_text' => 'Apa arti taberu?',
        'correct_answer' => 'makan',
        'explanation' => 'Taberu berarti makan.',
        'options' => null,
        'order' => 1,
    ]);

    $this->actingAs($user)
        ->get(route('user.modul.program', $program))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('User/Modul/DaftarModul')
            ->where('weeks.0.status', 'active')
            ->where('weeks.0.has_content', true)
            ->where('weeks.0.flashcard_total', 0)
            ->where('weeks.0.days.0.status', 'active')
        );

    $this->actingAs($user)
        ->get(route('user.modul.lesson', $module))
        ->assertRedirect(route('user.modul.program', $program->slug));
});

it('checks quiz answers through the realtime endpoint with explanation payload', function () {
    $user = Pengguna::factory()->create(['role' => 'user']);
    $level = LevelPembelajaran::create([
        'level_name' => 'N3',
        'stage' => 1,
        'is_premium' => false,
    ]);
    $module = Modul::create([
        'level_id' => $level->id,
        'title' => 'Week 1',
        'week_number' => 1,
        'description' => 'Preview',
        'status' => 'published',
    ]);
    $quiz = Kuis::create([
        'module_id' => $module->id,
        'lesson_id' => null,
        'type' => 'typing',
        'time_limit' => 300,
        'status' => 'published',
    ]);
    $question = Soal::create([
        'quiz_id' => $quiz->id,
        'type' => 'typing',
        'question_text' => 'Apa arti taberu?',
        'correct_answer' => 'makan',
        'explanation' => 'Taberu berarti makan.',
        'options' => null,
        'order' => 1,
    ]);

    $this->actingAs($user)
        ->postJson(route('user.questions.check', $question), ['answer' => 'makan'])
        ->assertOk()
        ->assertJson([
            'is_correct' => true,
            'explanation' => 'Taberu berarti makan.',
        ]);

    $this->actingAs($user)
        ->postJson(route('user.questions.check', $question), ['answer' => 'minum'])
        ->assertOk()
        ->assertJson([
            'is_correct' => false,
            'explanation' => 'Taberu berarti makan.',
        ]);
});

it('records flashcard review mastery and awards completion reward only once', function () {
    $user = Pengguna::factory()->create(['role' => 'user', 'xp' => 0]);
    $level = LevelPembelajaran::create([
        'level_name' => 'N3',
        'stage' => 1,
        'is_premium' => false,
    ]);
    $module = Modul::create([
        'level_id' => $level->id,
        'title' => 'Week 1',
        'week_number' => 1,
        'description' => 'Preview',
        'status' => 'published',
    ]);
    $set = SetFlashcard::create([
        'level_id' => $level->id,
        'module_id' => $module->id,
        'lesson_id' => null,
        'title' => 'Kosakata Week 1',
        'description' => 'Set latihan.',
        'source_type' => 'vocabulary',
        'status' => 'published',
    ]);
    $flashcard = Flashcard::create([
        'flashcard_set_id' => $set->id,
        'vocabulary_id' => null,
        'front_text' => 'taberu',
        'reading' => 'taberu',
        'back_text' => 'makan',
        'hint' => null,
        'example_sentence' => null,
        'example_meaning' => null,
        'audio_url' => null,
        'order' => 1,
    ]);

    $this->actingAs($user)
        ->post(route('user.flashcards.review', $flashcard), [
            'action' => 'learning',
            'completed' => false,
        ])
        ->assertRedirect();

    $learningReview = ReviewFlashcard::where('user_id', $user->id)
        ->where('flashcard_id', $flashcard->id)
        ->first();

    expect($learningReview)->not->toBeNull()
        ->and($learningReview->status)->toBe('learning')
        ->and($learningReview->learning_count)->toBe(1)
        ->and($learningReview->wrong_count)->toBe(1)
        ->and($learningReview->next_review_at)->not->toBeNull();

    $this->actingAs($user)
        ->post(route('user.flashcards.review', $flashcard), [
            'action' => 'known',
            'completed' => true,
        ])
        ->assertRedirect();

    $this->actingAs($user)
        ->post(route('user.flashcards.review', $flashcard), [
            'action' => 'known',
            'completed' => true,
        ])
        ->assertRedirect();

    $review = $learningReview->refresh();

    expect($review->known_count)->toBe(2)
        ->and($review->review_count)->toBe(3)
        ->and($review->correct_streak)->toBe(2)
        ->and(LogReward::where('user_id', $user->id)->where('source_type', 'flashcard')->where('source_id', $set->id)->count())->toBe(1)
        ->and($user->refresh()->xp)->toBe(10);
});
