<?php

use App\Models\HariModul;
use App\Models\Kuis;
use App\Models\Langganan;
use App\Models\LevelPembelajaran;
use App\Models\Modul;
use App\Models\PaketPembayaran;
use App\Models\Pengguna;
use App\Models\ProgramPembelajaran;
use App\Models\ProgresHariModul;
use App\Models\ReviewSoal;
use App\Models\Soal;
use App\Services\QuickQuizSessionService;
use Illuminate\Support\Facades\Cache;

function quickQuizProgram(Pengguna $user, string $suffix): array
{
    $level = LevelPembelajaran::create([
        'level_name' => 'Q'.substr(md5($suffix), 0, 8),
        'stage' => random_int(100, 9999),
        'is_premium' => true,
    ]);
    $program = ProgramPembelajaran::create([
        'level_id' => $level->id,
        'title' => 'Kelas '.$suffix,
        'slug' => 'quick-'.$suffix.'-'.str()->random(5),
        'status' => 'published',
    ]);
    $plan = PaketPembayaran::create([
        'program_pembelajaran_id' => $program->id,
        'name' => 'Paket '.$suffix,
        'slug' => 'quick-plan-'.$suffix.'-'.str()->random(5),
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
        'title' => 'Minggu '.$suffix,
        'week_number' => 1,
        'status' => 'published',
    ]);

    return compact('level', 'program', 'module');
}

function quickQuizDayQuestion(Modul $module, int $dayNumber, string $answer): array
{
    $day = HariModul::create([
        'module_id' => $module->id,
        'day_number' => $dayNumber,
        'title' => 'Hari '.$dayNumber,
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
        'question_text' => 'Jawab '.$answer,
        'correct_answer' => $answer,
        'explanation' => 'Jawabannya '.$answer.'.',
        'order' => 1,
    ]);
    $day->update(['checkpoint_quiz_id' => $quiz->id]);

    return compact('day', 'quiz', 'question');
}

it('builds a quick quiz only from owned and unlocked daily quizzes', function () {
    Cache::flush();
    $user = Pengguna::factory()->create(['role' => 'user', 'xp' => 25]);
    $first = quickQuizProgram($user, 'A');
    $second = quickQuizProgram($user, 'B');
    $otherUser = Pengguna::factory()->create(['role' => 'user']);
    $unowned = quickQuizProgram($otherUser, 'Milik Orang Lain');
    $firstDay = quickQuizDayQuestion($first['module'], 1, 'satu');
    $lockedDay = quickQuizDayQuestion($first['module'], 2, 'dua');
    $secondDay = quickQuizDayQuestion($second['module'], 1, 'tiga');
    $unownedDay = quickQuizDayQuestion($unowned['module'], 1, 'empat');

    $exam = Kuis::create([
        'module_id' => $first['module']->id,
        'exam_order' => 1,
        'type' => 'typing',
        'status' => 'published',
    ]);
    $examQuestion = Soal::create([
        'quiz_id' => $exam->id,
        'type' => 'typing',
        'question_text' => 'Ujian',
        'correct_answer' => 'ujian',
        'order' => 1,
    ]);

    $state = app(QuickQuizSessionService::class)->start($user);

    expect($state)->not->toBeNull()
        ->and($state['target_count'])->toBe(2)
        ->and(array_keys($state['items']))
        ->toContain($firstDay['question']->id, $secondDay['question']->id)
        ->not->toContain($lockedDay['question']->id, $examQuestion->id, $unownedDay['question']->id);

    ProgresHariModul::create([
        'user_id' => $user->id,
        'module_day_id' => $firstDay['day']->id,
        'completed_at' => now(),
    ]);
    app(QuickQuizSessionService::class)->start($user, true);
    $refreshed = app(QuickQuizSessionService::class)->active($user);

    expect(array_keys($refreshed['items']))->toContain($lockedDay['question']->id);
});

it('repeats one wrong answer once without xp attempts or roadmap progress', function () {
    Cache::flush();
    $user = Pengguna::factory()->create(['role' => 'user', 'xp' => 40]);
    $fixture = quickQuizProgram($user, 'Loop');
    $material = quickQuizDayQuestion($fixture['module'], 1, 'benar');
    $sessions = app(QuickQuizSessionService::class);
    $state = $sessions->start($user);
    $payload = $sessions->payload($user, $state);

    $first = $this->actingAs($user)->postJson(route('user.quick-quiz.answer', $state['id']), [
        'item_token' => $payload['current_token'],
        'answer' => 'salah',
    ])->assertOk()->json();

    expect($first['is_correct'])->toBeFalse()
        ->and($first['will_repeat'])->toBeTrue()
        ->and($first['session']['completed'])->toBeFalse()
        ->and($first['session']['current_question']['id'])->toBe($material['question']->id)
        ->and(ReviewSoal::where('user_id', $user->id)->value('wrong_count'))->toBe(1)
        ->and($user->refresh()->xp)->toBe(40)
        ->and($user->attempts()->count())->toBe(0)
        ->and($user->dayProgress()->count())->toBe(0)
        ->and($user->progress()->count())->toBe(0);

    $second = $this->actingAs($user)->postJson(route('user.quick-quiz.answer', $state['id']), [
        'item_token' => $first['session']['current_token'],
        'answer' => 'benar',
    ])->assertOk()->json();

    expect($second['is_correct'])->toBeTrue()
        ->and($second['session']['completed'])->toBeTrue()
        ->and($second['session']['mastered_count'])->toBe(1)
        ->and(ReviewSoal::where('user_id', $user->id)->value('review_count'))->toBe(1);
});

it('resumes the same cached session and rejects another user', function () {
    Cache::flush();
    $user = Pengguna::factory()->create(['role' => 'user']);
    $other = Pengguna::factory()->create(['role' => 'user']);
    $fixture = quickQuizProgram($user, 'Resume');
    quickQuizDayQuestion($fixture['module'], 1, 'lanjut');
    $sessions = app(QuickQuizSessionService::class);
    $state = $sessions->start($user);

    expect($sessions->start($user)['id'])->toBe($state['id']);

    $this->actingAs($user)
        ->get(route('user.quick-quiz.show', $state['id']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('User/Kuis/QuickKuis')
            ->where('quickSession.id', $state['id']));

    $this->actingAs($other)
        ->get(route('user.quick-quiz.show', $state['id']))
        ->assertRedirect(route('user.dashboard'));
});

it('can limit a quick quiz session to one owned class', function () {
    Cache::flush();
    $user = Pengguna::factory()->create(['role' => 'user']);
    $first = quickQuizProgram($user, 'Pilihan A');
    $second = quickQuizProgram($user, 'Pilihan B');
    $firstQuestion = quickQuizDayQuestion($first['module'], 1, 'satu')['question'];
    $secondQuestion = quickQuizDayQuestion($second['module'], 1, 'dua')['question'];
    $sessions = app(QuickQuizSessionService::class);

    $summary = $sessions->summary($user);
    $state = $sessions->start($user, true, $second['program']->id);

    expect($summary['programs'])->toHaveCount(2)
        ->and(collect($summary['programs'])->pluck('id')->all())
        ->toContain($first['program']->id, $second['program']->id)
        ->and($state['selected_program_id'])->toBe($second['program']->id)
        ->and(array_keys($state['items']))
        ->toContain($secondQuestion->id)
        ->not->toContain($firstQuestion->id);
});
