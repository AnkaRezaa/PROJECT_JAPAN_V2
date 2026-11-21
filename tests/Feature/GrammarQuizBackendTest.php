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
use App\Models\SetFlashcard;
use App\Services\TemplateExcelService;
use Illuminate\Http\UploadedFile;

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

it('reports why a vocabulary quiz with no saved questions cannot be published', function () {
    $fixture = grammarFixture();
    $quiz = Kuis::create([
        'module_id' => $fixture['module']->id,
        'module_day_id' => $fixture['day']->id,
        'type' => 'multiple_choice',
        'status' => 'draft',
    ]);

    $this->actingAs($fixture['admin'])
        ->patchJson(route('admin.quizzes.status', $quiz), ['status' => 'published'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('status');

    expect($quiz->fresh()->status)->toBe('draft');
});

it('only empties draft quizzes and preserves history and concurrent additions', function () {
    $fixture = grammarFixture();
    $quiz = $fixture['checkpoint'];
    $first = $fixture['checkpointQuestion'];
    $url = route('admin.quizzes.builder.update', $quiz);
    $payload = ['questions' => [], 'deleted_question_ids' => [$first->id]];

    $this->actingAs($fixture['admin'])->postJson($url, $payload)
        ->assertUnprocessable()->assertJsonValidationErrors('questions');
    expect($quiz->fresh()->status)->toBe('published');

    $this->patchJson(route('admin.quizzes.status', $quiz), ['status' => 'draft'])->assertRedirect();
    $second = $first->replicate();
    $second->order = 1;
    $second->save();
    $this->postJson($url, $payload)->assertRedirect();
    expect($quiz->questions()->pluck('id')->all())->toBe([$second->id]);

    $this->postJson($url, ['questions' => []])->assertRedirect();
    expect($quiz->questions()->pluck('id')->all())->toBe([$second->id]);

    $attempt = $quiz->attempts()->create(['user_id' => $fixture['user']->id]);
    $answer = $second->attemptAnswers()->create(['attempt_id' => $attempt->id]);
    $this->postJson($url, ['questions' => [], 'deleted_question_ids' => [$second->id]])
        ->assertUnprocessable()->assertJsonValidationErrors('questions');
    expect($answer->fresh())->not->toBeNull();

    $mentor = Pengguna::factory()->create(['role' => 'admin', 'admin_scope' => 'kloter']);
    $this->actingAs($mentor)->postJson($url, ['questions' => [], 'deleted_question_ids' => [$second->id]])->assertForbidden();

    $draft = Kuis::create(['module_id' => $fixture['module']->id, 'module_day_id' => $fixture['day']->id, 'type' => 'multiple_choice', 'status' => 'draft']);
    $only = $first->replicate(['id']);
    $only->quiz_id = $draft->id;
    $only->save();
    $this->actingAs($fixture['admin'])->postJson(route('admin.quizzes.builder.update', $draft), ['questions' => [], 'deleted_question_ids' => [$only->id]])->assertRedirect();
    expect($draft->questions()->count())->toBe(0);
});

it('resolves Grammar highlights on the situation without changing instruction precedence', function () {
    $fixture = grammarFixture();
    $payload = grammarPayload();
    $payload['stages'][2]['questions'][0]['context'] = 'Besok ke (学校).';
    $payload['stages'][2]['questions'][0]['highlight_text'] = '学校';
    $this->actingAs($fixture['admin'])
        ->postJson(route('admin.grammar-quizzes.store', $fixture['day']), $payload)
        ->assertSuccessful()
        ->assertJsonPath('lesson.stages.2.questions.0.context', 'Besok ke 学校.')
        ->assertJsonPath('lesson.stages.2.questions.0.highlight_text', '学校');

    $highlight = \App\Support\QuestionHighlight::grammar('学校', 'Pilih (学校).', 'Besok ke 学校.');
    expect($highlight['prompt'])->toBe('Pilih 学校.')->and($highlight['target'])->toBe('学校');
});

it('keeps quiz import limits and returns an actionable error for both request types', function () {
    $fixture = grammarFixture();
    $quiz = $fixture['checkpoint'];
    $csv = fn () => UploadedFile::fake()->createWithContent('soal.csv', "type,question_text,correct_answer,options\nmultiple_choice,Arti kata?,api,api|air\n");
    $preview = route('admin.quizzes.questions.import.preview', $quiz);
    $commit = route('admin.quizzes.questions.import', $quiz);
    $builder = route('admin.quizzes.builder', $quiz);
    $client = $this->actingAs($fixture['admin']);

    $client->post($preview, ['import_file' => $csv()], ['Accept' => 'application/json'])->assertOk()->assertJsonPath('valid_count', 1);
    $file = app(TemplateExcelService::class)->xlsxPath(['type', 'question_text', 'correct_answer', 'options'], [['multiple_choice', 'Arti kata lain?', 'api', 'api|air']], 'Soal', 'audit-admin');
    try {
        $client->post($preview, ['import_file' => new UploadedFile($file, 'soal.xlsx', null, null, true)], ['Accept' => 'application/json'])
            ->assertOk()->assertJsonPath('valid_count', 1);
    } finally {
        unlink($file);
    }
    $client->from($builder)->post($commit, ['import_file' => $csv()])->assertRedirect($builder)->assertSessionHas('success');
    $client->post($preview, ['import_file' => $csv()], ['Accept' => 'application/json'])->assertTooManyRequests()->assertHeader('Retry-After')->assertJsonStructure(['errors' => ['import_file']]);
    $client->from($builder)->withHeader('X-Inertia', 'true')->post($commit, ['import_file' => $csv()])
        ->assertStatus(303)->assertRedirect($builder)->assertSessionHasErrors('import_file');
});

it('reports flashcard rows added, updated and skipped', function () {
    $fixture = grammarFixture();
    $set = SetFlashcard::create(['module_id' => $fixture['module']->id, 'module_day_id' => $fixture['day']->id, 'title' => 'Audit import', 'status' => 'draft']);
    $file = fn () => UploadedFile::fake()->createWithContent('cards.csv', "front_text,reading,back_text\nGakkou,,sekolah\n,,lewati\n");
    $url = route('admin.flashcards.import', $set);

    $this->actingAs($fixture['admin'])->post($url, ['import_file' => $file()])->assertSessionHas('success', 'Impor flashcard: 1 ditambahkan, 0 diperbarui, 1 baris dilewati.');
    $this->post($url, ['import_file' => $file()])->assertSessionHas('success', 'Impor flashcard: 0 ditambahkan, 1 diperbarui, 1 baris dilewati.');
    expect($set->flashcards()->count())->toBe(1);
});

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

it('only deletes grammar lessons without attempts and within the admin scope', function () {
    $fixture = grammarFixture();
    $admin = $fixture['admin'];
    $create = fn () => $this->actingAs($admin)
        ->postJson(route('admin.grammar-quizzes.store', $fixture['day']), grammarPayload())
        ->assertSuccessful()->json('lesson.id');
    $quiz = Kuis::findOrFail($create());
    $url = route('admin.grammar-quizzes.destroy', $quiz);
    $mentor = Pengguna::factory()->create(['role' => 'admin', 'admin_scope' => 'kloter']);

    $this->actingAs($mentor)->deleteJson($url)->assertForbidden();

    $attempt = $quiz->attempts()->create(['user_id' => $fixture['user']->id]);
    $reason = 'Lesson draf sudah tersembunyi. Riwayat siswa tetap disimpan.';
    $this->actingAs($admin)->getJson(route('admin.grammar-quizzes.index', $fixture['day']))
        ->assertOk()->assertJsonPath('lessons.0.can_delete', false)->assertJsonPath('lessons.0.delete_block_reason', $reason);
    $this->getJson(route('admin.grammar-quizzes.show', $quiz))
        ->assertOk()->assertJsonPath('lesson.can_delete', false);
    $this->actingAs($admin)->deleteJson($url)->assertUnprocessable()
        ->assertJsonPath('errors.lesson.0', $reason);
    $this->assertModelExists($attempt);
    expect($quiz->questions()->exists())->toBeTrue();

    $draft = Kuis::create([
        'module_id' => $quiz->module_id,
        'module_day_id' => $quiz->module_day_id,
        'type' => 'grammar',
        'status' => 'draft',
    ]);
    $this->deleteJson(route('admin.grammar-quizzes.destroy', $draft))->assertOk();
    $this->assertModelMissing($draft);
});

it('round trips kana choice readings without misaligning options or exposing answers', function () {
    $fixture = grammarFixture();
    $payload = grammarPayload();
    $choice = &$payload['stages'][0]['questions'][0];
    $choice['choices'] = [' 読みたい ', '読みます', '読んだ'];
    $choice['choices_reading'] = ['よみたい', null, 'よんだ'];
    $choice['correctAnswer'] = '読みたい';
    $path = 'lesson.stages.0.questions.0.choices_reading';
    $saved = $this->actingAs($fixture['admin'])->postJson(route('admin.grammar-quizzes.store', $fixture['day']), $payload)
        ->assertCreated()->assertJsonPath('lesson.can_delete', true)
        ->assertJsonPath($path, ['よみたい', null, 'よんだ'])->json('lesson');
    $quiz = Kuis::findOrFail($saved['id']);
    $show = route('admin.grammar-quizzes.show', $quiz);
    $update = route('admin.grammar-quizzes.update', $quiz);
    foreach ($payload['stages'] as $i => &$stage) {
        $stage['questions'][0]['id'] = $saved['stages'][$i]['questions'][0]['id'];
    }
    unset($stage);

    $this->getJson($show)->assertOk()->assertJsonPath($path, ['よみたい', null, 'よんだ']);
    $studentQuestion = app(\App\Services\KuisGrammarService::class)->payload($quiz)['stages'][0]['questions'][0];
    expect($studentQuestion['choices_reading'])->toBe(['よみたい', null, 'よんだ'])
        ->and(array_key_exists('correctAnswer', $studentQuestion))->toBeFalse();

    unset($choice['choices_reading']);
    $this->putJson($update, $payload)->assertOk()->assertJsonPath($path, ['よみたい', null, 'よんだ']);
    $choice['choices'] = ['読んだ', '読みたい'];
    $this->putJson($update, $payload)->assertOk()->assertJsonPath($path, []);
    $choice['choices_reading'] = ['よんだ', 'よみたい'];
    $this->putJson($update, $payload)->assertOk()->assertJsonPath($path, ['よんだ', 'よみたい']);
    $choice['choices_reading'][] = '余分';
    $this->putJson($update, $payload)->assertUnprocessable()
        ->assertJsonValidationErrors('stages.0.questions.0.choices_reading');
    $choice['choices_reading'] = [];
    $this->putJson($update, $payload)->assertOk()->assertJsonPath($path, []);
    $this->getJson($show)->assertOk()->assertJsonPath($path, []);
});

it('seeds grammar lessons for demo programs via GrammarLessonDemoSeeder', function () {
    $this->seed(Database\Seeders\KelasDemoSeeder::class);
    $this->seed(Database\Seeders\GrammarLessonDemoSeeder::class);

    $grammarQuizzes = Kuis::query()->where('type', 'grammar')->get();
    expect($grammarQuizzes->count())->toBeGreaterThan(0);

    foreach ($grammarQuizzes as $quiz) {
        expect($quiz->status)->toBe('published')
            ->and($quiz->grammarLesson)->not->toBeNull()
            ->and($quiz->questions->count())->toBe(6);
    }
});
