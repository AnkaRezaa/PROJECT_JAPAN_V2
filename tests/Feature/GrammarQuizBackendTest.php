<?php

use App\Models\HariModul;
use App\Models\Kuis;
use App\Models\LevelPembelajaran;
use App\Models\LogReward;
use App\Models\Modul;
use App\Models\Pengguna;
use App\Models\ProgramPembelajaran;
use App\Models\ProgresHariModul;
use App\Models\ReviewSoal;
use App\Models\Soal;

function grammarPayload(): array
{
    return [
        'passing_score' => 60,
        'lesson' => [
            'lesson_key' => 'n3-ba-hodo-test',
            'level' => 'JLPT N3',
            'pattern' => 'ba-hodo',
            'title' => 'Semakin, semakin',
            'meaning' => 'Semakin A, semakin B',
            'formula' => 'V-ba + V + hodo',
            'explanation' => 'Pola perbandingan.',
            'examples' => [[
                'japanese' => 'Benkyou sureba suru hodo.',
                'reading' => null,
                'translation' => 'Semakin belajar, semakin mahir.',
            ]],
        ],
        'stages' => [
            [
                'id' => 'transformation',
                'questions' => [[
                    'type' => 'transformation',
                    'prompt' => 'Pilih transformasi yang benar.',
                    'choices' => ['sureba', 'shitara'],
                    'correctAnswer' => 'sureba',
                    'explanation' => 'Gunakan sureba.',
                ]],
            ],
            [
                'id' => 'sentence_builder',
                'questions' => [[
                    'type' => 'sentence_builder',
                    'prompt' => 'Susun kalimat.',
                    'tokens' => [
                        ['id' => 'a', 'text' => 'sureba'],
                        ['id' => 'b', 'text' => 'hodo'],
                    ],
                    'correctOrder' => ['a', 'b'],
                    'explanation' => 'Urutan sureba lalu hodo.',
                ]],
            ],
            [
                'id' => 'context_choice',
                'questions' => [[
                    'type' => 'context_choice',
                    'prompt' => 'Pilih konteks yang benar.',
                    'choices' => ['A', 'B'],
                    'correctAnswer' => 'A',
                    'explanation' => 'A memakai pola yang benar.',
                ]],
            ],
        ],
    ];
}

function grammarFixture(): array
{
    $admin = Pengguna::factory()->create(['role' => 'admin', 'admin_scope' => 'global']);
    $user = Pengguna::factory()->create(['role' => 'user']);
    $level = LevelPembelajaran::create(['level_name' => 'N3', 'stage' => 1, 'is_premium' => false]);
    $program = ProgramPembelajaran::create([
        'level_id' => $level->id,
        'title' => 'JLPT N3 Grammar',
        'slug' => 'jlpt-n3-grammar-test',
        'description' => 'Grammar test',
        'status' => 'published',
    ]);
    $module = Modul::create([
        'level_id' => $level->id,
        'program_pembelajaran_id' => $program->id,
        'title' => 'Week 1',
        'week_number' => 1,
        'status' => 'published',
    ]);
    $day = HariModul::create([
        'module_id' => $module->id,
        'day_number' => 1,
        'title' => 'Hari 1',
        'status' => 'published',
    ]);
    $checkpoint = Kuis::create([
        'module_id' => $module->id,
        'module_day_id' => $day->id,
        'type' => 'multiple_choice',
        'passing_score' => 70,
        'status' => 'published',
    ]);
    $checkpointQuestion = Soal::create([
        'quiz_id' => $checkpoint->id,
        'type' => 'multiple_choice',
        'question_text' => 'Arti hi?',
        'correct_answer' => 'api',
        'options' => ['api', 'air'],
        'order' => 0,
        'points' => 1,
    ]);
    $day->update(['checkpoint_quiz_id' => $checkpoint->id]);

    return compact('admin', 'user', 'program', 'module', 'day', 'checkpoint', 'checkpointQuestion');
}

it('authors grammar and completes a day only after grammar and vocabulary checkpoint pass', function () {
    $fixture = grammarFixture();

    $this->actingAs($fixture['admin'])
        ->postJson(route('admin.grammar-quizzes.store', $fixture['day']), grammarPayload())
        ->assertCreated()
        ->assertJsonPath('lesson.status', 'draft');

    $grammar = Kuis::where('type', 'grammar')->firstOrFail();
    $this->actingAs($fixture['admin'])
        ->patchJson(route('admin.grammar-quizzes.status', $grammar), ['status' => 'published'])
        ->assertOk();

    $this->actingAs($fixture['user'])
        ->getJson(route('user.grammar-quizzes.show', $grammar))
        ->assertOk()
        ->assertJsonMissing(['correctAnswer'])
        ->assertJsonMissing(['correctOrder']);

    $start = $this->actingAs($fixture['user'])->postJson(route('user.attempts.start', $grammar), [
        'submission_token' => (string) str()->uuid(),
    ])->assertOk()->json();
    $questions = $grammar->questions()->orderBy('order')->get();

    $this->actingAs($fixture['user'])->postJson(route('user.attempts.answers.first', $start['attempt_id']), [
        'submission_token' => $start['submission_token'],
        'question_id' => $questions[0]->id,
        'answer_text' => 'sureba',
    ])->assertJson(['correct' => true, 'recorded' => true]);
    $this->actingAs($fixture['user'])->postJson(route('user.attempts.answers.first', $start['attempt_id']), [
        'submission_token' => $start['submission_token'],
        'question_id' => $questions[1]->id,
        'answer_payload' => ['ordered_token_ids' => ['b', 'a']],
    ])->assertJson(['correct' => false, 'recorded' => true]);
    $this->actingAs($fixture['user'])->postJson(route('user.attempts.answers.first', $start['attempt_id']), [
        'submission_token' => $start['submission_token'],
        'question_id' => $questions[1]->id,
        'answer_payload' => ['ordered_token_ids' => ['a', 'b']],
    ])->assertJson(['correct' => true, 'recorded' => false]);
    $this->actingAs($fixture['user'])->postJson(route('user.attempts.answers.first', $start['attempt_id']), [
        'submission_token' => $start['submission_token'],
        'question_id' => $questions[2]->id,
        'answer_text' => 'A',
    ])->assertJson(['correct' => true, 'recorded' => true]);

    $this->actingAs($fixture['user'])->postJson(route('user.attempts.store'), [
        'quiz_id' => $grammar->id,
        'attempt_id' => $start['attempt_id'],
        'submission_token' => $start['submission_token'],
        'answers' => [],
    ])->assertOk()
        ->assertJsonPath('score', 67)
        ->assertJsonPath('correct_count', 2)
        ->assertJsonPath('completed_day', false);

    expect(ProgresHariModul::where('user_id', $fixture['user']->id)->exists())->toBeFalse()
        ->and(ReviewSoal::where('user_id', $fixture['user']->id)->where('question_id', $questions[1]->id)->value('last_result'))->toBe('wrong')
        ->and(LogReward::where('user_id', $fixture['user']->id)->where('source_type', 'quiz')->where('source_id', $grammar->id)->count())->toBe(1);

    $this->actingAs($fixture['user'])->postJson(route('user.attempts.store'), [
        'quiz_id' => $fixture['checkpoint']->id,
        'answers' => [[
            'question_id' => $fixture['checkpointQuestion']->id,
            'answer_text' => 'api',
        ]],
    ])->assertOk()->assertJsonPath('completed_day', true);

    expect(ProgresHariModul::where('user_id', $fixture['user']->id)->where('module_day_id', $fixture['day']->id)->whereNotNull('completed_at')->exists())->toBeTrue();
});
