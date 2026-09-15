<?php

use App\Models\HariModul;
use App\Models\Kuis;
use App\Models\LevelPembelajaran;
use App\Models\Modul;
use App\Models\PengerjaanKuis;
use App\Models\Pengguna;
use App\Models\ProgramPembelajaran;
use App\Models\ProgresHariModul;
use App\Models\UmpanBalikProduk;
use Inertia\Testing\AssertableInertia as Assert;

function createContextualFeedbackLearningFixture(Pengguna $user): array
{
    $level = LevelPembelajaran::create(['level_name' => 'Beta N4', 'stage' => 44]);
    $program = ProgramPembelajaran::create([
        'level_id' => $level->id,
        'title' => 'Program Beta Feedback',
        'slug' => 'program-beta-feedback',
        'status' => 'published',
        'sort_order' => 1,
    ]);
    $module = Modul::create([
        'level_id' => $level->id,
        'program_pembelajaran_id' => $program->id,
        'title' => 'Week Feedback Kontekstual',
        'week_number' => 1,
        'status' => 'published',
    ]);
    $day = HariModul::create([
        'module_id' => $module->id,
        'day_number' => 1,
        'title' => 'Day Feedback',
        'status' => 'published',
    ]);
    $quiz = Kuis::create([
        'module_id' => $module->id,
        'module_day_id' => $day->id,
        'type' => 'multiple_choice',
        'status' => 'published',
    ]);
    $attempt = PengerjaanKuis::create([
        'user_id' => $user->id,
        'quiz_id' => $quiz->id,
        'status' => 'completed',
        'score' => 80,
        'xp_earned' => 10,
        'started_at' => now()->subMinute(),
        'completed_at' => now(),
        'attempted_at' => now(),
    ]);
    $dayProgress = ProgresHariModul::create([
        'user_id' => $user->id,
        'module_day_id' => $day->id,
        'score' => 80,
        'completed_at' => now(),
    ]);

    return compact('quiz', 'attempt', 'day', 'dayProgress');
}

beforeEach(function () {
    config()->set('beta.contextual_feedback_enabled', true);
});

it('stores contextual feedback once for a completed owned quiz attempt', function () {
    $user = Pengguna::factory()->create(['role' => 'user']);
    ['attempt' => $attempt] = createContextualFeedbackLearningFixture($user);

    $this->actingAs($user)
        ->getJson(route('contextual-feedback.status', ['feature' => 'quiz', 'context_id' => $attempt->id]))
        ->assertOk()
        ->assertJsonPath('recorded', false);

    $payload = [
        'feature' => 'quiz',
        'context_id' => $attempt->id,
        'response_type' => 'submitted',
        'rating' => 4,
        'reason' => 'clear_questions',
        'message' => 'Penjelasan hasil kuis sudah cukup jelas.',
        'page_url' => 'https://external.example/user/quizzes/99?attempt=secret',
    ];

    $this->actingAs($user)->postJson(route('contextual-feedback.store'), $payload)->assertCreated();
    $this->actingAs($user)->postJson(route('contextual-feedback.store'), $payload)->assertOk()->assertJsonPath('idempotent', true);

    expect(UmpanBalikProduk::query()->count())->toBe(1);
    $this->assertDatabaseHas('product_feedback', [
        'user_id' => $user->id,
        'source' => 'contextual',
        'feature' => 'quiz',
        'context_key' => 'quiz_attempt:'.$attempt->id,
        'rating' => 4,
        'response_type' => 'submitted',
        'page_url' => '/user/quizzes/99',
    ]);
});

it('records a skipped day prompt and rejects another users context', function () {
    $owner = Pengguna::factory()->create(['role' => 'user']);
    $other = Pengguna::factory()->create(['role' => 'user']);
    ['day' => $day, 'attempt' => $attempt] = createContextualFeedbackLearningFixture($owner);

    $this->actingAs($owner)->postJson(route('contextual-feedback.store'), [
        'feature' => 'lesson_day',
        'context_id' => $day->id,
        'response_type' => 'skipped',
    ])->assertCreated();

    $this->assertDatabaseHas('product_feedback', [
        'user_id' => $owner->id,
        'context_key' => 'day_completion:'.$day->id,
        'response_type' => 'skipped',
        'status' => 'dismissed',
        'rating' => null,
    ]);

    $this->actingAs($other)->postJson(route('contextual-feedback.store'), [
        'feature' => 'quiz',
        'context_id' => $attempt->id,
        'response_type' => 'submitted',
        'rating' => 5,
    ])->assertUnprocessable()->assertJsonValidationErrors('context_id');
});

it('returns validation errors for an unsupported contextual reason', function () {
    $user = Pengguna::factory()->create(['role' => 'user']);
    ['attempt' => $attempt] = createContextualFeedbackLearningFixture($user);

    $this->actingAs($user)->postJson(route('contextual-feedback.store'), [
        'feature' => 'quiz',
        'context_id' => $attempt->id,
        'response_type' => 'submitted',
        'rating' => 4,
        'reason' => 'reason_yang_tidak_didukung',
    ])->assertUnprocessable()->assertJsonValidationErrors('reason');
});

it('keeps skipped responses out of the default superadmin inbox', function () {
    $owner = Pengguna::factory()->create(['role' => 'user']);
    $superadmin = Pengguna::factory()->create(['role' => 'superadmin']);
    ['day' => $day, 'attempt' => $attempt] = createContextualFeedbackLearningFixture($owner);

    $this->actingAs($owner)->postJson(route('contextual-feedback.store'), [
        'feature' => 'quiz',
        'context_id' => $attempt->id,
        'response_type' => 'submitted',
        'rating' => 5,
        'reason' => 'clear_questions',
    ])->assertCreated();

    $this->actingAs($owner)->postJson(route('contextual-feedback.store'), [
        'feature' => 'lesson_day',
        'context_id' => $day->id,
        'response_type' => 'skipped',
    ])->assertCreated();

    $this->actingAs($superadmin)
        ->get(route('superadmin.activity', ['view' => 'feedback']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('filters.feedback_response', 'submitted')
            ->has('productFeedback.data', 1)
            ->where('productFeedback.data.0.response_type', 'submitted'));

    $this->actingAs($superadmin)
        ->get(route('superadmin.activity', ['view' => 'feedback', 'feedback_response' => 'all']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->has('productFeedback.data', 2));

    $skipped = UmpanBalikProduk::query()->where('response_type', 'skipped')->firstOrFail();

    $this->actingAs($superadmin)
        ->get(route('superadmin.activity', ['view' => 'feedback', 'feedback_response' => 'skipped']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('productFeedback.data', 1)
            ->where('productFeedback.data.0.status', 'dismissed'));

    $this->actingAs($superadmin)
        ->patch(route('superadmin.activity.feedback.update', $skipped), [
            'status' => 'reviewing',
            'resolution_note' => 'Tidak boleh diproses.',
        ])
        ->assertStatus(422);
});

it('keeps contextual feedback disabled by default', function () {
    config()->set('beta.contextual_feedback_enabled', false);
    $user = Pengguna::factory()->create(['role' => 'user']);
    ['attempt' => $attempt] = createContextualFeedbackLearningFixture($user);

    $this->actingAs($user)->postJson(route('contextual-feedback.store'), [
        'feature' => 'quiz',
        'context_id' => $attempt->id,
        'response_type' => 'submitted',
        'rating' => 5,
    ])->assertNotFound();
});
