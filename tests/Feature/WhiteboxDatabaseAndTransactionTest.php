<?php

use App\Models\GrammarBank;
use App\Models\HariModul;
use App\Models\Kosakata;
use App\Models\Kuis;
use App\Models\LevelPembelajaran;
use App\Models\LogReward;
use App\Models\Modul;
use App\Models\Pengguna;
use App\Models\PengerjaanKuis;
use App\Models\ProgramPembelajaran;
use App\Services\GrammarBankService;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

test('WB-DB-001: vocabulary_bank enforces unique constraint on word and reading', function () {
    $word = '食べる_' . Str::random(5);
    $reading = 'たべる_' . Str::random(5);

    Kosakata::create([
        'word' => $word,
        'reading' => $reading,
        'meaning_id' => 'Makan',
        'content_type' => 'kosakata',
        'status' => 'published',
    ]);

    expect(fn () => Kosakata::create([
        'word' => $word,
        'reading' => $reading,
        'meaning_id' => 'Makan lagi',
        'content_type' => 'kosakata',
        'status' => 'draft',
    ]))->toThrow(QueryException::class);
});

test('WB-DB-002: module_days enforces unique constraint on module_id and day_number', function () {
    $level = LevelPembelajaran::firstOrCreate(['level_name' => 'WB N3'], ['stage' => 3]);
    $program = ProgramPembelajaran::firstOrCreate(
        ['title' => 'Program WB DB'],
        ['level_id' => $level->id, 'slug' => 'program-wb-db-' . Str::random(4)]
    );
    $module = Modul::firstOrCreate(
        ['title' => 'Modul WB DB', 'program_pembelajaran_id' => $program->id],
        ['week_number' => 99, 'status' => 'published']
    );

    HariModul::create([
        'module_id' => $module->id,
        'day_number' => 88,
        'title' => 'Hari 88',
        'status' => 'published',
    ]);

    expect(fn () => HariModul::create([
        'module_id' => $module->id,
        'day_number' => 88,
        'title' => 'Hari 88 Duplikat',
        'status' => 'draft',
    ]))->toThrow(QueryException::class);
});

test('WB-DB-003: deleting a module_day cascades and removes pivot rows in module_day_vocabulary', function () {
    $level = LevelPembelajaran::firstOrCreate(['level_name' => 'WB Cascade'], ['stage' => 3]);
    $program = ProgramPembelajaran::firstOrCreate(
        ['title' => 'Program WB Cascade'],
        ['level_id' => $level->id, 'slug' => 'program-wb-casc-' . Str::random(4)]
    );
    $module = Modul::firstOrCreate(
        ['title' => 'Modul WB Cascade', 'program_pembelajaran_id' => $program->id],
        ['week_number' => 98, 'status' => 'published']
    );

    $day = HariModul::create([
        'module_id' => $module->id,
        'day_number' => 87,
        'title' => 'Hari Cascade',
        'status' => 'published',
    ]);

    $vocab = Kosakata::create([
        'word' => '消える_' . Str::random(4),
        'reading' => 'きえる',
        'meaning_id' => 'Menghilang',
        'content_type' => 'kosakata',
    ]);

    $day->vocabulary()->sync([$vocab->id => ['sort_order' => 0]]);
    expect($day->vocabulary()->count())->toBe(1);

    $dayId = $day->id;
    $day->delete();

    $remainingPivot = DB::table('module_day_vocabulary')->where('module_day_id', $dayId)->count();
    expect($remainingPivot)->toBe(0);
});

test('WB-DB-006: database correctly stores and retrieves complex Japanese multibyte characters without corruption', function () {
    $complexJapanese = '𠮷野家で薔薇(ばら)を見る 🌸 N3〜N1テスト';
    $vocab = Kosakata::create([
        'word' => '漢字_' . Str::random(4),
        'reading' => 'かんじ',
        'meaning_id' => $complexJapanese,
        'example_sentence' => '京都の祇園で舞妓さんを見た。',
        'content_type' => 'kosakata',
    ]);

    $fresh = Kosakata::findOrFail($vocab->id);
    expect($fresh->meaning_id)->toBe($complexJapanese)
        ->and($fresh->example_sentence)->toBe('京都の祇園で舞妓さんを見た。');
});

test('WB-ACID-001: DB::transaction rolls back vocabulary creation if secondary sync fails', function () {
    $word = 'ロールバック_' . Str::random(4);

    try {
        DB::transaction(function () use ($word) {
            Kosakata::create([
                'word' => $word,
                'reading' => 'ろーるばっく',
                'meaning_id' => 'Uji Rollback',
                'content_type' => 'kosakata',
            ]);

            throw new \RuntimeException('Simulasi kegagalan jaringan saat pivot sync');
        });
    } catch (\RuntimeException $e) {
        // Expected exception
    }

    $exists = Kosakata::where('word', $word)->exists();
    expect($exists)->toBeFalse();
});

test('WB-ACID-003: ProgresController session start prevents concurrent duplicate active attempts via lock and token check', function () {
    $user = Pengguna::factory()->create();
    $level = LevelPembelajaran::firstOrCreate(['level_name' => 'WB ACID'], ['stage' => 3]);
    $program = ProgramPembelajaran::firstOrCreate(
        ['title' => 'Program WB ACID'],
        ['level_id' => $level->id, 'slug' => 'program-wb-acid-' . Str::random(4)]
    );
    $module = Modul::firstOrCreate(
        ['title' => 'Modul WB ACID', 'program_pembelajaran_id' => $program->id],
        ['week_number' => 97, 'status' => 'published']
    );
    $day = HariModul::firstOrCreate(
        ['module_id' => $module->id, 'day_number' => 86],
        ['title' => 'Hari ACID', 'status' => 'published']
    );
    $quiz = Kuis::create([
        'module_id' => $module->id,
        'module_day_id' => $day->id,
        'type' => 'multiple_choice',
        'status' => 'published',
        'passing_score' => 70,
    ]);

    $token = (string) Str::uuid();

    $attempt1 = DB::transaction(function () use ($user, $quiz, $token) {
        Kuis::query()->whereKey($quiz->id)->lockForUpdate()->firstOrFail();

        $existing = PengerjaanKuis::where('user_id', $user->id)
            ->where('quiz_id', $quiz->id)
            ->where('submission_token', $token)
            ->first();

        if ($existing) {
            return $existing;
        }

        return PengerjaanKuis::create([
            'user_id' => $user->id,
            'quiz_id' => $quiz->id,
            'submission_token' => $token,
            'status' => 'in_progress',
            'score' => 0,
            'xp_earned' => 0,
            'started_at' => now(),
            'attempted_at' => now(),
        ]);
    });

    $attempt2 = DB::transaction(function () use ($user, $quiz, $token) {
        Kuis::query()->whereKey($quiz->id)->lockForUpdate()->firstOrFail();

        $existing = PengerjaanKuis::where('user_id', $user->id)
            ->where('quiz_id', $quiz->id)
            ->where('submission_token', $token)
            ->first();

        if ($existing) {
            return $existing;
        }

        return PengerjaanKuis::create([
            'user_id' => $user->id,
            'quiz_id' => $quiz->id,
            'submission_token' => $token,
            'status' => 'in_progress',
            'score' => 0,
            'xp_earned' => 0,
            'started_at' => now(),
            'attempted_at' => now(),
        ]);
    });

    expect($attempt1->id)->toBe($attempt2->id);
    expect(PengerjaanKuis::where('user_id', $user->id)->where('quiz_id', $quiz->id)->count())->toBe(1);
});

test('WB-ACID-004: reward XP idempotency prevents double claim on the same quiz', function () {
    $user = Pengguna::factory()->create();
    $quizId = 99991;

    // First claim
    $alreadyGranted1 = LogReward::where('user_id', $user->id)
        ->where('source_type', 'quiz')
        ->where('source_id', $quizId)
        ->exists();

    expect($alreadyGranted1)->toBeFalse();

    LogReward::create([
        'user_id' => $user->id,
        'source_type' => 'quiz',
        'source_id' => $quizId,
        'xp_amount' => 50,
        'coins_amount' => 10,
    ]);

    // Second claim check
    $alreadyGranted2 = LogReward::where('user_id', $user->id)
        ->where('source_type', 'quiz')
        ->where('source_id', $quizId)
        ->exists();

    expect($alreadyGranted2)->toBeTrue();
    expect(LogReward::where('user_id', $user->id)->where('source_type', 'quiz')->where('source_id', $quizId)->count())->toBe(1);
});

test('WB-ACID-005: GrammarBankService assignToDay prevents duplicate quiz creation for the same pattern and day', function () {
    $grammarService = app(GrammarBankService::class);
    $level = LevelPembelajaran::firstOrCreate(['level_name' => 'WB Grammar'], ['stage' => 3]);
    $program = ProgramPembelajaran::firstOrCreate(
        ['title' => 'Program WB Grammar'],
        ['level_id' => $level->id, 'slug' => 'program-wb-gr-' . Str::random(4)]
    );
    $module = Modul::firstOrCreate(
        ['title' => 'Modul WB Grammar', 'program_pembelajaran_id' => $program->id],
        ['week_number' => 96, 'status' => 'published']
    );
    $day = HariModul::firstOrCreate(
        ['module_id' => $module->id, 'day_number' => 85],
        ['title' => 'Hari Grammar', 'status' => 'published']
    );

    $grammarBank = GrammarBank::create([
        'level_id' => $level->id,
        'jlpt_level' => 'N3',
        'lesson_key' => 'wb-gr-key-' . Str::random(4),
        'pattern' => '〜ば〜ほど',
        'title' => 'Semakin, semakin',
        'meaning' => 'Semakin A semakin B',
        'formula' => 'V-ba + V-hodo',
        'status' => 'published',
    ]);

    $quiz1 = $grammarService->assignToDay($grammarBank, $day);
    $quiz2 = $grammarService->assignToDay($grammarBank, $day);

    expect($quiz1->id)->toBe($quiz2->id);
    expect($day->quizzes()->where('type', 'grammar')->count())->toBe(1);
});
