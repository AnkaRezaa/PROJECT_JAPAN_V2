<?php

use App\Models\Flashcard;
use App\Models\HariModul;
use App\Models\Kosakata;
use App\Models\Kuis;
use App\Models\LevelPembelajaran;
use App\Models\Modul;
use App\Models\Pengguna;
use App\Models\ProgramPembelajaran;
use App\Models\ReviewFlashcard;
use App\Models\SetFlashcard;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function makeMojiGoiFixture(): array
{
    $level = LevelPembelajaran::create([
        'level_name' => 'N3',
        'stage' => 3,
        'is_premium' => false,
    ]);

    $program = ProgramPembelajaran::create([
        'level_id' => $level->id,
        'title' => 'Program JLPT N3 Moji-Goi',
        'slug' => 'program-jlpt-n3-mojigoi',
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
        'kotoba_intro_title' => 'Pengantar Kosakata Dapur',
        'kotoba_intro_body' => 'Pelajari nama peralatan dapur sehari-hari.',
        'status' => 'published',
    ]);

    $kanjiVocab = Kosakata::create([
        'module_id' => $module->id,
        'word' => '関',
        'reading' => 'かん',
        'meaning_id' => 'berkaitan; hubungan',
        'content_type' => 'kanji',
        'status' => 'published',
    ]);

    $kotobaVocab = Kosakata::create([
        'module_id' => $module->id,
        'word' => '換気扇',
        'reading' => 'かんきせん',
        'meaning_id' => 'kipas pembuangan udara',
        'content_type' => 'kosakata',
        'status' => 'published',
    ]);

    $day->vocabulary()->attach([
        $kanjiVocab->id => ['sort_order' => 1],
        $kotobaVocab->id => ['sort_order' => 2],
    ]);

    $set = SetFlashcard::create([
        'module_id' => $module->id,
        'module_day_id' => $day->id,
        'level_id' => $level->id,
        'title' => 'Set Hari 1',
        'status' => 'published',
    ]);

    $kanjiCard = Flashcard::create([
        'flashcard_set_id' => $set->id,
        'vocabulary_id' => $kanjiVocab->id,
        'front_text' => '関',
        'reading' => 'かん',
        'back_text' => 'berkaitan; hubungan',
    ]);

    $kotobaCard = Flashcard::create([
        'flashcard_set_id' => $set->id,
        'vocabulary_id' => $kotobaVocab->id,
        'front_text' => '換気扇',
        'reading' => 'かんきせん',
        'back_text' => 'kipas pembuangan udara',
    ]);

    $quiz = Kuis::create([
        'module_id' => $module->id,
        'module_day_id' => $day->id,
        'type' => 'multiple_choice',
        'passing_score' => 70,
        'status' => 'published',
    ]);
    $day->update(['checkpoint_quiz_id' => $quiz->id]);

    $user = Pengguna::factory()->create();

    return compact('level', 'program', 'module', 'day', 'set', 'kanjiCard', 'kotobaCard', 'quiz', 'user');
}

it('serves separated kanji and kotoba sessions with kotoba intro metadata', function () {
    $fixture = makeMojiGoiFixture();

    $kanjiResponse = $this->actingAs($fixture['user'])
        ->get(route('user.moji-goi.show', ['moduleDay' => $fixture['day']->id, 'focus' => 'kanji']));

    $kanjiResponse->assertOk();
    $kanjiProps = $kanjiResponse->viewData('page')['props'];
    expect($kanjiProps['focus'])->toBe('kanji')
        ->and($kanjiProps['cards'])->toHaveCount(1)
        ->and($kanjiProps['cards'][0]['front_text'])->toBe('関');

    $kotobaResponse = $this->actingAs($fixture['user'])
        ->get(route('user.moji-goi.show', ['moduleDay' => $fixture['day']->id, 'focus' => 'kotoba']));

    $kotobaResponse->assertOk();
    $kotobaProps = $kotobaResponse->viewData('page')['props'];
    expect($kotobaProps['focus'])->toBe('kotoba')
        ->and($kotobaProps['day']['kotoba_intro_title'])->toBe('Pengantar Kosakata Dapur')
        ->and($kotobaProps['cards'])->toHaveCount(1)
        ->and($kotobaProps['cards'][0]['front_text'])->toBe('換気扇');
});

it('tracks kanji_done and kotoba_done independently on roadmap program payload', function () {
    $fixture = makeMojiGoiFixture();

    // Mark only Kanji card as known
    ReviewFlashcard::create([
        'user_id' => $fixture['user']->id,
        'flashcard_id' => $fixture['kanjiCard']->id,
        'skill' => 'recognition',
        'status' => 'known',
        'mastery_level' => 1,
    ]);

    $firstRes = $this->actingAs($fixture['user'])
        ->get(route('user.modul.program', $fixture['program']->slug));
    $firstRes->assertOk();

    $dayPayload = $firstRes->viewData('page')['props']['weeks'][0]['days'][0];
    expect($dayPayload['moji_goi']['kanji_done'])->toBeTrue()
        ->and($dayPayload['moji_goi']['kotoba_done'])->toBeFalse()
        ->and($dayPayload['moji_goi']['moji_goi_done'])->toBeFalse();

    // Now mark Kotoba card as known too
    ReviewFlashcard::create([
        'user_id' => $fixture['user']->id,
        'flashcard_id' => $fixture['kotobaCard']->id,
        'skill' => 'recognition',
        'status' => 'known',
        'mastery_level' => 1,
    ]);

    $secondRes = $this->actingAs($fixture['user'])
        ->get(route('user.modul.program', $fixture['program']->slug));
    $secondRes->assertOk();

    $dayPayloadAfter = $secondRes->viewData('page')['props']['weeks'][0]['days'][0];
    expect($dayPayloadAfter['moji_goi']['kanji_done'])->toBeTrue()
        ->and($dayPayloadAfter['moji_goi']['kotoba_done'])->toBeTrue()
        ->and($dayPayloadAfter['moji_goi']['moji_goi_done'])->toBeTrue();
});
