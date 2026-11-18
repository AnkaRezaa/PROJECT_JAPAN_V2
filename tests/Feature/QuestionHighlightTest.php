<?php

namespace Tests\Feature;

use App\Models\HariModul;
use App\Models\Kuis;
use App\Models\LevelPembelajaran;
use App\Models\Modul;
use App\Models\Pengguna;
use App\Models\ProgramPembelajaran;
use App\Services\ImportKuisDokkaiService;
use App\Services\ImportKuisGrammarService;
use App\Services\ImportSpreadsheetService;
use App\Services\KuisCampuranService;
use App\Services\KuisDokkaiService;
use App\Services\KuisGrammarService;
use App\Services\PembelajaranPenggunaService;
use App\Services\PenilaianJawabanKuisService;
use App\Services\SoalKuisService;
use App\Services\TemplateExcelService;
use App\Support\QuestionHighlight;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class QuestionHighlightTest extends TestCase
{
    use RefreshDatabase;

    private Pengguna $admin;

    private HariModul $day;

    private ProgramPembelajaran $program;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = Pengguna::factory()->create(['role' => 'admin', 'admin_scope' => 'global']);
        $level = LevelPembelajaran::create(['level_name' => 'N3', 'stage' => 1, 'is_premium' => false]);
        $this->program = ProgramPembelajaran::create(['level_id' => $level->id, 'title' => 'Highlight test', 'slug' => 'highlight-test', 'status' => 'published']);
        $module = Modul::create(['program_pembelajaran_id' => $this->program->id, 'level_id' => $level->id, 'title' => 'Week 1', 'week_number' => 1, 'status' => 'published']);
        $this->day = HariModul::create(['module_id' => $module->id, 'day_number' => 1, 'title' => 'Day 1', 'status' => 'published']);
    }

    private function quiz(string $type = 'multiple_choice'): Kuis
    {
        return Kuis::create(['module_id' => $this->day->module_id, 'module_day_id' => $this->day->id, 'type' => $type, 'status' => 'draft']);
    }

    public function test_reading_visibility_preserves_authoring_data_and_hides_only_student_question_reading(): void
    {
        $quiz = $this->quiz();
        $question = ['type' => 'multiple_choice', 'question_text' => 'Apa arti dari 食品?', 'question_reading' => 'しょくひん',
            'show_question_reading' => false, 'options' => ['Bahan makanan', 'Pabrik'], 'option_readings' => ['A', 'B'],
            'correct_answer' => 'Bahan makanan', 'explanation_reading' => 'Explanation reading'];
        $url = route('admin.quizzes.builder.update', $quiz);
        $this->actingAs($this->admin)->post($url, ['questions' => [$question]])->assertSessionHasNoErrors();
        $saved = $quiz->questions()->firstOrFail();
        $this->assertFalse($saved->show_question_reading);
        $this->assertSame('しょくひん', $saved->question_reading);
        $this->actingAs($this->admin)->get(route('admin.quizzes.builder', $quiz))->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page->where('questions.0.show_question_reading', false)->where('questions.0.question_reading', 'しょくひん'));
        $student = Pengguna::factory()->create();
        $payload = app(PembelajaranPenggunaService::class)->quizPayload($student, $quiz->fresh()->load('questions'));
        $this->assertNull($payload['questions'][0]['question_reading']);
        $this->assertSame(['A', 'B'], $payload['questions'][0]['option_readings']);
        $mixed = new \ReflectionMethod(KuisCampuranService::class, 'normalizeSoal');
        $this->assertNull($mixed->invoke(app(KuisCampuranService::class), $saved, 'kosakata', 'Kosakata')['question_reading']);
        $this->assertTrue(app(PenilaianJawabanKuisService::class)->benar($saved, 'Bahan makanan'));
        $this->assertFalse(app(PenilaianJawabanKuisService::class)->benar($saved, 'Pabrik'));
        $this->actingAs($this->admin)->post($url, ['questions' => [[...$question, 'id' => $saved->id, 'show_question_reading' => true]]])->assertSessionHasNoErrors();
        $this->assertSame('しょくひん', $saved->fresh()->questionReadingForStudent());
        $this->actingAs($this->admin)->post($url, ['questions' => [[...$question, 'id' => $saved->id, 'show_question_reading' => 'invalid']]])
            ->assertSessionHasErrors('questions.0.show_question_reading');
        $this->assertTrue($saved->fresh()->show_question_reading);
    }

    public function test_csv_and_xlsx_reading_visibility_support_optional_column_and_reject_invalid_values(): void
    {
        $quiz = $this->quiz();
        $service = app(SoalKuisService::class);
        $base = ['type' => 'multiple_choice', 'question_text' => '食品', 'question_reading' => 'しょくひん', 'options' => 'Food|Factory', 'correct_answer' => 'Food'];
        foreach (['csv', 'xlsx'] as $format) {
            foreach ([0, 1, '', null] as $value) {
                $row = [...$base, 'show_question_reading' => $value];
                if ($value === null) {
                    unset($row['show_question_reading']);
                }
                if ($format === 'csv') {
                    $path = tempnam(sys_get_temp_dir(), 'reading-');
                    ob_start();
                    app(TemplateExcelService::class)->csvResponse(array_keys($row), [array_values($row)], 'test.csv')->sendContent();
                    file_put_contents($path, ob_get_clean());
                } else {
                    $path = app(TemplateExcelService::class)->xlsxPath(array_keys($row), [array_values($row)], 'Questions', 'reading-');
                }
                try {
                    $rows = app(ImportSpreadsheetService::class)->rows($path, $format);
                    $preview = $service->previewRows($quiz, $rows);
                    $this->assertSame(1, $preview['valid_count']);
                    $this->assertSame($value === 1, $preview['valid_rows'][0]['show_question_reading'], $format.' preview '.var_export($value, true).' '.json_encode($rows));
                    $this->assertSame(1, $service->importRows($quiz, $rows));
                    $saved = $quiz->questions()->reorder()->latest('id')->firstOrFail();
                    $this->assertSame($value === 1, $saved->show_question_reading, $format.' stored '.var_export($value, true));
                    $this->assertSame('しょくひん', $saved->question_reading);
                } finally {
                    unlink($path);
                }
            }
        }
        $invalid = [...$base, 'show_question_reading' => 'no'];
        $this->assertSame(1, $service->previewRows($quiz, [$invalid])['invalid_count']);
        $count = $quiz->questions()->count();
        try {
            $service->importRows($quiz, [$base, $invalid]);
            $this->fail('Invalid visibility must reject the import.');
        } catch (ValidationException $exception) {
            $this->assertStringContainsString('Baris 3', $exception->getMessage());
        }
        $this->assertSame($count, $quiz->questions()->count());
    }

    private function grammarPayload(): array
    {
        return ['lesson' => ['title' => 'Highlight grammar', 'pattern' => 'target', 'meaning' => 'Meaning', 'formula' => 'Formula', 'examples' => []],
            'stages' => array_map(fn ($stage) => ['id' => $stage, 'questions' => [[
                'type' => $stage, 'prompt' => 'Choose target.', 'highlight_text' => 'target',
                'japanese' => 'Never expose this source for stages 2 and 3',
                'context' => 'Situation remains plain', 'explanation' => 'Answer explanation',
                ...($stage === 'sentence_builder'
                    ? ['tokens' => [['id' => 't1', 'text' => 'A'], ['id' => 't2', 'text' => 'B']], 'correctOrder' => ['t1', 't2']]
                    : ['choices' => ['A', 'B'], 'correctAnswer' => 'A']),
            ]]], KuisGrammarService::STAGES)];
    }

    public function test_literal_validation_accepts_unicode_and_special_characters_without_interpreting_html_or_regex(): void
    {
        foreach ([null, '', 'target', 'a+b?', '<img src=x>', "\u{304d}\u{3085}\u{3046}", '0'] as $target) {
            $text = 'Choose '.($target ?? '').' again '.($target ?? '');
            $this->assertNull(QuestionHighlight::error($target, $text));
        }
        $this->assertSame('0', QuestionHighlight::validated('0', '0'));
        $this->assertNotNull(QuestionHighlight::error('Target', 'target'));
        $this->assertNotNull(QuestionHighlight::error(['target'], 'target'));
        $this->assertNotNull(QuestionHighlight::error(str_repeat('a', 501), str_repeat('a', 501)));
        $this->assertNull(QuestionHighlight::validated('  ', 'plain'));
    }

    public function test_vocabulary_authoring_preserves_highlight_and_old_questions_and_rejects_invalid_target(): void
    {
        $quiz = $this->quiz();
        $question = ['type' => 'multiple_choice', 'question_text' => 'Choose a+b? twice: a+b?', 'highlight_text' => 'a+b?', 'options' => ['A', 'B'], 'correct_answer' => 'A'];
        $url = route('admin.quizzes.builder.update', $quiz);
        $this->actingAs($this->admin)->post($url, ['questions' => [$question]])->assertRedirect()->assertSessionHasNoErrors();
        $saved = $quiz->questions()->firstOrFail();
        $this->assertSame('a+b?', $saved->highlight_text);
        $this->actingAs($this->admin)->get(route('admin.quizzes.builder', $quiz))->assertOk();
        $payload = app(PembelajaranPenggunaService::class)->quizPayload(Pengguna::factory()->create(), $quiz->fresh()->load('questions'));
        $this->assertSame('a+b?', $payload['questions'][0]['highlight_text']);
        $this->assertTrue(app(PenilaianJawabanKuisService::class)->benar($saved, 'A'));
        $this->assertFalse(app(PenilaianJawabanKuisService::class)->benar($saved, 'B'));
        $this->actingAs($this->admin)->post($url, ['questions' => [[...$question, 'id' => $saved->id, 'highlight_text' => 'missing']]])
            ->assertSessionHasErrors('questions.0.highlight_text');
        $this->assertSame('a+b?', $saved->fresh()->highlight_text);
        $this->actingAs($this->admin)->post($url, ['questions' => [[...$question, 'id' => $saved->id, 'highlight_text' => '']]])->assertSessionHasNoErrors();
        $this->assertNull($saved->fresh()->highlight_text);
    }

    public function test_grammar_authoring_exposes_only_prompt_highlight_without_leaking_hidden_answers(): void
    {
        $response = $this->actingAs($this->admin)->postJson(route('admin.grammar-quizzes.store', $this->day), $this->grammarPayload())->assertCreated();
        $quiz = $this->day->quizzes()->where('type', 'grammar')->firstOrFail();
        $payload = app(KuisGrammarService::class)->payload($quiz);
        foreach ($payload['stages'] as $stage) {
            $this->assertSame('target', $stage['questions'][0]['highlight_text']);
            $this->assertNull($stage['questions'][0]['explanation']);
            if ($stage['id'] !== 'transformation') {
                $this->assertNull($stage['questions'][0]['japanese']);
            }
        }
        $invalid = $this->grammarPayload();
        $invalid['stages'][1]['questions'][0]['highlight_text'] = 'missing';
        $this->actingAs($this->admin)->postJson(route('admin.grammar-quizzes.store', $this->day), $invalid)
            ->assertUnprocessable()->assertJsonValidationErrors('stages.1.questions.0.highlight_text');
    }

    public function test_dokkai_import_and_student_payload_preserve_highlight_and_reject_invalid_rows(): void
    {
        $row = ['judul_wacana' => 'Reading', 'level' => 'N3', 'teks_bacaan' => 'A short passage.', 'pertanyaan' => 'Choose target.', 'highlight_text' => 'target',
            'opsi_a' => 'A', 'opsi_b' => 'B', 'kunci' => 'A', 'pembahasan' => 'Secret explanation'];
        $import = app(ImportKuisDokkaiService::class);
        $preview = $import->preview($this->day, [$row]);
        $this->assertTrue($preview['valid']);
        $this->assertSame(1, $import->commit($this->day, $preview));
        $quiz = $this->day->quizzes()->where('type', 'dokkai')->firstOrFail();
        $payload = app(KuisDokkaiService::class)->payload($quiz);
        $this->assertSame('target', $payload['questions'][0]['highlight_text']);
        $this->assertNull($payload['questions'][0]['explanation_correct']);
        $this->actingAs($this->admin)->postJson(route('admin.dokkai-quizzes.store', $this->day), $preview['passages'][0])
            ->assertCreated()->assertJsonPath('lesson.questions.0.highlight_text', 'target');
        $invalidPayload = $preview['passages'][0];
        $invalidPayload['questions'][0]['highlight_text'] = 'missing';
        $this->actingAs($this->admin)->postJson(route('admin.dokkai-quizzes.store', $this->day), $invalidPayload)
            ->assertUnprocessable()->assertJsonValidationErrors('questions.0.highlight_text');
        $invalid = $import->preview($this->day, [[...$row, 'highlight_text' => 'missing']]);
        $this->assertFalse($invalid['valid']);
        $this->assertContains('highlight_text', array_column($invalid['errors'], 'column'));
        unset($row['highlight_text']);
        $this->assertTrue($import->preview($this->day, [$row])['valid']);
    }

    public function test_csv_and_xlsx_roundtrips_preserve_optional_highlight_and_legacy_templates(): void
    {
        $spreadsheet = app(ImportSpreadsheetService::class);
        $templates = app(TemplateExcelService::class);
        $service = app(SoalKuisService::class);
        $quiz = $this->quiz();
        $headers = $service->importHeaders();
        $this->assertContains('highlight_text', $headers);
        $row = ['module_week' => 1, 'day_number' => 1, 'type' => 'multiple_choice', 'question_text' => 'Choose target.', 'highlight_text' => 'target', 'options' => 'A|B', 'correct_answer' => 'A'];
        foreach (['csv', 'xlsx'] as $format) {
            if ($format === 'csv') {
                $response = $templates->csvResponse(array_keys($row), [array_values($row)], 'test.csv');
                $path = tempnam(sys_get_temp_dir(), 'highlight-');
                ob_start();
                $response->sendContent();
                file_put_contents($path, ob_get_clean());
            } else {
                $path = $templates->xlsxPath(array_keys($row), [array_values($row)], 'Questions', 'highlight-');
            }
            try {
                $rows = $spreadsheet->rows($path, $format);
                $preview = $service->previewRows($quiz, $rows);
                $this->assertSame(1, $preview['valid_count']);
                $this->assertSame('target', $preview['valid_rows'][0]['highlight_text']);
                $this->assertSame(1, $service->importRows($quiz, $rows));
            } finally {
                unlink($path);
            }
        }
        $this->assertSame(2, $quiz->questions()->where('highlight_text', 'target')->count());
        unset($row['highlight_text']);
        $this->assertSame(1, $service->previewRows($quiz, [$row])['valid_count']);
        $this->assertSame(1, $service->previewRows($quiz, [[...$row, 'highlight_text' => 'missing']])['invalid_count']);
        foreach ($service->templateRows($quiz) as $sample) {
            $this->assertCount(count($headers), $sample);
        }
    }

    public function test_grammar_workbook_and_csv_support_highlight_on_prompt_only(): void
    {
        $import = app(ImportKuisGrammarService::class);
        $rows = array_map(fn ($stage) => ['lesson_key' => 'highlight-lesson', 'stage' => $stage, 'prompt' => 'Choose target.', 'highlight_text' => 'target',
            'context' => 'plain', 'options_or_tokens' => 'A|B', 'correct_answer_or_order' => $stage === 'sentence_builder' ? 'A|B' : 'A', 'pattern' => 'Pattern', 'title' => 'Title', 'formula' => 'Formula', 'meaning' => 'Meaning'], KuisGrammarService::STAGES);
        $sheets = ['materi' => [['lesson_key' => 'highlight-lesson', 'module_week' => 1, 'day_number' => 1, 'pattern' => 'Pattern', 'title' => 'Title', 'formula' => 'Formula', 'meaning' => 'Meaning']],
            'contoh' => [['lesson_key' => 'highlight-lesson', 'japanese' => 'Example', 'translation' => 'Example']], 'soal' => $rows];
        $workbook = array_map(fn ($data) => ['headers' => array_keys($data[0]), 'rows' => array_map(array_values(...), $data)], $sheets);
        $path = app(TemplateExcelService::class)->xlsxWorkbookPath($workbook, 'highlight-grammar-');
        try {
            $sheets = app(ImportSpreadsheetService::class)->xlsxSheets($path);
        } finally {
            unlink($path);
        }
        $preview = $import->preview($this->program, $sheets);
        $this->assertTrue($preview['valid'], json_encode($preview['errors']));
        $this->assertSame(1, $import->commit($this->program, $preview));
        $this->assertSame(3, $this->day->quizzes()->where('type', 'grammar')->firstOrFail()->questions()->where('highlight_text', 'target')->count());
        $this->assertTrue($import->previewFlatCsv($this->program, $rows, $this->day)['valid']);
        $rows[0]['highlight_text'] = 'missing';
        $this->assertFalse($import->previewFlatCsv($this->program, $rows, $this->day)['valid']);
        $sheets['soal'] = $rows;
        $this->assertFalse($import->preview($this->program, $sheets)['valid']);
    }

    public function test_backfill_is_dry_by_default_idempotent_and_conditionally_reversible(): void
    {
        Storage::fake('local');
        $quiz = $this->quiz();
        $question = $quiz->questions()->create(['type' => 'multiple_choice', 'question_text' => 'Apa arti station?', 'options' => ['A', 'B'], 'correct_answer' => 'A', 'order' => 1, 'points' => 1]);
        $this->artisan('quiz:backfill-highlights')->assertSuccessful();
        $this->assertNull($question->fresh()->highlight_text);
        $this->artisan('quiz:backfill-highlights', ['--apply' => true])->assertSuccessful();
        $this->assertSame('station', $question->fresh()->highlight_text);
        $files = Storage::disk('local')->files('highlight-backfills');
        $this->assertCount(1, $files);
        $this->artisan('quiz:backfill-highlights', ['--apply' => true])->assertSuccessful();
        $this->assertCount(1, Storage::disk('local')->files('highlight-backfills'));
        $this->artisan('quiz:backfill-highlights', ['--rollback' => basename($files[0])])->assertSuccessful();
        $this->assertNull($question->fresh()->highlight_text);
        $this->assertSame('Apa arti station?', $question->fresh()->question_text);
    }
}
