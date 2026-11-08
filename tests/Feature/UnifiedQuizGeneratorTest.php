<?php

namespace Tests\Feature;

use App\Models\HariModul;
use App\Models\KloterBelajar;
use App\Models\Kosakata;
use App\Models\Kuis;
use App\Models\LevelPembelajaran;
use App\Models\Modul;
use App\Models\Pengguna;
use App\Models\ProgramPembelajaran;
use App\Models\Soal;
use App\Services\KuisDokkaiService;
use App\Services\QuizGenerator\QuizGeneratorDraft;
use Inertia\Testing\AssertableInertia as Assert;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UnifiedQuizGeneratorTest extends TestCase
{
    use RefreshDatabase;

    private Pengguna $admin;

    private HariModul $day;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = Pengguna::factory()->create(['role' => 'admin', 'admin_scope' => 'global']);
        $level = LevelPembelajaran::create(['level_name' => 'N3', 'stage' => 1, 'is_premium' => false]);
        $program = ProgramPembelajaran::create(['level_id' => $level->id, 'title' => 'Generator test', 'slug' => 'generator-test', 'status' => 'published']);
        $module = Modul::create(['level_id' => $level->id, 'program_pembelajaran_id' => $program->id, 'title' => 'Week 1', 'week_number' => 1, 'status' => 'published']);
        $this->day = HariModul::create(['module_id' => $module->id, 'day_number' => 1, 'title' => 'Day 1', 'status' => 'published']);
    }

    private function words(): void
    {
        foreach (['読む', '書く', '話す', '聞く', '買う', '待つ', '遊ぶ', '飲む'] as $i => $word) {
            Kosakata::create(['module_id' => $this->day->module_id, 'word' => $word, 'reading' => $word,
                'meaning_id' => 'Meaning '.$i, 'jlpt_level' => 'N3', 'category' => 'verb', 'content_type' => 'kosakata', 'status' => 'published']);
        }
    }

    private function payload(string $type, array $input = [], int $count = 5): array
    {
        return ['operation' => 'generate', 'module_day_id' => $this->day->id, 'level' => 'N3',
            'input' => $type === 'vocab' ? ['mode' => 'word_to_meaning', 'status' => 'published', ...$input] : $input,
            'settings' => ['count' => $count, ...($type === 'grammar' ? ['counts' => ['transformation' => 2, 'sentence_builder' => 2, 'context_choice' => 1], 'target_form' => 'ba'] : [])]];
    }

    private function generate(string $type, array $payload)
    {
        return $this->actingAs($this->admin)->postJson(route('admin.quiz-generator', $type), $payload);
    }

    private function passage(): Kuis
    {
        $quiz = Kuis::create(['module_id' => $this->day->module_id, 'module_day_id' => $this->day->id, 'type' => 'dokkai', 'status' => 'draft']);

        return app(KuisDokkaiService::class)->sync($quiz, [
            'passage' => ['title' => '読書', 'jlpt_level' => 'N3', 'theme_category' => 'Library'],
            'paragraphs' => [['paragraph_number' => 7, 'content_raw' => '図書館で本を読みます。']],
            'vocabularies' => [['word' => '本', 'furigana' => 'ほん', 'meaning' => 'Buku', 'paragraph_number' => 7]],
            'questions' => array_map(fn ($i) => ['question_number' => $i, 'question_text' => 'Question '.$i,
                'evidence_paragraph_number' => 7, 'evidence_quote' => '本を読みます', 'explanation_correct' => 'Explained '.$i,
                'options' => [['option_label' => 'A', 'option_text' => '本', 'is_correct' => true], ['option_label' => 'B', 'option_text' => '新聞', 'is_correct' => false]]], [1, 2, 3]),
        ]);
    }

    public function test_vocab_generates_canonical_draft_without_writing_and_regenerates_unused_word(): void
    {
        $this->words();
        Kosakata::orderBy('id')->skip(6)->take(2)->get()->each->delete();
        $payload = $this->payload('vocab');
        $draft = $this->generate('vocab', $payload)->assertOk()->assertJsonPath('draft.schema_version', 1)->assertJsonPath('draft.type', 'vocab')->json('draft');
        $this->assertCount(5, $draft['questions']);
        $this->assertSame(0, Kuis::count());
        $this->assertSame(0, Soal::count());
        foreach ($draft['questions'] as $q) {
            $this->assertContains($q['answer']['choice_id'], array_column($q['choices'], 'id'));
        }
        $regenerated = $this->generate('vocab', [...$payload, 'operation' => 'regenerate', 'question_id' => $draft['questions'][0]['id'], 'existing_questions' => $draft['questions']])
            ->assertOk()->json('draft.questions.0');
        $this->assertSame($draft['questions'][0]['id'], $regenerated['id']);
        $this->assertNotContains($regenerated['source']['id'], array_column(array_column($draft['questions'], 'source'), 'id'));
        $quiz = Kuis::create(['module_id' => $this->day->module_id, 'module_day_id' => $this->day->id, 'type' => 'multiple_choice', 'status' => 'draft']);
        $this->actingAs($this->admin)->post(route('admin.quizzes.builder.update', $quiz), [
            'questions' => QuizGeneratorDraft::vocabularyQuestions($draft),
        ])->assertRedirect()->assertSessionHasNoErrors();
        $this->assertSame(5, $quiz->questions()->count());
        $this->actingAs($this->admin)->post(route('admin.quizzes.questions.generate-vocabulary', $quiz), [
            'count' => '5', 'jlpt_level' => 'N3', 'mode' => 'word_to_meaning', 'status' => 'published',
        ])->assertRedirect()->assertSessionHasNoErrors();
        $this->assertSame(10, $quiz->questions()->count());
    }

    public function test_kanji_to_meaning_draft_defaults_to_hidden_reading_without_losing_kana(): void
    {
        foreach ([['食品', 'しょくひん', 'Bahan makanan'], ['工場', 'こうじょう', 'Pabrik'], ['制服', 'せいふく', 'Seragam']] as [$word, $reading, $meaning]) {
            Kosakata::create(['module_id' => $this->day->module_id, 'word' => $word, 'reading' => $reading, 'meaning_id' => $meaning,
                'jlpt_level' => 'N3', 'content_type' => 'kanji', 'status' => 'published']);
        }
        $draft = $this->generate('vocab', $this->payload('vocab', ['content_type' => 'kanji'], 2))->assertOk()->json('draft');
        foreach ($draft['questions'] as $question) {
            $source = Kosakata::findOrFail($question['source']['id']);
            $this->assertFalse($question['show_question_reading']);
            $this->assertSame($source->reading, $question['reading']);
            $this->assertSame("Apa arti dari {$source->word}?", $question['prompt']);
        }
        $questions = QuizGeneratorDraft::vocabularyQuestions($draft);
        $this->assertFalse($questions[0]['show_question_reading']);
        $quiz = Kuis::create(['module_id' => $this->day->module_id, 'module_day_id' => $this->day->id, 'type' => 'multiple_choice', 'status' => 'draft']);
        $this->actingAs($this->admin)->post(route('admin.quizzes.builder.update', $quiz), ['questions' => $questions])->assertSessionHasNoErrors();
        $this->assertFalse($quiz->questions()->firstOrFail()->show_question_reading);
        $this->assertNotEmpty($quiz->questions()->firstOrFail()->question_reading);
        $legacy = $this->generate('vocab', $this->payload('vocab', ['content_type' => 'all'], 2))->assertOk()->json('draft.questions.0');
        $this->assertFalse($legacy['show_question_reading']);
        $this->assertStringNotContainsString($legacy['reading'], $legacy['prompt']);
        $readingPrompt = $this->generate('vocab', $this->payload('vocab', ['content_type' => 'kanji', 'mode' => 'reading_to_word'], 2))->assertOk()->json('draft.questions.0');
        $this->assertStringContainsString(Kosakata::findOrFail($readingPrompt['source']['id'])->reading, $readingPrompt['prompt']);
        $this->assertFalse($readingPrompt['show_question_reading']);
    }

    public function test_vocab_shortage_is_422_not_partial_or_dummy_draft(): void
    {
        $this->words();
        $this->generate('vocab', $this->payload('vocab', count: 15))->assertUnprocessable()->assertJsonValidationErrors('settings.count');
        $this->assertDatabaseCount('questions', 0);
    }

    public function test_reversed_kanji_draft_preserves_existing_questions_and_uses_normal_student_grading(): void
    {
        $kanji = ["\u{4e00}", "\u{4e8c}", "\u{4e09}", "\u{56db}"];
        foreach ($kanji as $index => $word) {
            Kosakata::create([
                'module_id' => $this->day->module_id, 'word' => $word,
                'reading' => null, 'meaning_id' => ['Satu', 'Dua', 'Tiga', 'Empat'][$index],
                'jlpt_level' => 'N3', 'content_type' => 'kanji', 'status' => 'published',
            ]);
        }
        $this->words();
        $quiz = Kuis::create([
            'module_id' => $this->day->module_id, 'module_day_id' => $this->day->id,
            'type' => 'multiple_choice', 'status' => 'published', 'passing_score' => 70,
        ]);
        $original = Soal::create([
            'quiz_id' => $quiz->id, 'type' => 'multiple_choice', 'question_text' => 'Arti api?',
            'correct_answer' => 'Fire', 'options' => ['Fire', 'Water'],
            'explanation' => 'Original explanation', 'order' => 0, 'points' => 1,
        ]);
        $payload = $this->payload('vocab', ['mode' => 'meaning_to_word', 'content_type' => 'kanji'], 2);
        $draft = $this->generate('vocab', [...$payload, 'quiz_id' => $quiz->id])->assertOk()->json('draft');
        $this->assertDatabaseCount('questions', 1);
        foreach ($draft['questions'] as $question) {
            $source = Kosakata::findOrFail($question['source']['id']);
            $this->assertSame('kanji', $source->content_type);
            $this->assertStringContainsString($source->meaning_id, $question['prompt']);
            $choices = array_column($question['choices'], 'text');
            $this->assertSame(count($choices), count(array_unique($choices)));
            $this->assertEmpty(array_diff($choices, $kanji));
            $correct = collect($question['choices'])->firstWhere('id', $question['answer']['choice_id']);
            $this->assertSame($source->word, $correct['text']);
        }

        $this->actingAs($this->admin)->post(route('admin.quizzes.builder.update', $quiz), [
            'questions' => [$original->toArray(), ...QuizGeneratorDraft::vocabularyQuestions($draft)],
        ])->assertRedirect()->assertSessionHasNoErrors();
        $saved = $quiz->questions()->orderBy('order')->get();
        $this->assertCount(3, $saved);
        $this->assertSame($original->id, $saved[0]->id);
        $this->assertSame('Original explanation', $saved[0]->explanation);
        $this->assertSame(3, $saved->pluck('id')->unique()->count());
        $this->assertSame($draft['questions'][0]['prompt'], $saved[1]->question_text);

        $student = Pengguna::factory()->create(['role' => 'user']);
        $this->actingAs($student)->get(route('user.quizzes.show', $quiz))->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('User/Kuis/KerjakanKuis')
                ->has('questions', 3)->where('questions.1.question', $saved[1]->question_text)
                ->where('questions.1.options', $saved[1]->options));
        $wrong = collect($saved[2]->options)->first(fn ($choice) => $choice !== $saved[2]->correct_answer);
        $this->actingAs($student)->postJson(route('user.attempts.store'), [
            'quiz_id' => $quiz->id,
            'answers' => [
                ['question_id' => $saved[0]->id, 'answer_text' => $saved[0]->correct_answer],
                ['question_id' => $saved[1]->id, 'answer_text' => $saved[1]->correct_answer],
                ['question_id' => $saved[2]->id, 'answer_text' => $wrong],
            ],
        ])->assertOk()->assertJsonPath('correct_count', 2);
    }

    public function test_reversed_kanji_generator_rejects_insufficient_kanji_without_falling_back_to_vocabulary(): void
    {
        $this->words();
        Kosakata::create([
            'module_id' => $this->day->module_id, 'word' => "\u{4e8c}", 'meaning_id' => 'Dua',
            'jlpt_level' => 'N3', 'content_type' => 'kanji', 'status' => 'published',
        ]);
        $this->generate('vocab', $this->payload('vocab', ['mode' => 'meaning_to_word', 'content_type' => 'kanji'], 2))
            ->assertUnprocessable();
        $this->assertDatabaseCount('questions', 0);
    }

    public function test_word_to_reading_mode_generates_kanji_prompt_with_kana_choices_and_no_audio_leak(): void
    {
        $kanjiItems = [
            ['word' => '食品', 'reading' => 'しょくひん', 'meaning' => 'Bahan makanan'],
            ['word' => '工場', 'reading' => 'こうじょう', 'meaning' => 'Pabrik'],
            ['word' => '制服', 'reading' => 'せいふく', 'meaning' => 'Seragam kerja'],
            ['word' => '冷蔵庫', 'reading' => 'れいぞうこ', 'meaning' => 'Lemari pendingin'],
        ];

        foreach ($kanjiItems as $item) {
            Kosakata::create([
                'module_id' => $this->day->module_id,
                'word' => $item['word'],
                'reading' => $item['reading'],
                'meaning_id' => $item['meaning'],
                'jlpt_level' => 'N3',
                'category' => 'ssw_food',
                'content_type' => 'kanji',
                'status' => 'published',
                'audio_url' => 'https://example.com/audio.mp3',
            ]);
        }

        $payload = $this->payload('vocab', ['content_type' => 'kanji', 'mode' => 'word_to_reading'], 2);
        $draft = $this->generate('vocab', $payload)->assertOk()->json('draft');

        $this->assertCount(2, $draft['questions']);

        foreach ($draft['questions'] as $question) {
            $source = Kosakata::findOrFail($question['source']['id']);
            $this->assertSame("Pilih cara baca untuk kosakata: {$source->word}", $question['prompt']);
            $this->assertNull($question['reading']);
            $this->assertFalse($question['show_question_reading']);
            $this->assertNull($question['audio_url']);

            $choices = array_column($question['choices'], 'text');
            $this->assertCount(4, $choices);
            $this->assertCount(4, array_unique($choices));
            $this->assertContains($source->reading, $choices);

            $correctChoice = collect($question['choices'])->firstWhere('id', $question['answer']['choice_id']);
            $this->assertNotNull($correctChoice);
            $this->assertSame($source->reading, $correctChoice['text']);
            $this->assertSame('word_to_reading', $question['stage']);
        }
    }

    public function test_word_to_reading_stage_is_persisted_and_controls_runner_narration_guard_without_regex(): void
    {
        $quiz = Kuis::create([
            'module_id' => $this->day->module_id,
            'day_id' => $this->day->id,
            'type' => 'multiple_choice',
            'title' => 'Test Quiz',
            'status' => 'published',
        ]);
        $user = Pengguna::factory()->create(['role' => 'user']);

        $updatePayload = [
            'questions' => [
                [
                    'type' => 'multiple_choice',
                    'stage' => 'word_to_reading',
                    'question_text' => 'Custom prompt tanpa kata kunci bawaan: 食品',
                    'correct_answer' => 'しょくひん',
                    'options' => ['しょくひん', 'こうじょう', 'せいふく', 'れいぞうこ'],
                    'option_readings' => ['', '', '', ''],
                    'show_question_reading' => false,
                    'audio_url' => null,
                ],
            ],
        ];

        $this->actingAs($this->admin)
            ->post(route('admin.quizzes.builder.update', $quiz->id), $updatePayload)
            ->assertRedirect();

        $saved = $quiz->fresh()->questions()->first();
        $this->assertNotNull($saved);
        $this->assertSame('word_to_reading', $saved->stage);

        $runnerService = app(\App\Services\PembelajaranPenggunaService::class);
        $payload = $runnerService->quizPayload($user, $quiz);
        $runnerQuestion = $payload['questions'][0];

        $this->assertSame('word_to_reading', $runnerQuestion['stage']);
        $this->assertTrue($runnerQuestion['disable_question_narration']);
    }

    public function test_legacy_generate_vocabulary_questions_endpoint_persists_stage_and_protects_runner(): void
    {
        $kanjiItems = [
            ['word' => '食品', 'reading' => 'しょくひん', 'meaning' => 'Bahan makanan'],
            ['word' => '工場', 'reading' => 'こうじょう', 'meaning' => 'Pabrik'],
            ['word' => '制服', 'reading' => 'せいふく', 'meaning' => 'Seragam kerja'],
            ['word' => '冷蔵庫', 'reading' => 'れいぞうこ', 'meaning' => 'Lemari pendingin'],
        ];

        foreach ($kanjiItems as $item) {
            Kosakata::create([
                'module_id' => $this->day->module_id,
                'word' => $item['word'],
                'reading' => $item['reading'],
                'meaning_id' => $item['meaning'],
                'jlpt_level' => 'N3',
                'category' => 'ssw_food',
                'content_type' => 'kanji',
                'status' => 'published',
            ]);
        }

        $quiz = Kuis::create([
            'module_id' => $this->day->module_id,
            'day_id' => $this->day->id,
            'type' => 'multiple_choice',
            'title' => 'Legacy Generator Quiz',
            'status' => 'draft',
        ]);
        $user = Pengguna::factory()->create(['role' => 'user']);

        $this->actingAs($this->admin)
            ->post(route('admin.quizzes.questions.generate-vocabulary', $quiz), [
                'count' => 2,
                'jlpt_level' => 'N3',
                'content_type' => 'kanji',
                'mode' => 'word_to_reading',
                'status' => 'published',
            ])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $savedQuestions = $quiz->fresh()->questions()->get();
        $this->assertCount(2, $savedQuestions);

        foreach ($savedQuestions as $q) {
            $this->assertSame('word_to_reading', $q->stage);
        }

        $runnerService = app(\App\Services\PembelajaranPenggunaService::class);
        $payload = $runnerService->quizPayload($user, $quiz);

        foreach ($payload['questions'] as $runnerQ) {
            $this->assertSame('word_to_reading', $runnerQ['stage']);
            $this->assertTrue($runnerQ['disable_question_narration']);
        }
    }

    public function test_grammar_draft_can_be_saved_through_existing_authoring_endpoint(): void
    {
        $this->words();
        $payload = $this->payload('grammar', ['pattern' => '〜ば〜ほど', 'formula' => 'Vば + V辞書形 + ほど', 'meaning' => 'Semakin A semakin B',
            'examples' => [['japanese' => '本を読めば読むほど、知識が増えます。', 'translation' => 'Semakin membaca, semakin tahu.'],
                ['japanese' => '話せば話すほど、上手になります。', 'translation' => 'Semakin berbicara semakin mahir.']]]);
        $draft = $this->generate('grammar', $payload)->assertOk()->assertJsonPath('draft.type', 'grammar')->json('draft');
        $this->assertCount(5, $draft['questions']);
        $this->assertSame(0, Kuis::count());
        $stages = QuizGeneratorDraft::grammarStages($draft);
        $this->assertCount(2, $stages[1]['questions']);
        $this->assertNotEmpty($stages[1]['questions'][0]['correctOrder']);
        $regenerated = $this->generate('grammar', [...$payload, 'operation' => 'regenerate', 'question_id' => $draft['questions'][0]['id'], 'existing_questions' => $draft['questions']])->assertOk()->json('draft.questions.0');
        $this->assertSame('transformation', $regenerated['stage']);
        $this->assertSame($draft['questions'][0]['id'], $regenerated['id']);
        foreach ($stages as &$stage) {
            foreach ($stage['questions'] as &$question) {
                unset($question['id']);
            }
        }
        unset($stage, $question);
        $this->actingAs($this->admin)->postJson(route('admin.grammar-quizzes.store', $this->day), [
            'lesson' => [...$payload['input'], 'level' => 'JLPT N3', 'title' => 'Grammar test'], 'stages' => $stages,
        ])->assertCreated();
        $this->assertSame(5, Soal::count());
    }

    public function test_grammar_requires_examples_and_consistent_stage_counts(): void
    {
        $payload = $this->payload('grammar', ['pattern' => '〜ば〜ほど']);
        $this->generate('grammar', $payload)->assertUnprocessable()->assertJsonValidationErrors('input.examples');
        $payload['settings']['count'] = 10;
        $this->generate('grammar', $payload)->assertUnprocessable()->assertJsonValidationErrors('settings.counts');
    }

    public function test_dokkai_adapts_count_and_preserves_passage_evidence_without_database_writes(): void
    {
        $source = $this->passage();
        $draft = $this->generate('dokkai', $this->payload('dokkai', ['source_quiz_id' => $source->id]))->assertOk()->json('draft');
        $this->assertCount(3, $draft['questions']);
        $this->assertCount(1, $draft['warnings']);
        $this->assertSame(1, $draft['material']['paragraphs'][0]['paragraph_number']);
        $this->assertSame(1, $draft['material']['vocabularies'][0]['paragraph_number']);
        $this->assertArrayNotHasKey('id', $draft['material']['passage']);
        $this->assertSame(1, Kuis::count());
        foreach ($draft['questions'] as $q) {
            $this->assertSame(1, $q['evidence']['paragraph_number']);
            $this->assertStringContainsString($q['evidence']['quote'], $draft['material']['paragraphs'][0]['content_raw']);
        }
        $new = $this->actingAs($this->admin)->postJson(route('admin.dokkai-quizzes.store', $this->day), [
            ...$draft['material'], 'questions' => array_map(fn ($q, $i) => [
                'question_number' => $i + 1, 'question_text' => $q['prompt'], 'evidence_paragraph_number' => $q['evidence']['paragraph_number'],
                'evidence_quote' => $q['evidence']['quote'], 'explanation_correct' => $q['explanation'],
                'options' => array_map(fn ($c, $index) => ['option_label' => chr(65 + $index), 'option_text' => $c['text'], 'is_correct' => $c['id'] === $q['answer']['choice_id']], $q['choices'], array_keys($q['choices'])),
            ], $draft['questions'], array_keys($draft['questions'])),
        ])->assertCreated()->json('lesson');
        $this->assertNotSame($source->dokkaiPassage->paragraphs->first()->id, $new['paragraphs'][0]['id']);
        $this->assertSame($new['paragraphs'][0]['id'], $new['vocabularies'][0]['paragraph_id']);
        $this->assertSame($new['paragraphs'][0]['id'], $new['questions'][0]['evidence_paragraph_id']);
    }

    public function test_dokkai_rejects_wrong_level_and_invalid_evidence_and_regenerates_within_passage(): void
    {
        $source = $this->passage();
        $payload = $this->payload('dokkai', ['source_quiz_id' => $source->id], 1);
        $this->generate('dokkai', [...$payload, 'level' => 'N5'])->assertUnprocessable();
        $draft = $this->generate('dokkai', $payload)->assertOk()->json('draft');
        $q = $this->generate('dokkai', [...$payload, 'operation' => 'regenerate', 'question_id' => $draft['questions'][0]['id'], 'existing_questions' => $draft['questions']])->assertOk()->json('draft.questions.0');
        $this->assertNotSame($q['source']['id'], $draft['questions'][0]['source']['id']);
        $this->assertSame($source->id, $q['source']['quiz_id']);
        $fullDraft = $this->generate('dokkai', $this->payload('dokkai', ['source_quiz_id' => $source->id]))->assertOk()->json('draft');
        $this->generate('dokkai', [...$payload, 'operation' => 'regenerate', 'question_id' => $fullDraft['questions'][0]['id'], 'existing_questions' => $fullDraft['questions']])->assertUnprocessable()->assertJsonValidationErrors('question_id');
        $draft['questions'][0]['source']['quiz_id'] = 999;
        $this->generate('dokkai', [...$payload, 'operation' => 'regenerate', 'question_id' => $draft['questions'][0]['id'], 'existing_questions' => $draft['questions']])->assertUnprocessable();
        $source->dokkaiPassage->questions()->update(['evidence_quote' => 'Not in passage']);
        $this->generate('dokkai', $payload)->assertUnprocessable();
    }

    public function test_roles_target_scope_and_source_scope_are_enforced(): void
    {
        $source = $this->passage();
        $mentor = Pengguna::factory()->create(['role' => 'admin', 'admin_scope' => 'kloter']);
        $student = Pengguna::factory()->create(['role' => 'user']);
        $url = route('admin.quiz-generator', 'vocab');
        $this->actingAs($student)->postJson($url, $this->payload('vocab'))->assertForbidden();
        $this->actingAs($mentor)->postJson($url, $this->payload('vocab'))->assertForbidden();
        $this->actingAs($mentor)->getJson(route('admin.dokkai-quizzes.picker', ['summary' => 1]))->assertOk()->assertJsonCount(0, 'data');
        $ownProgram = ProgramPembelajaran::create(['level_id' => $this->day->module->level_id, 'title' => 'Other', 'slug' => 'other', 'status' => 'published']);
        $ownModule = Modul::create(['level_id' => $this->day->module->level_id, 'program_pembelajaran_id' => $ownProgram->id, 'title' => 'Other week', 'week_number' => 1, 'status' => 'published']);
        $ownDay = HariModul::create(['module_id' => $ownModule->id, 'day_number' => 1, 'title' => 'Other day', 'status' => 'published']);
        KloterBelajar::create(['program_pembelajaran_id' => $ownProgram->id, 'admin_id' => $mentor->id, 'nama' => 'Mentor group', 'kode' => 'GEN-TEST', 'status' => 'active', 'tanggal_mulai' => now(), 'tanggal_selesai' => now()->addMonth()]);
        $this->actingAs($mentor)->postJson(route('admin.quiz-generator', 'dokkai'), [...$this->payload('dokkai', ['source_quiz_id' => $source->id]), 'module_day_id' => $ownDay->id])->assertForbidden();
        $this->actingAs($this->admin)->getJson(route('admin.dokkai-quizzes.picker', ['summary' => 1, 'search' => 'Library']))
            ->assertOk()->assertJsonCount(1, 'data')->assertJsonMissingPath('data.0.paragraphs');
    }

    public function test_schema_bounds_and_invalid_type_do_not_reach_generator(): void
    {
        $this->generate('vocab', [...$this->payload('vocab'), 'settings' => ['count' => 16]])->assertUnprocessable();
        $this->generate('invalid', $this->payload('vocab'))->assertNotFound();
        $this->generate('vocab', [...$this->payload('vocab'), 'input' => ['module_id' => 999]])->assertUnprocessable();
    }

    public function test_grammar_regenerates_stages_2_and_3_deterministically_and_fails_when_exhausted(): void
    {
        $this->words();
        $payload = $this->payload('grammar', [
            'pattern' => '〜ば〜ほど',
            'formula' => 'Vば + V辞書形 + ほど',
            'meaning' => 'Semakin A semakin B',
            'examples' => [
                ['japanese' => '本を読めば読むほど、知識が増えます。', 'translation' => 'Semakin membaca semakin banyak tahu.'],
                ['japanese' => '話せば話すほど、上手になります。', 'translation' => 'Semakin berbicara semakin mahir.'],
                ['japanese' => '歩けば歩くほど、健康になります。', 'translation' => 'Semakin berjalan semakin sehat.'],
            ],
        ], 3);
        $payload['settings']['counts'] = ['transformation' => 1, 'sentence_builder' => 1, 'context_choice' => 1];

        $draft = $this->generate('grammar', $payload)->assertOk()->json('draft');
        $this->assertCount(3, $draft['questions']);

        $sbQuestion = $draft['questions'][1];
        $this->assertSame('sentence_builder', $sbQuestion['stage']);

        // Regenerate Stage 2: harus deterministik memakai contoh ke-2 yang belum terpakai
        $regeneratedSb = $this->generate('grammar', [
            ...$payload,
            'operation' => 'regenerate',
            'question_id' => $sbQuestion['id'],
            'existing_questions' => $draft['questions'],
        ])->assertOk()->json('draft.questions.0');

        $this->assertSame($sbQuestion['id'], $regeneratedSb['id']);
        $this->assertSame('sentence_builder', $regeneratedSb['stage']);
        $this->assertEmpty($regeneratedSb['japanese']);
        $regeneratedSentence = collect($regeneratedSb['answer']['correct_order'])
            ->map(fn ($id) => collect($regeneratedSb['tokens'])->firstWhere('id', $id)['text'] ?? '')
            ->implode('');
        $this->assertStringContainsString('話せば', $regeneratedSentence);

        // Uji kehabisan bahan Stage 2: jika draf sudah memuat seluruh contoh yang tersedia
        $exhaustedQuestions = $draft['questions'];
        $exhaustedQuestions[] = [
            ...$regeneratedSb,
            'id' => 'q-extra-2',
        ];
        $exhaustedQuestions[] = [
            ...$sbQuestion,
            'id' => 'q-extra-3',
            'tokens' => [['id' => 't1', 'text' => '歩けば歩くほど、健康になります。']],
            'answer' => ['correct_order' => ['t1']],
        ]; // sekarang contoh 1, 2, dan 3 sudah terpakai semua

        $this->generate('grammar', [
            ...$payload,
            'operation' => 'regenerate',
            'question_id' => $sbQuestion['id'],
            'existing_questions' => $exhaustedQuestions,
        ])->assertUnprocessable()->assertJsonValidationErrors('question_id');

        // Regenerate Stage 3: deterministik memakai contoh belum terpakai
        $ccQuestion = $draft['questions'][2];
        $this->assertSame('context_choice', $ccQuestion['stage']);

        $regeneratedCc = $this->generate('grammar', [
            ...$payload,
            'operation' => 'regenerate',
            'question_id' => $ccQuestion['id'],
            'existing_questions' => $draft['questions'],
        ])->assertOk()->json('draft.questions.0');

        $this->assertSame($ccQuestion['id'], $regeneratedCc['id']);
        $this->assertSame('context_choice', $regeneratedCc['stage']);
        $this->assertEmpty($regeneratedCc['japanese']);
        $this->assertNotEmpty($regeneratedCc['context']);
        $choiceTexts = collect($regeneratedCc['choices'])->pluck('text')->all();
        $this->assertTrue(collect($choiceTexts)->contains(fn ($text) => str_contains($text, '話せば')));
    }

    public function test_dokkai_level_normalization_accepts_prefixed_jlpt_level_in_picker_and_generator(): void
    {
        $source = $this->passage();

        // Picker dengan filter query berawalan 'JLPT N3' harus tetap menemukan wacana level 'N3'
        $this->actingAs($this->admin)->getJson(route('admin.dokkai-quizzes.picker', ['summary' => 1, 'level' => 'JLPT N3']))
            ->assertOk()
            ->assertJsonCount(1, 'data');

        // Generator dengan level N3 harus menerima sumber dengan level N3
        $payload = $this->payload('dokkai', ['source_quiz_id' => $source->id], 1);
        $draft = $this->generate('dokkai', $payload)->assertOk()->json('draft');
        $this->assertSame('N3', $draft['level']);
        $this->assertCount(1, $draft['questions']);
    }

    public function test_dokkai_importer_normalizes_jlpt_prefix_and_preserves_target_level(): void
    {
        $importer = app(\App\Services\ImportKuisDokkaiService::class);
        $preview = $importer->preview($this->day, [
            [
                'Judul Wacana' => 'Wacana N4 Test',
                'Level' => 'JLPT N4',
                'Teks Bacaan' => 'これはN4のテスト文章です。二段落目はありません。',
                'Pertanyaan' => 'Pertanyaan 1',
                'Opsi A' => 'Opsi 1',
                'Opsi B' => 'Opsi 2',
                'Opsi C' => 'Opsi 3',
                'Opsi D' => 'Opsi 4',
                'Kunci' => 'A',
                'Pembahasan' => 'Pembahasan wacana',
            ],
        ]);

        $this->assertTrue($preview['valid']);
        $this->assertSame('N4', $preview['passages'][0]['passage']['jlpt_level']);
    }

    public function test_grammar_student_payload_never_leaks_japanese_in_stages_2_and_3(): void
    {
        $this->words();
        $payload = $this->payload('grammar', [
            'pattern' => '〜ば〜ほど',
            'formula' => 'Vば + V辞書形 + ほど',
            'meaning' => 'Semakin A semakin B',
            'examples' => [
                ['japanese' => '本を読めば読むほど、知識が増えます。', 'translation' => 'Semakin membaca semakin banyak tahu.'],
            ],
        ], 3);
        $payload['settings']['counts'] = ['transformation' => 1, 'sentence_builder' => 1, 'context_choice' => 1];

        $draft = $this->generate('grammar', $payload)->assertOk()->json('draft');

        // Pastikan draf generator sendiri tidak memuat japanese pada stage 2 dan 3
        $this->assertNotEmpty($draft['questions'][0]['japanese']);
        $this->assertEmpty($draft['questions'][1]['japanese']);
        $this->assertEmpty($draft['questions'][2]['japanese']);

        // Simpan draf ke kuis
        $quiz = Kuis::create([
            'module_id' => $this->day->module_id,
            'module_day_id' => $this->day->id,
            'type' => 'grammar',
            'passing_score' => 70,
            'status' => 'published',
        ]);

        $service = app(\App\Services\KuisGrammarService::class);
        $stages = [
            [
                'id' => 'transformation',
                'questions' => [
                    [
                        'id' => null,
                        'type' => 'transformation',
                        'prompt' => $draft['questions'][0]['prompt'],
                        'japanese' => $draft['questions'][0]['japanese'],
                        'explanation' => $draft['questions'][0]['explanation'] ?? 'Penjelasan pola transform',
                        'choices' => array_column($draft['questions'][0]['choices'], 'text'),
                        'correctAnswer' => collect($draft['questions'][0]['choices'])->firstWhere('id', $draft['questions'][0]['answer']['choice_id'])['text'],
                    ],
                ],
            ],
            [
                'id' => 'sentence_builder',
                'questions' => [
                    [
                        'id' => null,
                        'type' => 'sentence_builder',
                        'prompt' => $draft['questions'][1]['prompt'],
                        'japanese' => '本を読めば読むほど、知識が増えます。',
                        'context' => $draft['questions'][1]['context'],
                        'explanation' => $draft['questions'][1]['explanation'] ?? 'Penjelasan susun kalimat',
                        'tokens' => $draft['questions'][1]['tokens'],
                        'correctOrder' => $draft['questions'][1]['answer']['correct_order'],
                    ],
                ],
            ],
            [
                'id' => 'context_choice',
                'questions' => [
                    [
                        'id' => null,
                        'type' => 'context_choice',
                        'prompt' => $draft['questions'][2]['prompt'],
                        'japanese' => '本を読めば読むほど、知識が増えます。',
                        'context' => $draft['questions'][2]['context'],
                        'explanation' => $draft['questions'][2]['explanation'] ?? 'Penjelasan pilihan konteks',
                        'choices' => array_column($draft['questions'][2]['choices'], 'text'),
                        'correctAnswer' => collect($draft['questions'][2]['choices'])->firstWhere('id', $draft['questions'][2]['answer']['choice_id'])['text'],
                    ],
                ],
            ],
        ];

        $service->sync($quiz, [
            'lesson' => [
                'pattern' => '〜ば〜ほど',
                'title' => 'Pola ばほど',
                'meaning' => 'Semakin',
                'formula' => 'Vba',
            ],
            'stages' => $stages,
        ]);

        $studentQuiz = $service->payload($quiz, false);
        $studentQuestions = collect($studentQuiz['stages'])->flatMap(fn ($s) => $s['questions'])->all();

        // Stage 1 (transformation) harus tetap mengirim prompt japanese (kata kerja dasar)
        $this->assertNotEmpty($studentQuestions[0]['japanese']);

        // Stage 2 & 3 tidak boleh membocorkan jawaban lengkap ke japanese bagi siswa
        $this->assertNull($studentQuestions[1]['japanese']);
        $this->assertNull($studentQuestions[2]['japanese']);
        $this->assertNotEmpty($studentQuestions[2]['context']);

        // Penjelasan jawaban tidak boleh dikirim pada payload awal siswa
        $this->assertNull($studentQuestions[0]['explanation']);
        $this->assertNull($studentQuestions[1]['explanation']);
        $this->assertNull($studentQuestions[2]['explanation']);

        // Simulasi record lama di database yang sudah terlanjur menyimpan source_text di opsi stage 2
        $sbQuestionModel = $quiz->questions()->where('stage', 'sentence_builder')->first();
        $sbQuestionModel->update([
            'options' => array_merge($sbQuestionModel->options ?? [], [
                'source_text' => '本を読めば読むほど、知識が増えます。',
                'source_reading' => 'ほんをよめばよむほど、ちしきがふえます。',
            ]),
        ]);

        // Serializer siswa harus tetap mengisolasi source_text/source_reading pada data lama
        $legacyStudentQuiz = $service->payload($quiz->fresh(), false);
        $legacySbQuestion = collect($legacyStudentQuiz['stages'])->flatMap(fn ($s) => $s['questions'])->firstWhere('type', 'sentence_builder');
        $this->assertNull($legacySbQuestion['japanese']);
        $this->assertNull($legacySbQuestion['reading']);
        $this->assertNull($legacySbQuestion['explanation']);

        // Sedangkan untuk pratinjau admin (includeAnswers = true), jawaban dan penjelasan tetap lengkap
        $adminQuiz = $service->payload($quiz->fresh(), true);
        $adminSbQuestion = collect($adminQuiz['stages'])->flatMap(fn ($s) => $s['questions'])->firstWhere('type', 'sentence_builder');
        $this->assertNotEmpty($adminSbQuestion['japanese']);
        $this->assertNotEmpty($adminSbQuestion['explanation']);
        $this->assertNotEmpty($adminSbQuestion['correctOrder']);
    }

    public function test_dokkai_sync_normalizes_prefixed_jlpt_level_in_vocabularies(): void
    {
        $quiz = Kuis::create([
            'module_id' => $this->day->module_id,
            'module_day_id' => $this->day->id,
            'type' => 'dokkai',
            'passing_score' => 70,
            'status' => 'published',
        ]);

        $dokkaiService = app(\App\Services\KuisDokkaiService::class);
        $dokkaiService->sync($quiz, [
            'passage' => [
                'title' => 'Wacana Prefixed Vocab',
                'jlpt_level' => 'JLPT N4',
                'theme_category' => 'Budaya & Tradisi',
            ],
            'paragraphs' => [
                ['paragraph_number' => 1, 'content_raw' => 'これはテストです。'],
            ],
            'vocabularies' => [
                [
                    'word' => 'テスト',
                    'furigana' => 'てすと',
                    'meaning' => 'Ujian',
                    'jlpt_level' => 'JLPT N4',
                ],
            ],
            'questions' => [],
        ]);

        $savedVocab = \App\Models\DokkaiVocabulary::where('word', 'テスト')->first();
        $this->assertNotNull($savedVocab);
        $this->assertSame('N4', $savedVocab->jlpt_level);
    }
}
