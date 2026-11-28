<?php

use App\Models\HariModul;
use App\Models\Kosakata;
use App\Models\Kuis;
use App\Models\LevelPembelajaran;
use App\Models\Modul;
use App\Models\PengerjaanKuis;
use App\Models\Pengguna;
use App\Models\ProgramPembelajaran;
use App\Models\Soal;
use App\Services\PembelajaranPenggunaService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function makeQuizRoadmapFixture(): array
{
    $level = LevelPembelajaran::create([
        'level_name' => 'N5',
        'stage' => 1,
        'is_premium' => false,
    ]);

    $program = ProgramPembelajaran::create([
        'level_id' => $level->id,
        'title' => 'Program JLPT N5',
        'slug' => 'program-jlpt-n5-phase2',
        'status' => 'published',
    ]);

    $module = Modul::create([
        'program_pembelajaran_id' => $program->id,
        'level_id' => $level->id,
        'title' => 'Minggu 1',
        'week_number' => 1,
        'status' => 'published',
    ]);

    $day = HariModul::create([
        'module_id' => $module->id,
        'day_number' => 1,
        'title' => 'Hari 1',
        'status' => 'published',
    ]);

    $kanji = Kosakata::create([
        'module_id' => $module->id,
        'word' => '水',
        'reading' => 'みず',
        'meaning_id' => 'Air',
        'content_type' => 'kanji',
        'status' => 'published',
    ]);

    $kotoba = Kosakata::create([
        'module_id' => $module->id,
        'word' => 'たべる',
        'reading' => 'たべる',
        'meaning_id' => 'Makan',
        'content_type' => 'kosakata',
        'status' => 'published',
    ]);

    $day->vocabulary()->attach([
        $kanji->id => ['sort_order' => 1],
        $kotoba->id => ['sort_order' => 2],
    ]);

    $quiz = Kuis::create([
        'module_id' => $module->id,
        'module_day_id' => $day->id,
        'type' => 'multiple_choice',
        'passing_score' => 70,
        'status' => 'published',
    ]);

    $day->update(['checkpoint_quiz_id' => $quiz->id]);

    $qKanji = Soal::create([
        'quiz_id' => $quiz->id,
        'type' => 'multiple_choice',
        'source_type' => 'vocabulary',
        'source_id' => $kanji->id,
        'question_text' => 'Apa arti 水?',
        'correct_answer' => 'Air',
        'options' => ['Air', 'Api', 'Angin', 'Tanah'],
        'option_readings' => ['みず', 'ひ', 'かぜ', 'つち'],
        'order' => 1,
    ]);

    $qKotoba = Soal::create([
        'quiz_id' => $quiz->id,
        'type' => 'multiple_choice',
        'source_type' => 'vocabulary',
        'source_id' => $kotoba->id,
        'question_text' => 'Apa arti たべる?',
        'correct_answer' => 'Makan',
        'options' => ['Makan', 'Minum', 'Tidur', 'Jalan'],
        'option_readings' => ['たべる', 'のむ', 'ねる', 'あるく'],
        'order' => 2,
    ]);

    return compact('level', 'program', 'module', 'day', 'kanji', 'kotoba', 'quiz', 'qKanji', 'qKotoba');
}

it('saves advanced quiz settings from admin builder and persists them', function () {
    $fixture = makeQuizRoadmapFixture();
    $admin = Pengguna::factory()->create(['role' => 'admin']);
    $quiz = $fixture['quiz'];

    $response = $this->actingAs($admin)->post(route('admin.quizzes.builder.update', $quiz), [
        'time_limit' => 300,
        'passing_score' => 80,
        'shuffle_questions' => true,
        'shuffle_options' => true,
        'max_attempts' => 2,
        'explanation_display' => 'after_finish',
        'questions' => [
            [
                'id' => $fixture['qKanji']->id,
                'type' => 'multiple_choice',
                'question_text' => 'Apa arti 水?',
                'correct_answer' => 'Air',
                'options' => ['Air', 'Api'],
                'option_readings' => ['みず', 'ひ'],
            ],
        ],
    ]);

    $response->assertRedirect()->assertSessionDoesntHaveErrors();

    $quiz->refresh();
    expect($quiz->shuffle_questions)->toBeTrue()
        ->and($quiz->shuffle_options)->toBeTrue()
        ->and($quiz->max_attempts)->toBe(2)
        ->and($quiz->explanation_display)->toBe('after_finish');
});

it('keeps option readings aligned when shuffle_options is active and filters by focus kanji or kosakata', function () {
    $fixture = makeQuizRoadmapFixture();
    $user = Pengguna::factory()->create(['role' => 'user']);
    $quiz = $fixture['quiz'];
    $quiz->update(['shuffle_options' => true, 'max_attempts' => 3, 'explanation_display' => 'after_finish']);
    $quiz->load('module', 'questions', 'day');

    $service = app(PembelajaranPenggunaService::class);
    $expectedPairs = ['Air' => 'みず', 'Api' => 'ひ', 'Angin' => 'かぜ', 'Tanah' => 'つち'];

    $kanjiPayload = $service->quizPayload($user, $quiz, 'kanji');
    expect($kanjiPayload['quiz']['focus'])->toBe('kanji')
        ->and($kanjiPayload['quiz']['max_attempts'])->toBe(3)
        ->and($kanjiPayload['quiz']['attempts_remaining'])->toBe(3)
        ->and($kanjiPayload['questions'])->toHaveCount(1);

    $q = $kanjiPayload['questions']->first();
    foreach ($q['options'] as $idx => $opt) {
        expect($q['option_readings'][$idx])->toBe($expectedPairs[$opt]);
    }

    $kotobaPayload = $service->quizPayload($user, $quiz, 'kosakata');
    expect($kotobaPayload['quiz']['focus'])->toBe('kosakata')
        ->and($kotobaPayload['questions'])->toHaveCount(1)
        ->and($kotobaPayload['questions']->first()['id'])->toBe($fixture['qKotoba']->id);
});

it('blocks quiz attempt submission once max_attempts is reached', function () {
    $fixture = makeQuizRoadmapFixture();
    $user = Pengguna::factory()->create(['role' => 'user']);
    $quiz = $fixture['quiz'];
    $quiz->update(['max_attempts' => 1]);

    PengerjaanKuis::create([
        'user_id' => $user->id,
        'quiz_id' => $quiz->id,
        'status' => 'completed',
        'score' => 50,
        'xp_earned' => 0,
        'started_at' => now()->subMinutes(5),
        'attempted_at' => now()->subMinutes(4),
    ]);

    $this->actingAs($user)
        ->postJson(route('user.attempts.store'), [
            'quiz_id' => $quiz->id,
            'answers' => [
                ['question_id' => $fixture['qKanji']->id, 'answer_text' => 'Air'],
            ],
        ])
        ->assertStatus(422);
});

it('exposes moji_goi counts and focus URLs on user roadmap program page', function () {
    $fixture = makeQuizRoadmapFixture();
    $user = Pengguna::factory()->create(['role' => 'user']);

    $response = $this->actingAs($user)
        ->get(route('user.modul.program', $fixture['program']->slug));

    $response->assertOk();
    $props = $response->viewData('page')['props'];
    $dayPayload = $props['weeks'][0]['days'][0];

    expect($dayPayload['moji_goi']['kanji_count'])->toBe(1)
        ->and($dayPayload['moji_goi']['kotoba_count'])->toBe(1)
        ->and($dayPayload['moji_goi']['kanji_url'])->toContain('focus=kanji')
        ->and($dayPayload['moji_goi']['kotoba_url'])->toContain('focus=kosakata');
});
