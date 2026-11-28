<?php

use App\Models\Flashcard;
use App\Models\HariModul;
use App\Models\Kosakata;
use App\Models\Kuis;
use App\Models\LevelPembelajaran;
use App\Models\Modul;
use App\Models\PelajaranGrammar;
use App\Models\Pengguna;
use App\Models\ProgramPembelajaran;
use App\Models\SetFlashcard;
use App\Models\Soal;
use App\Services\KuisGrammarService;
use App\Services\PembelajaranPenggunaService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function makeStageOneFixture(): array
{
    $level = LevelPembelajaran::create([
        'level_name' => 'N3',
        'stage' => 3,
        'is_premium' => false,
    ]);

    $program = ProgramPembelajaran::create([
        'level_id' => $level->id,
        'title' => 'Program JLPT N3',
        'slug' => 'program-jlpt-n3-stage1',
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

    $user = Pengguna::factory()->create();

    return compact('level', 'program', 'module', 'day', 'user');
}

it('shuffles sentence builder tokens for students without altering editor order when includeAnswers is true', function () {
    $fixture = makeStageOneFixture();

    $quiz = Kuis::create([
        'module_id' => $fixture['module']->id,
        'module_day_id' => $fixture['day']->id,
        'type' => 'grammar',
        'passing_score' => 70,
        'status' => 'published',
    ]);

    PelajaranGrammar::create([
        'quiz_id' => $quiz->id,
        'lesson_key' => 'n3-saserareru',
        'pattern' => '〜させられる',
        'title' => 'Bentuk Kausatif Pasif',
        'meaning' => 'Disuruh melakukan',
        'formula' => 'V-させられる',
    ]);

    $orderedTokens = [
        ['id' => 't1', 'text' => '彼は', 'reading' => 'かれは', 'distractor' => false],
        ['id' => 't2', 'text' => '毎日', 'reading' => 'まいにち', 'distractor' => false],
        ['id' => 't3', 'text' => '野菜を', 'reading' => 'やさいを', 'distractor' => false],
        ['id' => 't4', 'text' => '切らせられた', 'reading' => 'きらせられた', 'distractor' => false],
        ['id' => 'd1', 'text' => '切った', 'reading' => 'きった', 'distractor' => true],
    ];

    Soal::create([
        'quiz_id' => $quiz->id,
        'type' => 'sentence_builder',
        'stage' => 'sentence_builder',
        'question_text' => 'Susun kalimat berikut.',
        'options' => [
            'tokens' => $orderedTokens,
            'context' => 'Dia setiap hari disuruh memotong sayur.',
        ],
        'correct_answer' => json_encode(['t1', 't2', 't3', 't4']),
        'order' => 1,
        'points' => 1,
    ]);

    $service = app(KuisGrammarService::class);
    $studentPayload = $service->payload($quiz, false);
    $adminPayload = $service->payload($quiz, true);

    $studentQuestion = collect($studentPayload['stages'])->firstWhere('id', 'sentence_builder')['questions'][0];
    $adminQuestion = collect($adminPayload['stages'])->firstWhere('id', 'sentence_builder')['questions'][0];

    $studentIds = collect($studentQuestion['tokens'])->pluck('id')->all();
    $adminIds = collect($adminQuestion['tokens'])->pluck('id')->all();

    expect($adminIds)->toBe(['t1', 't2', 't3', 't4', 'd1'])
        ->and($adminQuestion['correctOrder'])->toBe(['t1', 't2', 't3', 't4'])
        ->and(count($studentIds))->toBe(5)
        ->and($studentIds)->not->toBe(['t1', 't2', 't3', 't4', 'd1'])
        ->and(array_slice($studentIds, 0, 4))->not->toBe(['t1', 't2', 't3', 't4']);
});

it('disables question narration for explicit word_to_reading and legacy manual reading questions', function () {
    $fixture = makeStageOneFixture();

    $quiz = Kuis::create([
        'module_id' => $fixture['module']->id,
        'module_day_id' => $fixture['day']->id,
        'type' => 'multiple_choice',
        'passing_score' => 70,
        'status' => 'published',
    ]);

    $manualReadingQ = Soal::create([
        'quiz_id' => $quiz->id,
        'type' => 'multiple_choice',
        'stage' => null,
        'question_text' => 'Apa cara baca 流し台？',
        'question_reading' => 'ながしだい',
        'options' => ['すいどうだい', 'ながしだい', 'でんきだい', 'げんかん'],
        'correct_answer' => 'ながしだい',
        'order' => 1,
        'points' => 1,
    ]);

    $meaningQ = Soal::create([
        'quiz_id' => $quiz->id,
        'type' => 'multiple_choice',
        'stage' => null,
        'question_text' => 'Apa arti 換気扇？',
        'question_reading' => 'かんきせん',
        'options' => ['Kipas pembuangan udara', 'Kompor gas', 'Wastafel', 'Kulkas'],
        'correct_answer' => 'Kipas pembuangan udara',
        'order' => 2,
        'points' => 1,
    ]);

    $payload = app(PembelajaranPenggunaService::class)->quizPayload($fixture['user'], $quiz);
    $questionsById = collect($payload['questions'])->keyBy('id');

    expect($questionsById[$manualReadingQ->id]['disable_question_narration'])->toBeTrue()
        ->and($questionsById[$meaningQ->id]['disable_question_narration'])->toBeFalse()
        ->and($questionsById[$meaningQ->id]['question_tts_reading'])->toBe('かんきせん');
});

it('exposes audio_reading_override on flashcard payload from vocabulary metadata', function () {
    $fixture = makeStageOneFixture();

    $vocab = Kosakata::create([
        'module_id' => $fixture['module']->id,
        'word' => '換気扇',
        'reading' => 'かんきせん',
        'meaning_id' => 'kipas pembuangan udara',
        'content_type' => 'kosakata',
        'metadata' => [
            'audio_reading_override' => 'かんきせん',
        ],
        'status' => 'published',
    ]);

    $set = SetFlashcard::create([
        'module_id' => $fixture['module']->id,
        'module_day_id' => $fixture['day']->id,
        'level_id' => $fixture['level']->id,
        'title' => 'Set Hari 1',
        'status' => 'published',
    ]);

    Flashcard::create([
        'flashcard_set_id' => $set->id,
        'vocabulary_id' => $vocab->id,
        'front_text' => '換気扇',
        'reading' => 'かんきせん',
        'back_text' => 'kipas pembuangan udara',
    ]);

    $quiz = Kuis::create([
        'module_id' => $fixture['module']->id,
        'module_day_id' => $fixture['day']->id,
        'type' => 'multiple_choice',
        'passing_score' => 70,
        'status' => 'published',
    ]);

    $payload = app(PembelajaranPenggunaService::class)->quizPayload($fixture['user'], $quiz);
    $flashcards = collect($payload['flashcards']);

    expect($flashcards)->toHaveCount(1)
        ->and($flashcards->first()['reading'])->toBe('かんきせん')
        ->and($flashcards->first()['audio_reading_override'])->toBe('かんきせん');
});
