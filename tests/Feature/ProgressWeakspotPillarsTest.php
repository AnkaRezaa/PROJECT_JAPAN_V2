<?php

use App\Models\DokkaiParagraph;
use App\Models\DokkaiPassage;
use App\Models\DokkaiQuestion;
use App\Models\HariModul;
use App\Models\JawabanPengerjaanKuis;
use App\Models\Kuis;
use App\Models\LevelPembelajaran;
use App\Models\Modul;
use App\Models\PengerjaanKuis;
use App\Models\Pengguna;
use App\Models\ProgramPembelajaran;
use App\Models\ReviewSoal;
use App\Models\Soal;
use App\Services\RingkasanProgresPenggunaService;
use Illuminate\Support\Str;

test('progress summary hanya memuat 3 pilar riil tanpa choukai', function () {
    $user = Pengguna::factory()->create(['role' => 'user']);
    $summaryService = app(RingkasanProgresPenggunaService::class);

    $summary = $summaryService->summary($user);

    expect($summary)->toHaveKey('category_cards');
    $categoryCards = $summary['category_cards'];

    // Harus tepat 3 pilar: vocab, grammar, dokkai
    expect($categoryCards)->toHaveCount(3);
    $pillarIds = collect($categoryCards)->pluck('id')->all();
    expect($pillarIds)->toEqual(['vocab', 'grammar', 'dokkai']);
    expect($pillarIds)->not->toContain('choukai');
    expect($pillarIds)->not->toContain('kanji');

    // Topic activity juga tidak boleh memuat Listening
    $skills = $summary['skills'];
    $skillLabels = collect($skills)->pluck('label')->all();
    expect($skillLabels)->not->toContain('Listening');
});

test('weakspot per pilar mendeteksi soal salah riil secara dinamis', function () {
    $user = Pengguna::factory()->create(['role' => 'user']);
    $level = LevelPembelajaran::create(['level_name' => 'N5', 'stage' => 1, 'is_premium' => false]);
    $program = ProgramPembelajaran::create([
        'level_id' => $level->id,
        'title' => 'Program N5 Test',
        'slug' => 'program-n5-test-' . Str::random(6),
        'status' => 'published',
    ]);
    $module = Modul::create([
        'level_id' => $level->id,
        'program_pembelajaran_id' => $program->id,
        'title' => 'Week 1 Test',
        'week_number' => 1,
        'status' => 'published',
    ]);
    $day = HariModul::create([
        'module_id' => $module->id,
        'day_number' => 1,
        'title' => 'Day 1 Test',
        'status' => 'published',
    ]);

    // 1. Kuis Kosakata
    $vocabQuiz = Kuis::create([
        'module_id' => $module->id,
        'module_day_id' => $day->id,
        'type' => 'multiple_choice',
        'status' => 'published',
    ]);
    $vocabSoal = Soal::create([
        'quiz_id' => $vocabQuiz->id,
        'type' => 'multiple_choice',
        'question_text' => 'Arti kata Taberu adalah?',
        'correct_answer' => 'Makan',
        'options' => ['Makan', 'Minum'],
    ]);

    // 2. Kuis Grammar
    $grammarQuiz = Kuis::create([
        'module_id' => $module->id,
        'module_day_id' => $day->id,
        'type' => 'grammar',
        'status' => 'published',
    ]);
    $grammarSoal = Soal::create([
        'quiz_id' => $grammarQuiz->id,
        'type' => 'grammar',
        'question_text' => 'Pola kalimat ~te kudasai digunakan untuk?',
        'correct_answer' => 'Permintaan sopan',
        'options' => ['Permintaan sopan', 'Larangan'],
    ]);

    // Catat bahwa user salah pada soal kosakata dan grammar di ReviewSoal
    ReviewSoal::create([
        'user_id' => $user->id,
        'question_id' => $vocabSoal->id,
        'quiz_id' => $vocabQuiz->id,
        'module_id' => $module->id,
        'status' => 'learning',
        'wrong_count' => 2,
        'last_result' => 'incorrect',
    ]);

    ReviewSoal::create([
        'user_id' => $user->id,
        'question_id' => $grammarSoal->id,
        'quiz_id' => $grammarQuiz->id,
        'module_id' => $module->id,
        'status' => 'learning',
        'wrong_count' => 1,
        'last_result' => 'incorrect',
    ]);

    $summaryService = app(RingkasanProgresPenggunaService::class);
    $summaryService->forget($user);
    $summary = $summaryService->summary($user);

    $cards = collect($summary['category_cards'])->keyBy('id');

    // Cek kartu kosakata
    $vocabCard = $cards->get('vocab');
    expect($vocabCard['failed_count'])->toBe(1);
    expect($vocabCard['has_weakspot'])->toBeTrue();
    expect($vocabCard['weakspots'][0]['title'])->toContain('Arti kata Taberu');
    expect($vocabCard['quiz_url'])->toBe(route('user.weakspot.show', ['category' => 'vocab']));

    // Cek kartu grammar
    $grammarCard = $cards->get('grammar');
    expect($grammarCard['failed_count'])->toBe(1);
    expect($grammarCard['has_weakspot'])->toBeTrue();
    expect($grammarCard['weakspots'][0]['title'])->toContain('Pola kalimat ~te kudasai');
    expect($grammarCard['quiz_url'])->toBe(route('user.weakspot.show', ['category' => 'grammar']));

    // Cek kartu dokkai (belum ada salah)
    $dokkaiCard = $cards->get('dokkai');
    expect($dokkaiCard['failed_count'])->toBe(0);
    expect($dokkaiCard['has_weakspot'])->toBeFalse();
    expect($dokkaiCard['quiz_url'])->toBe(route('user.weakspot.show', ['category' => 'dokkai']));
});
