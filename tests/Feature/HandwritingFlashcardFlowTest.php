<?php

use App\Models\Kosakata;
use App\Models\Kuis;
use App\Models\Pengguna;
use App\Models\ReviewFlashcard;
use App\Models\SetFlashcard;
use App\Models\Soal;
use App\Models\Flashcard;
use App\Models\HariModul;
use App\Models\LevelPembelajaran;
use App\Models\Modul;
use App\Models\ProgramPembelajaran;
use App\Models\LogReward;
use App\Models\PengerjaanKuis;
use App\Models\ProgresHariModul;
use App\Services\PembelajaranPenggunaService;
use Database\Seeders\KelasDemoSeeder;
use Inertia\Testing\AssertableInertia as Assert;

it('serves the full vocabulary word and reading to the read-only admin stroke preview', function () {
    $admin = Pengguna::factory()->create(['role' => 'admin', 'admin_scope' => 'global']);
    $entry = Kosakata::create([
        'word' => "\u{4f1a}\u{8b70}",
        'reading' => "\u{304b}\u{3044}\u{304e}",
        'meaning_id' => 'Rapat',
        'status' => 'published',
    ]);
    $before = $entry->fresh()->getAttributes();

    $this->actingAs($admin)->get(route('admin.vocabulary.index', ['search' => $entry->word]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Kosakata/Kosakata')
            ->has('vocabulary.data', 1)
            ->where('vocabulary.data.0.id', $entry->id)
            ->where('vocabulary.data.0.word', $entry->word)
            ->where('vocabulary.data.0.reading', $entry->reading));

    expect($entry->fresh()->getAttributes())->toBe($before)
        ->and(ReviewFlashcard::count())->toBe(0)
        ->and(ProgresHariModul::count())->toBe(0);
});

it('prioritizes due flashcards and excludes legacy handwriting questions from quiz payloads', function () {
    $this->seed(KelasDemoSeeder::class);

    $user = Pengguna::factory()->create(['role' => 'user']);
    $quiz = Kuis::query()
        ->whereNotNull('module_day_id')
        ->with(['module', 'questions'])
        ->firstOrFail();
    $set = SetFlashcard::query()
        ->where('module_id', $quiz->module_id)
        ->where('module_day_id', $quiz->module_day_id)
        ->whereHas('flashcards')
        ->with('flashcards')
        ->firstOrFail();
    $dueCard = $set->flashcards->first();

    ReviewFlashcard::create([
        'user_id' => $user->id,
        'flashcard_id' => $dueCard->id,
        'status' => 'learning',
        'next_review_at' => now()->subMinute(),
    ]);
    Soal::create([
        'quiz_id' => $quiz->id,
        'type' => 'handwriting',
        'question_text' => 'Soal handwriting lama.',
        'correct_answer' => '新',
        'options' => ['practice_only' => true],
        'order' => 99,
        'points' => 1,
    ]);
    $quiz->load('questions');

    $payload = app(PembelajaranPenggunaService::class)->quizPayload($user, $quiz);

    expect($payload['questions']->pluck('type'))->not->toContain('handwriting')
        ->and($payload['flashcards'])->not->toBeEmpty()
        ->and($payload['flashcards']->first()['id'])->toBe($dueCard->id)
        ->and($payload['flashcards']->first()['review_due'])->toBeTrue();
});

it('cleans legacy handwriting questions only when force is supplied', function () {
    $this->seed(KelasDemoSeeder::class);

    $quiz = Kuis::query()->firstOrFail();
    $regularQuestionId = $quiz->questions()->firstOrFail()->id;
    Soal::create([
        'quiz_id' => $quiz->id,
        'type' => 'handwriting',
        'question_text' => 'Soal handwriting lama.',
        'correct_answer' => '新',
        'options' => ['practice_only' => true],
        'order' => 99,
        'points' => 1,
    ]);

    $this->artisan('questions:cleanup-handwriting', ['--dry-run' => true])
        ->assertSuccessful();
    expect(Soal::query()->where('type', 'handwriting')->count())->toBe(1);

    $this->artisan('questions:cleanup-handwriting', ['--force' => true])
        ->assertSuccessful();

    expect(Soal::query()->where('type', 'handwriting')->count())->toBe(0)
        ->and(Soal::query()->whereKey($regularQuestionId)->exists())->toBeTrue();
});

it('records skipped writing as learning without awarding completion XP or completing a Day', function () {
    $level = LevelPembelajaran::create(['level_name' => 'N3', 'stage' => 1, 'is_premium' => false]);
    $program = ProgramPembelajaran::create(['level_id' => $level->id, 'title' => 'Writing test', 'slug' => 'writing-test', 'status' => 'published']);
    $module = Modul::create(['program_pembelajaran_id' => $program->id, 'level_id' => $level->id, 'title' => 'Week 1', 'week_number' => 1, 'status' => 'published']);
    $day = HariModul::create(['module_id' => $module->id, 'day_number' => 1, 'title' => 'Day 1', 'status' => 'published']);
    $set = SetFlashcard::create(['module_id' => $module->id, 'module_day_id' => $day->id, 'title' => 'Writing', 'status' => 'published']);
    $card = Flashcard::create(['flashcard_set_id' => $set->id, 'front_text' => "\u{4e00}", 'back_text' => 'Satu', 'order' => 0]);
    $user = Pengguna::factory()->create(['role' => 'user']);
    $xpBefore = $user->fresh()->xp;

    $this->actingAs($user)->post(route('user.flashcards.review', $card), ['action' => 'learning', 'skill' => 'writing'])
        ->assertRedirect()->assertSessionHasNoErrors();

    $review = ReviewFlashcard::where('user_id', $user->id)->where('flashcard_id', $card->id)->where('skill', 'writing')->firstOrFail();
    expect($review->learning_count)->toBe(1)
        ->and($review->known_count)->toBe(0)
        ->and($user->fresh()->xp)->toBe($xpBefore)
        ->and(LogReward::where('user_id', $user->id)->count())->toBe(0)
        ->and(PengerjaanKuis::where('user_id', $user->id)->count())->toBe(0)
        ->and(ProgresHariModul::where('user_id', $user->id)->count())->toBe(0);
});
