<?php

use App\Models\Flashcard;
use App\Models\HariModul;
use App\Models\Kosakata;
use App\Models\Kuis;
use App\Models\LevelPembelajaran;
use App\Models\Modul;
use App\Models\PengerjaanKuis;
use App\Models\Pengguna;
use App\Models\ProgramPembelajaran;
use App\Models\ReviewFlashcard;
use App\Models\SetFlashcard;
use App\Models\Soal;
use App\Services\PembelajaranPenggunaService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function makeSeparatedQuizFixture(): array
{
    $level = LevelPembelajaran::create([
        'level_name' => 'N3',
        'stage' => 3,
        'is_premium' => false,
    ]);

    $program = ProgramPembelajaran::create([
        'level_id' => $level->id,
        'title' => 'Program JLPT N3 Flow',
        'slug' => 'program-jlpt-n3-separated-flow',
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
        'title' => 'Rumah & Dapur',
        'status' => 'published',
    ]);

    $kanji1 = Kosakata::create([
        'module_id' => $module->id,
        'word' => '関',
        'reading' => 'かん',
        'meaning_id' => 'berkaitan',
        'content_type' => 'kanji',
        'status' => 'published',
    ]);
    $kanji2 = Kosakata::create([
        'module_id' => $module->id,
        'word' => '係',
        'reading' => 'けい',
        'meaning_id' => 'hubungan',
        'content_type' => 'kanji',
        'status' => 'published',
    ]);
    $kotoba1 = Kosakata::create([
        'module_id' => $module->id,
        'word' => '換気扇',
        'reading' => 'かんきせん',
        'meaning_id' => 'kipas pembuangan udara',
        'content_type' => 'kosakata',
        'status' => 'published',
    ]);
    $kotoba2 = Kosakata::create([
        'module_id' => $module->id,
        'word' => '流し台',
        'reading' => 'ながしだい',
        'meaning_id' => 'wastafel dapur',
        'content_type' => 'kosakata',
        'status' => 'published',
    ]);

    $day->vocabulary()->attach([
        $kanji1->id => ['sort_order' => 1],
        $kanji2->id => ['sort_order' => 2],
        $kotoba1->id => ['sort_order' => 3],
        $kotoba2->id => ['sort_order' => 4],
    ]);

    $set = SetFlashcard::create([
        'module_id' => $module->id,
        'module_day_id' => $day->id,
        'level_id' => $level->id,
        'title' => 'Set Hari 1',
        'status' => 'published',
    ]);

    $kanjiCard1 = Flashcard::create([
        'flashcard_set_id' => $set->id,
        'vocabulary_id' => $kanji1->id,
        'front_text' => '関',
        'reading' => 'かん',
        'back_text' => 'berkaitan',
    ]);
    $kanjiCard2 = Flashcard::create([
        'flashcard_set_id' => $set->id,
        'vocabulary_id' => $kanji2->id,
        'front_text' => '係',
        'reading' => 'けい',
        'back_text' => 'hubungan',
    ]);
    $kotobaCard1 = Flashcard::create([
        'flashcard_set_id' => $set->id,
        'vocabulary_id' => $kotoba1->id,
        'front_text' => '換気扇',
        'reading' => 'かんきせん',
        'back_text' => 'kipas pembuangan udara',
    ]);
    $kotobaCard2 = Flashcard::create([
        'flashcard_set_id' => $set->id,
        'vocabulary_id' => $kotoba2->id,
        'front_text' => '流し台',
        'reading' => 'ながしだい',
        'back_text' => 'wastafel dapur',
    ]);

    $quiz = Kuis::create([
        'module_id' => $module->id,
        'module_day_id' => $day->id,
        'type' => 'multiple_choice',
        'passing_score' => 70,
        'status' => 'published',
    ]);
    $day->update(['checkpoint_quiz_id' => $quiz->id]);

    $admin = Pengguna::factory()->create(['role' => 'admin']);
    $user = Pengguna::factory()->create(['role' => 'user']);

    return compact(
        'level', 'program', 'module', 'day', 'set', 'quiz', 'admin', 'user',
        'kanji1', 'kanji2', 'kotoba1', 'kotoba2',
        'kanjiCard1', 'kanjiCard2', 'kotobaCard1', 'kotobaCard2'
    );
}

it('filters flashcard quiz generation by content_type and tags generated questions', function () {
    $f = makeSeparatedQuizFixture();

    $this->actingAs($f['admin'])
        ->post(route('admin.flashcards.generate-quiz', $f['set']->id), [
            'quiz_id' => $f['quiz']->id,
            'mode' => 'word_to_meaning',
            'content_type' => 'kanji',
            'count' => 10,
        ])
        ->assertRedirect();

    $kanjiQuestions = $f['quiz']->questions()->where('content_type', 'kanji')->get();
    expect($kanjiQuestions)->toHaveCount(2)
        ->and($f['quiz']->questions()->where('content_type', 'kosakata')->count())->toBe(0);

    $this->actingAs($f['admin'])
        ->post(route('admin.flashcards.generate-quiz', $f['set']->id), [
            'quiz_id' => $f['quiz']->id,
            'mode' => 'word_to_meaning',
            'content_type' => 'kosakata',
            'count' => 10,
        ])
        ->assertRedirect();

    expect($f['quiz']->questions()->where('content_type', 'kosakata')->count())->toBe(2)
        ->and($f['quiz']->questions()->count())->toBe(4);
});

it('scores focused kanji quiz attempts only against kanji questions and tracks roadmap completion separately', function () {
    $f = makeSeparatedQuizFixture();

    $qKanji1 = Soal::create([
        'quiz_id' => $f['quiz']->id,
        'type' => 'multiple_choice',
        'source_type' => 'vocabulary',
        'source_id' => $f['kanji1']->id,
        'content_type' => 'kanji',
        'question_text' => 'Apa arti 関?',
        'options' => ['berkaitan', 'hubungan'],
        'correct_answer' => 'berkaitan',
        'order' => 1,
        'points' => 1,
    ]);
    $qKanji2 = Soal::create([
        'quiz_id' => $f['quiz']->id,
        'type' => 'multiple_choice',
        'source_type' => 'vocabulary',
        'source_id' => $f['kanji2']->id,
        'content_type' => 'kanji',
        'question_text' => 'Apa arti 係?',
        'options' => ['berkaitan', 'hubungan'],
        'correct_answer' => 'hubungan',
        'order' => 2,
        'points' => 1,
    ]);
    $qKotoba1 = Soal::create([
        'quiz_id' => $f['quiz']->id,
        'type' => 'multiple_choice',
        'source_type' => 'vocabulary',
        'source_id' => $f['kotoba1']->id,
        'content_type' => 'kosakata',
        'question_text' => 'Apa arti 換気扇?',
        'options' => ['kipas pembuangan udara', 'wastafel dapur'],
        'correct_answer' => 'kipas pembuangan udara',
        'order' => 3,
        'points' => 1,
    ]);
    $qKotoba2 = Soal::create([
        'quiz_id' => $f['quiz']->id,
        'type' => 'multiple_choice',
        'source_type' => 'vocabulary',
        'source_id' => $f['kotoba2']->id,
        'content_type' => 'kosakata',
        'question_text' => 'Apa arti 流し台?',
        'options' => ['kipas pembuangan udara', 'wastafel dapur'],
        'correct_answer' => 'wastafel dapur',
        'order' => 4,
        'points' => 1,
    ]);

    // 1. SesiMojiGoi exposes focused quiz handoff URL
    $mojiRes = $this->actingAs($f['user'])
        ->get(route('user.moji-goi.show', ['moduleDay' => $f['day']->id, 'focus' => 'kanji']));
    $mojiRes->assertOk();
    $mojiProps = $mojiRes->viewData('page')['props'];
    expect($mojiProps['quiz_question_count'])->toBe(2)
        ->and($mojiProps['quiz_url'])->toContain('focus=kanji')
        ->and($mojiProps['quiz_url'])->toContain('standalone=1');

    // 2. Standalone focused quiz skips inline flashcards and only loads Kanji questions
    $payload = app(PembelajaranPenggunaService::class)->quizPayload($f['user'], $f['quiz'], 'kanji', true);
    expect(collect($payload['questions'])->pluck('id')->all())->toEqualCanonicalizing([$qKanji1->id, $qKanji2->id])
        ->and($payload['flashcards'])->toHaveCount(0);

    // 3. Complete Kanji flashcards only (without Kanji quiz yet) -> kanji_done must remain false under Option A
    foreach ([$f['kanjiCard1'], $f['kanjiCard2']] as $card) {
        ReviewFlashcard::create([
            'user_id' => $f['user']->id,
            'flashcard_id' => $card->id,
            'skill' => 'recognition',
            'status' => 'known',
            'mastery_level' => 1,
        ]);
    }

    $beforeQuiz = $this->actingAs($f['user'])
        ->get(route('user.modul.program', $f['program']->slug))
        ->viewData('page')['props']['weeks'][0]['days'][0]['moji_goi'];
    expect($beforeQuiz['kanji_done'])->toBeFalse()
        ->and($beforeQuiz['kanji_quiz_count'])->toBe(2)
        ->and($beforeQuiz['kanji_quiz_passed'])->toBeFalse();

    // 4. Submit focused Kanji quiz attempt (2/2 right out of 4 total quiz questions -> must score 100% & pass)
    $attemptRes = $this->actingAs($f['user'])
        ->postJson(route('user.attempts.store'), [
            'quiz_id' => $f['quiz']->id,
            'focus' => 'kanji',
            'answers' => [
                ['question_id' => $qKanji1->id, 'answer_text' => 'berkaitan'],
                ['question_id' => $qKanji2->id, 'answer_text' => 'hubungan'],
            ],
        ]);
    $attemptRes->assertOk();
    expect($attemptRes->json('score'))->toBe(100)
        ->and($attemptRes->json('passed'))->toBeTrue();

    $storedAttempt = PengerjaanKuis::latest('id')->first();
    expect($storedAttempt->focus)->toBe('kanji')
        ->and((int) $storedAttempt->score)->toBe(100);

    // 5. Roadmap now marks Kanji done (score 100), while Kotoba remains not done
    $afterKanji = $this->actingAs($f['user'])
        ->get(route('user.modul.program', $f['program']->slug))
        ->viewData('page')['props']['weeks'][0]['days'][0]['moji_goi'];
    expect($afterKanji['kanji_done'])->toBeTrue()
        ->and($afterKanji['kanji_best_score'])->toBe(100)
        ->and($afterKanji['kotoba_done'])->toBeFalse()
        ->and($afterKanji['kotoba_best_score'])->toBeNull()
        ->and($afterKanji['moji_goi_done'])->toBeFalse();
});
