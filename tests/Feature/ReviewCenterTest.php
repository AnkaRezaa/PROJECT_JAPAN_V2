<?php

use App\Models\EventReview;
use App\Models\Flashcard;
use App\Models\HariModul;
use App\Models\Kuis;
use App\Models\Langganan;
use App\Models\LevelPembelajaran;
use App\Models\Modul;
use App\Models\PaketPembayaran;
use App\Models\Pengguna;
use App\Models\ProgramPembelajaran;
use App\Models\ReviewFlashcard;
use App\Models\ReviewSoal;
use App\Models\SesiReview;
use App\Models\SetFlashcard;
use App\Models\Soal;
use App\Services\RepetisiPembelajaranService;
use App\Services\SesiReviewService;
use Illuminate\Support\Facades\Cache;

function reviewCenterFixture(Pengguna $user): array
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
    $plan = PaketPembayaran::create([
        'program_pembelajaran_id' => $program->id,
        'name' => 'Paket Review '.$suffix,
        'slug' => 'review-plan-'.$suffix,
        'price' => 10000,
        'duration_days' => 30,
        'is_active' => true,
    ]);
    Langganan::create([
        'user_id' => $user->id,
        'payment_plan_id' => $plan->id,
        'scope_type' => 'program',
        'program_pembelajaran_id' => $program->id,
        'status' => 'active',
        'start_date' => today(),
        'end_date' => today()->addMonth(),
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
        'question_text' => 'Apa arti 学?',
        'correct_answer' => 'belajar',
        'explanation' => '学 berarti belajar.',
        'order' => 1,
    ]);
    $day->update(['checkpoint_quiz_id' => $quiz->id]);
    $set = SetFlashcard::create([
        'level_id' => $level->id,
        'module_id' => $module->id,
        'module_day_id' => $day->id,
        'title' => 'Flashcard Review',
        'status' => 'published',
    ]);
    $flashcard = Flashcard::create([
        'flashcard_set_id' => $set->id,
        'front_text' => '学',
        'reading' => 'がく',
        'back_text' => 'belajar',
        'order' => 1,
    ]);

    return compact('program', 'module', 'day', 'quiz', 'question', 'set', 'flashcard');
}

it('shows a review center and limits new material to three items', function () {
    Cache::flush();
    $user = Pengguna::factory()->create(['role' => 'user']);
    reviewCenterFixture($user);

    $this->actingAs($user)
        ->get(route('user.review.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('User/Review/Index')
            ->where('reviewSummary.new_count', 3)
            ->where('reviewSummary.required_count', 0)
            ->where('reviewSummary.session_count', 3));
});

it('records every review answer but changes mastery only on the first attempt', function () {
    Cache::flush();
    $user = Pengguna::factory()->create(['role' => 'user', 'xp' => 10]);
    $fixture = reviewCenterFixture($user);
    ReviewSoal::create([
        'user_id' => $user->id,
        'question_id' => $fixture['question']->id,
        'quiz_id' => $fixture['quiz']->id,
        'module_id' => $fixture['module']->id,
        'status' => 'learning',
        'last_result' => 'wrong',
        'wrong_count' => 1,
        'review_count' => 1,
        'next_review_at' => now()->subMinute(),
    ]);
    $sessions = app(SesiReviewService::class);
    $state = $sessions->start($user);
    $payload = $sessions->payload($user, $state);

    expect($payload['current_item']['id'])->toBe($fixture['question']->id);

    $wrong = $this->actingAs($user)->postJson(route('user.review.answer', $state['id']), [
        'item_token' => $payload['current_token'],
        'answer' => 'salah',
    ])->assertOk()->json();
    $correct = $this->actingAs($user)->postJson(route('user.review.answer', $state['id']), [
        'item_token' => $wrong['session']['current_token'],
        'answer' => 'belajar',
    ])->assertOk()->json();

    $review = ReviewSoal::where('user_id', $user->id)->where('question_id', $fixture['question']->id)->firstOrFail();
    expect(EventReview::where('session_id', $state['record_id'])->pluck('result')->all())
        ->toBe(['wrong', 'correct'])
        ->and($review->review_count)->toBe(2)
        ->and($review->wrong_count)->toBe(2)
        ->and($correct['session']['correct_count'])->toBe(1)
        ->and($correct['session']['wrong_count'])->toBe(1)
        ->and($user->refresh()->xp)->toBe(10);
});

it('keeps recognition and writing mastery separate', function () {
    $user = Pengguna::factory()->create(['role' => 'user']);
    $flashcard = reviewCenterFixture($user)['flashcard'];
    $repetition = app(RepetisiPembelajaranService::class);

    $repetition->catatReviewFlashcard($user, $flashcard, true, 'recognition');
    $repetition->catatReviewFlashcard($user, $flashcard, false, 'writing');

    expect(ReviewFlashcard::where('user_id', $user->id)->where('flashcard_id', $flashcard->id)->count())->toBe(2)
        ->and(ReviewFlashcard::where('user_id', $user->id)->where('skill', 'recognition')->value('last_result'))->toBe('correct')
        ->and(ReviewFlashcard::where('user_id', $user->id)->where('skill', 'writing')->value('last_result'))->toBe('wrong');
});

it('records skip as neutral and can undo the latest answer', function () {
    Cache::flush();
    $user = Pengguna::factory()->create(['role' => 'user']);
    $fixture = reviewCenterFixture($user);
    $sessions = app(SesiReviewService::class);
    $state = $sessions->start($user);
    $payload = $sessions->payload($user, $state);

    $skipped = $this->actingAs($user)->postJson(route('user.review.skip', $state['id']), [
        'item_token' => $payload['current_token'],
    ])->assertOk()->json();

    expect($skipped['session']['skipped_count'])->toBe(1)
        ->and(EventReview::where('session_id', $state['record_id'])->value('result'))->toBe('skipped')
        ->and(ReviewSoal::where('user_id', $user->id)->count())->toBe(0)
        ->and(ReviewFlashcard::where('user_id', $user->id)->count())->toBe(0);

    $restored = $this->actingAs($user)
        ->postJson(route('user.review.undo', $state['id']))
        ->assertOk()
        ->json('session');

    expect($restored['resolved_count'])->toBe(0)
        ->and($restored['skipped_count'])->toBe(0)
        ->and(EventReview::where('session_id', $state['record_id'])->whereNotNull('undone_at')->count())->toBe(1);
});

it('prunes detailed history after thirty days without deleting mastery', function () {
    $user = Pengguna::factory()->create(['role' => 'user']);
    $fixture = reviewCenterFixture($user);
    $review = app(RepetisiPembelajaranService::class)->catatJawabanSoal($user, $fixture['question'], false, $fixture['quiz']);
    $session = SesiReview::create([
        'uuid' => (string) str()->uuid(),
        'user_id' => $user->id,
        'mode' => 'review',
        'target_count' => 1,
        'started_at' => now()->subDays(31),
        'completed_at' => now()->subDays(31),
        'expires_at' => now()->subDays(31),
    ]);
    EventReview::create([
        'session_id' => $session->id,
        'user_id' => $user->id,
        'source_type' => 'question',
        'source_id' => $fixture['question']->id,
        'skill' => 'quiz',
        'result' => 'wrong',
        'occurred_at' => now()->subDays(31),
    ]);

    $this->artisan('reviews:prune', ['--days' => 30, '--chunk' => 100])->assertSuccessful();

    expect(EventReview::count())->toBe(0)
        ->and(SesiReview::count())->toBe(0)
        ->and(ReviewSoal::whereKey($review->id)->exists())->toBeTrue();
});
