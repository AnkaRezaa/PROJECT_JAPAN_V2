<?php

use App\Models\HariModul;
use App\Models\Kuis;
use App\Models\LevelPembelajaran;
use App\Models\Modul;
use App\Models\PelajaranGrammar;
use App\Models\ProgramPembelajaran;
use App\Models\Soal;
use App\Services\GamifikasiConfigService;
use App\Services\KuisGrammarService;
use App\Services\PenilaianJawabanKuisService;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

test('WB-ALG-001: KuisGrammarService normalizes transformation question correctly', function () {
    $service = app(KuisGrammarService::class);
    $normalized = $service->normalizeQuestion('transformation', [
        'prompt' => 'Ubah kata kerja ke bentuk ば',
        'source_text' => '食べる',
        'choices' => ['食べれば', '食べた', '食べて'],
        'correctAnswer' => '食べれば',
        'explanation' => '食べる menjadi 食べれば',
        'points' => 2,
    ]);

    expect($normalized['type'])->toBe('transformation')
        ->and($normalized['stage'])->toBe('transformation')
        ->and($normalized['question_text'])->toBe('Ubah kata kerja ke bentuk ば')
        ->and($normalized['correct_answer'])->toBe('食べれば')
        ->and($normalized['points'])->toBe(2)
        ->and($normalized['options'])->toHaveKey('choices');
});

test('WB-ALG-002: PenilaianJawabanKuisService correctly evaluates sentence_builder token permutations', function () {
    $penilaian = app(PenilaianJawabanKuisService::class);
    $correctTokens = ['tok_1', 'tok_2', 'tok_3'];
    $jsonCorrect = json_encode($correctTokens);

    // Jawaban urutan benar
    $isCorrect = $penilaian->benarUntukData(
        type: 'sentence_builder',
        correctAnswer: $jsonCorrect,
        options: [],
        answer: null,
        payload: ['ordered_token_ids' => ['tok_1', 'tok_2', 'tok_3']]
    );
    expect($isCorrect)->toBeTrue();

    // Jawaban urutan salah
    $isWrong = $penilaian->benarUntukData(
        type: 'sentence_builder',
        correctAnswer: $jsonCorrect,
        options: [],
        answer: null,
        payload: ['ordered_token_ids' => ['tok_1', 'tok_3', 'tok_2']]
    );
    expect($isWrong)->toBeFalse();
});

test('WB-ALG-003: KuisGrammarService assertPublishable rejects quiz when stages are missing', function () {
    $service = app(KuisGrammarService::class);
    $level = LevelPembelajaran::firstOrCreate(['level_name' => 'WB Publish'], ['stage' => 3]);
    $program = ProgramPembelajaran::firstOrCreate(
        ['title' => 'Program WB Publish'],
        ['level_id' => $level->id, 'slug' => 'program-wb-pub-' . Str::random(4)]
    );
    $module = Modul::firstOrCreate(
        ['title' => 'Modul WB Publish', 'program_pembelajaran_id' => $program->id],
        ['level_id' => $level->id, 'week_number' => 95, 'status' => 'published']
    );
    $day = HariModul::firstOrCreate(
        ['module_id' => $module->id, 'day_number' => 84],
        ['title' => 'Hari Publish', 'status' => 'published']
    );

    $quiz = Kuis::create([
        'module_id' => $module->id,
        'module_day_id' => $day->id,
        'type' => 'grammar',
        'status' => 'draft',
    ]);

    PelajaranGrammar::create([
        'quiz_id' => $quiz->id,
        'lesson_key' => 'wb-pub-' . Str::random(4),
        'level' => 'N3',
        'pattern' => '〜ばかり',
        'title' => 'Hanya/Melulu',
        'meaning' => 'Melakukan hal yang sama terus menerus',
        'formula' => 'V-te + bakari',
    ]);

    // Tambah hanya stage 1
    Soal::create([
        'quiz_id' => $quiz->id,
        'type' => 'transformation',
        'stage' => 'transformation',
        'question_text' => 'Pilih bentuk',
        'correct_answer' => '遊んでばかり',
        'order' => 1,
    ]);

    // Harus throw ValidationException karena stage sentence_builder & context_choice belum ada
    expect(fn () => $service->assertPublishable($quiz))
        ->toThrow(ValidationException::class);
});

test('WB-ALG-004: PenilaianJawabanKuisService evaluates handwriting kanji stroke count and reveals penalty', function () {
    $penilaian = app(PenilaianJawabanKuisService::class);

    // Goresan lengkap tanpa intip (revealed = false)
    $pass = $penilaian->benarUntukData(
        type: 'handwriting',
        correctAnswer: '日',
        options: ['stroke_count' => 4],
        answer: null,
        payload: ['completed_strokes' => 4, 'total_strokes' => 4, 'revealed' => false]
    );
    expect($pass)->toBeTrue();

    // Goresan kurang
    $failIncomplete = $penilaian->benarUntukData(
        type: 'handwriting',
        correctAnswer: '日',
        options: ['stroke_count' => 4],
        answer: null,
        payload: ['completed_strokes' => 3, 'total_strokes' => 4, 'revealed' => false]
    );
    expect($failIncomplete)->toBeFalse();

    // Goresan lengkap tapi memakai hint intip (revealed = true)
    $failRevealed = $penilaian->benarUntukData(
        type: 'handwriting',
        correctAnswer: '日',
        options: ['stroke_count' => 4],
        answer: null,
        payload: ['completed_strokes' => 4, 'total_strokes' => 4, 'revealed' => true]
    );
    expect($failRevealed)->toBeFalse();
});

test('WB-ALG-005: KuisGrammarService normalizes context_choice question with options mapping', function () {
    $service = app(KuisGrammarService::class);
    $normalized = $service->normalizeQuestion('context_choice', [
        'prompt' => 'Pilih respon yang santun',
        'context' => 'Di kantor berbicara kepada atasan',
        'options' => ['どうぞお召し上がりください', '食べてください'],
        'correctAnswer' => 'どうぞお召し上がりください',
        'explanation' => 'Gunakan bentuk keigo',
        'points' => 3,
    ]);

    expect($normalized['type'])->toBe('multiple_choice')
        ->and($normalized['stage'])->toBe('context_choice')
        ->and($normalized['context'])->toBe('Di kantor berbicara kepada atasan')
        ->and($normalized['correct_answer'])->toBe('どうぞお召し上がりください')
        ->and($normalized['points'])->toBe(3);
});

test('WB-ALG-006: GamifikasiConfigService calculates XP tier aligned with weighted score and precision float tolerance', function () {
    $gamifikasi = app(GamifikasiConfigService::class);

    // Skor 100% sempurna (perfect) -> 50 XP
    expect($gamifikasi->quizXpForScore(100))->toBe(50)
        ->and($gamifikasi->quizXpForScore(1.0))->toBe(50)
        ->and($gamifikasi->quizXpForScore(10, 10))->toBe(50);

    // Skor terbobot 91% (misal 10 dari 11 poin) -> tier 80% (35 XP)
    expect($gamifikasi->quizXpForScore(91))->toBe(35);

    // Skor terbobot 75% -> tier 60% (20 XP)
    expect($gamifikasi->quizXpForScore(75))->toBe(20);

    // Skor terbobot 40% -> tier partisipasi (10 XP)
    expect($gamifikasi->quizXpForScore(40))->toBe(10);

    // Skor 0% -> 0 XP
    expect($gamifikasi->quizXpForScore(0))->toBe(0);

    // Kompatibilitas legacy 2 argumen: 8 dari 10 benar (80%) -> 35 XP
    expect($gamifikasi->quizXpForScore(8, 10))->toBe(35);
});
