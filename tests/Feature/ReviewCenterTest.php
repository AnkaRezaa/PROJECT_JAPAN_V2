<?php

use App\Models\EventReview;
use App\Models\Flashcard;
use App\Models\HariModul;
use App\Models\Kuis;
use App\Models\LevelPembelajaran;
use App\Models\Modul;
use App\Models\Pengguna;
use App\Models\ProgramPembelajaran;
use App\Models\ReviewDailyStat;
use App\Models\ReviewFlashcard;
use App\Models\ReviewSoal;
use App\Models\SetFlashcard;
use App\Models\Soal;
use App\Services\RepetisiPembelajaranService;
use Illuminate\Support\Facades\Cache;

function reviewHistoryFixture(): array
{
    $suffix = str()->lower(str()->random(8));
    $level = LevelPembelajaran::create([
        'level_name' => 'R'.str()->upper($suffix),
        'stage' => random_int(100, 9999),
        'is_premium' => true,
    ]);
    $program = ProgramPembelajaran::create([
        'level_id' => $level->id,
        'title' => 'Kelas Review '.$suffix,
        'slug' => 'review-'.$suffix,
        'status' => 'published',
    ]);
    $module = Modul::create([
        'level_id' => $level->id,
        'program_pembelajaran_id' => $program->id,
        'title' => 'Minggu Review',
        'week_number' => 1,
        'status' => 'published',
    ]);
    $day = HariModul::create([
        'module_id' => $module->id,
        'day_number' => 1,
        'title' => 'Hari Review',
        'status' => 'published',
    ]);
    $quiz = Kuis::create([
        'module_id' => $module->id,
        'module_day_id' => $day->id,
        'type' => 'typing',
        'status' => 'published',
    ]);
    $question = Soal::create([
        'quiz_id' => $quiz->id,
        'type' => 'typing',
        'question_text' => 'Apa arti manabu?',
        'question_reading' => 'manabu',
        'correct_answer' => 'belajar',
        'explanation' => 'Manabu berarti belajar.',
        'order' => 1,
    ]);
    $set = SetFlashcard::create([
        'level_id' => $level->id,
        'module_id' => $module->id,
        'module_day_id' => $day->id,
        'title' => 'Flashcard Review',
        'status' => 'published',
    ]);
    $flashcard = Flashcard::create([
        'flashcard_set_id' => $set->id,
        'front_text' => 'manabu',
        'reading' => 'manabu',
        'back_text' => 'belajar',
        'order' => 1,
    ]);

    return compact('module', 'quiz', 'question', 'flashcard');
}

it('records normal question and flashcard answers as lightweight review history', function () {
    Cache::flush();
    $user = Pengguna::factory()->create(['role' => 'user']);
    $fixture = reviewHistoryFixture();
    $repetition = app(RepetisiPembelajaranService::class);

    $repetition->catatJawabanSoal($user, $fixture['question'], false, $fixture['quiz']);
    $repetition->catatJawabanSoal($user, $fixture['question'], true, $fixture['quiz']);
    $repetition->catatReviewFlashcard($user, $fixture['flashcard'], true, 'recognition');
    $repetition->catatReviewFlashcard($user, $fixture['flashcard'], false, 'writing');

    expect(EventReview::where('user_id', $user->id)->orderBy('id')->pluck('result')->all())
        ->toBe(['wrong', 'correct', 'correct', 'wrong'])
        ->and(EventReview::where('user_id', $user->id)->orderBy('id')->pluck('learning_state')->all())
        ->toBe(['new', 'learning', 'new', 'new'])
        ->and(EventReview::where('user_id', $user->id)->orderBy('id')->pluck('activity_type')->all())
        ->toBe(['typing', 'typing', 'flashcard', 'kanji_writing'])
        ->and(ReviewDailyStat::where('user_id', $user->id)->value('total_count'))->toBe(4)
        ->and(ReviewFlashcard::where('user_id', $user->id)->count())->toBe(2);
});

it('shows paginated review history statistics and filters only the current user', function () {
    Cache::flush();
    $user = Pengguna::factory()->create(['role' => 'user']);
    $otherUser = Pengguna::factory()->create(['role' => 'user']);
    $fixture = reviewHistoryFixture();
    $repetition = app(RepetisiPembelajaranService::class);

    $repetition->catatJawabanSoal($user, $fixture['question'], true, $fixture['quiz']);
    $repetition->catatReviewFlashcard($user, $fixture['flashcard'], false, 'writing');
    $repetition->catatJawabanSoal($otherUser, $fixture['question'], false, $fixture['quiz']);

    $this->actingAs($user)
        ->get(route('user.review.index', ['range' => 7, 'activity' => 'typing']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('User/Review/Index')
            ->where('reviewStats.total_count', 2)
            ->where('reviewStats.correct_count', 1)
            ->where('reviewStats.wrong_count', 1)
            ->where('reviewStats.accuracy', 50)
            ->where('filters.activity', 'typing')
            ->has('reviewEvents.data', 1)
            ->where('reviewEvents.data.0.label', 'Apa arti manabu?'));
});

it('purges event history without changing mastery state', function () {
    $user = Pengguna::factory()->create(['role' => 'user']);
    $fixture = reviewHistoryFixture();
    $review = app(RepetisiPembelajaranService::class)
        ->catatJawabanSoal($user, $fixture['question'], true, $fixture['quiz']);

    $this->actingAs($user)
        ->delete(route('user.review.history.purge'))
        ->assertRedirect();

    expect(EventReview::where('user_id', $user->id)->count())->toBe(0)
        ->and(ReviewDailyStat::where('user_id', $user->id)->count())->toBe(0)
        ->and($review->fresh()->status)->toBe('learning')
        ->and($review->fresh()->review_count)->toBe(1);
});

it('resets only review state while preserving user progress fields', function () {
    $user = Pengguna::factory()->create(['role' => 'user', 'xp' => 125]);
    $fixture = reviewHistoryFixture();
    $repetition = app(RepetisiPembelajaranService::class);
    $questionReview = $repetition->catatJawabanSoal($user, $fixture['question'], false, $fixture['quiz']);
    $flashcardReview = $repetition->catatReviewFlashcard($user, $fixture['flashcard'], true);

    $this->actingAs($user)
        ->delete(route('user.review.state.reset'))
        ->assertRedirect();

    expect(EventReview::where('user_id', $user->id)->count())->toBe(0)
        ->and(ReviewDailyStat::where('user_id', $user->id)->count())->toBe(0)
        ->and($questionReview->fresh()->status)->toBe('new')
        ->and($questionReview->fresh()->review_count)->toBe(0)
        ->and($questionReview->fresh()->wrong_count)->toBe(0)
        ->and($flashcardReview->fresh()->status)->toBe('new')
        ->and($flashcardReview->fresh()->known_count)->toBe(0)
        ->and($user->fresh()->xp)->toBe(125);
});

it('prunes review events older than the configured retention period', function () {
    $user = Pengguna::factory()->create(['role' => 'user']);
    $fixture = reviewHistoryFixture();
    $review = app(RepetisiPembelajaranService::class)
        ->catatJawabanSoal($user, $fixture['question'], false, $fixture['quiz']);
    EventReview::query()->update(['occurred_at' => now()->subDays(31)]);
    ReviewDailyStat::query()->update(['stat_date' => today()->subDays(31)]);

    $this->artisan('reviews:prune', ['--days' => 30, '--chunk' => 100])->assertSuccessful();

    expect(EventReview::count())->toBe(0)
        ->and(ReviewDailyStat::count())->toBe(0)
        ->and(ReviewSoal::whereKey($review->id)->exists())->toBeTrue();
});

it('keeps only the newest bounded detail events without losing daily statistics', function () {
    $user = Pengguna::factory()->create(['role' => 'user']);
    $fixture = reviewHistoryFixture();
    $repetition = app(RepetisiPembelajaranService::class);

    foreach (range(1, 25) as $iteration) {
        $repetition->catatJawabanSoal($user, $fixture['question'], $iteration % 2 === 0, $fixture['quiz']);
    }

    $this->artisan('reviews:prune', ['--days' => 30, '--limit' => 20, '--chunk' => 100])
        ->assertSuccessful();

    expect(EventReview::where('user_id', $user->id)->count())->toBe(20)
        ->and(ReviewDailyStat::where('user_id', $user->id)->value('total_count'))->toBe(25)
        ->and(app(RepetisiPembelajaranService::class)->historyStats($user, 30)['total_count'])->toBe(25);
});
