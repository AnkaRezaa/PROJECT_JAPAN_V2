<?php

use App\Models\HariModul;
use App\Models\Kosakata;
use App\Models\Kuis;
use App\Models\LevelPembelajaran;
use App\Models\Modul;
use App\Models\ProgramPembelajaran;
use App\Services\SoalKuisService;
use Illuminate\Support\Str;

function dailyScopeGeneratorFixture(): array
{
    $level = LevelPembelajaran::create(['level_name' => 'N5', 'stage' => 1, 'is_premium' => false]);
    $program = ProgramPembelajaran::create([
        'level_id' => $level->id,
        'title' => 'Program Vocab Scope',
        'slug' => 'program-vocab-scope-' . Str::random(6),
        'status' => 'published',
    ]);
    $module = Modul::create([
        'level_id' => $level->id,
        'program_pembelajaran_id' => $program->id,
        'title' => 'Week 1 Vocab Scope',
        'week_number' => 1,
        'status' => 'published',
    ]);
    $day1 = HariModul::create([
        'module_id' => $module->id,
        'day_number' => 1,
        'title' => 'Hari 1',
        'status' => 'published',
    ]);
    $day2 = HariModul::create([
        'module_id' => $module->id,
        'day_number' => 2,
        'title' => 'Hari 2',
        'status' => 'published',
    ]);
    $day3Empty = HariModul::create([
        'module_id' => $module->id,
        'day_number' => 3,
        'title' => 'Hari 3 (Kosong)',
        'status' => 'published',
    ]);

    // Kosakata Day 1 (3 kata)
    $wordsDay1 = collect();
    for ($i = 1; $i <= 3; $i++) {
        $word = Kosakata::create([
            'module_id' => $module->id,
            'word' => "Kata Day1_{$i}",
            'reading' => "かた_{$i}",
            'meaning_id' => "Arti Day1_{$i}",
            'status' => 'published',
            'content_type' => 'kosakata',
            'jlpt_level' => 'N5',
        ]);
        $day1->vocabulary()->attach($word->id, ['sort_order' => $i]);
        $wordsDay1->push($word);
    }

    // Kosakata Day 2 (3 kata)
    $wordsDay2 = collect();
    for ($j = 1; $j <= 3; $j++) {
        $word = Kosakata::create([
            'module_id' => $module->id,
            'word' => "Kata Day2_{$j}",
            'reading' => "かた_{$j}",
            'meaning_id' => "Arti Day2_{$j}",
            'status' => 'published',
            'content_type' => 'kosakata',
            'jlpt_level' => 'N5',
        ]);
        $day2->vocabulary()->attach($word->id, ['sort_order' => $j]);
        $wordsDay2->push($word);
    }

    $quizDay1 = Kuis::create([
        'module_id' => $module->id,
        'module_day_id' => $day1->id,
        'type' => 'multiple_choice',
        'passing_score' => 70,
        'status' => 'draft',
    ]);

    $quizDay3 = Kuis::create([
        'module_id' => $module->id,
        'module_day_id' => $day3Empty->id,
        'type' => 'multiple_choice',
        'passing_score' => 70,
        'status' => 'draft',
    ]);

    return compact('module', 'day1', 'day2', 'day3Empty', 'wordsDay1', 'wordsDay2', 'quizDay1', 'quizDay3');
}

test('auto generate kosakata di kuis Day 1 hanya mengambil kata-kata milik Day 1', function () {
    $fixture = dailyScopeGeneratorFixture();
    $service = app(SoalKuisService::class);

    $preview = $service->previewFromVocabulary($fixture['quizDay1'], [
        'count' => 3,
        'mode' => 'word_to_meaning',
        'status' => 'published',
        'content_type' => 'kosakata',
    ]);

    expect($preview['questions'])->toHaveCount(3);

    $day1WordTexts = $fixture['wordsDay1']->pluck('word')->all();
    $day2WordTexts = $fixture['wordsDay2']->pluck('word')->all();

    foreach ($preview['questions'] as $q) {
        $extractedWord = null;
        foreach ($day1WordTexts as $w1) {
            if (str_contains($q['question_text'], $w1)) {
                $extractedWord = $w1;
                break;
            }
        }
        expect($extractedWord)->not->toBeNull();
        foreach ($day2WordTexts as $w2) {
            expect($q['question_text'])->not->toContain($w2);
        }
    }
});

test('auto generate kosakata graceful fallback ke modul jika hari bersangkutan belum punya relasi kata', function () {
    $fixture = dailyScopeGeneratorFixture();
    $service = app(SoalKuisService::class);

    // quizDay3 berada di Day 3 yang kosong relasi kata
    $preview = $service->previewFromVocabulary($fixture['quizDay3'], [
        'count' => 4,
        'mode' => 'word_to_meaning',
        'status' => 'published',
        'content_type' => 'kosakata',
    ]);

    // Berhasil fallback mengambil kata dari modul (Day 1 & Day 2) tanpa error
    expect($preview['questions'])->toHaveCount(4);
});

test('auto generate kosakata mematuhi pilihan manual vocabulary_ids meskipun beda hari', function () {
    $fixture = dailyScopeGeneratorFixture();
    $service = app(SoalKuisService::class);

    // Kuis di Day 1, tapi admin sengaja memilih kata dari Day 2 secara manual
    $manualDay2Ids = $fixture['wordsDay2']->take(2)->pluck('id')->all();

    $preview = $service->previewFromVocabulary($fixture['quizDay1'], [
        'count' => 2,
        'mode' => 'word_to_meaning',
        'status' => 'published',
        'vocabulary_ids' => $manualDay2Ids,
    ]);

    expect($preview['questions'])->toHaveCount(2);

    $pickedIds = $preview['vocabulary_ids'];
    sort($pickedIds);
    sort($manualDay2Ids);
    expect($pickedIds)->toEqual($manualDay2Ids);
});
