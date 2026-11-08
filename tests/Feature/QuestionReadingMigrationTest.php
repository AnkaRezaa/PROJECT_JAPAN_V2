<?php

namespace Tests\Feature;

use App\Models\Kuis;
use App\Models\LevelPembelajaran;
use App\Models\Modul;
use App\Models\ProgramPembelajaran;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class QuestionReadingMigrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_migration_disables_vocabulary_and_cleans_only_matching_legacy_prompts_once(): void
    {
        $level = LevelPembelajaran::create(['level_name' => 'N3', 'stage' => 1, 'is_premium' => false]);
        $program = ProgramPembelajaran::create(['level_id' => $level->id, 'title' => 'Reading migration', 'slug' => 'reading-migration', 'status' => 'published']);
        $module = Modul::create(['program_pembelajaran_id' => $program->id, 'level_id' => $level->id, 'title' => 'Week 1', 'week_number' => 1, 'status' => 'published']);
        $quiz = Kuis::create(['module_id' => $module->id, 'type' => 'multiple_choice', 'status' => 'draft']);
        $base = ['type' => 'multiple_choice', 'options' => ['Food', 'Factory'], 'correct_answer' => 'Food',
            'question_reading' => 'しょくひん', 'show_question_reading' => true, 'order' => 0];
        $cases = [
            ['Apa arti dari 食品 (しょくひん)?', 'しょくひん', null, 'Apa arti dari 食品?'],
            ['Apa arti dari 食品 （しょくひん）?', 'しょくひん', null, 'Apa arti dari 食品?'],
            ['Apa arti dari 食品 (こうじょう)?', 'しょくひん', null, 'Apa arti dari 食品 (こうじょう)?'],
            ['Apa arti dari 食品 (しょくひん)?', '', null, 'Apa arti dari 食品 (しょくひん)?'],
            ['Apa arti dari 食品 (Food)?', 'Food', null, 'Apa arti dari 食品 (Food)?'],
            ['Baca 食品 (しょくひん) di kalimat ini.', 'しょくひん', null, 'Baca 食品 (しょくひん) di kalimat ini.'],
            ['Apa arti dari 食品 (しょくひん)?', 'しょくひん', 'しょくひん', 'Apa arti dari 食品 (しょくひん)?'],
        ];
        $saved = [];
        foreach ($cases as [$text, $reading, $highlight, $expected]) {
            $question = $quiz->questions()->create([...$base, 'question_text' => $text, 'question_reading' => $reading, 'highlight_text' => $highlight]);
            $saved[] = [$question, $expected, $reading, $highlight];
        }
        $unaffected = [];
        foreach (['grammar', 'dokkai'] as $type) {
            $other = Kuis::create(['module_id' => $module->id, 'type' => $type, 'status' => 'draft']);
            $unaffected[] = $other->questions()->create([...$base, 'question_text' => 'Apa arti dari 食品 (しょくひん)?']);
        }
        $migration = require database_path('migrations/2026_11_08_000003_disable_vocabulary_question_reading_by_default.php');
        // The suite already applies the schema migration; exercise its backfill without DDL implicit commits.
        (new \ReflectionMethod($migration, 'disableExistingQuestions'))->invoke($migration);
        foreach ($saved as [$question, $expected, $reading, $highlight]) {
            $fresh = $question->fresh();
            $this->assertFalse($fresh->show_question_reading);
            $this->assertSame($expected, $fresh->question_text);
            $this->assertSame($reading, $fresh->question_reading);
            $this->assertSame($highlight, $fresh->highlight_text);
            $this->assertTrue($fresh->updated_at->equalTo($question->updated_at));
        }
        foreach ($unaffected as $question) {
            $this->assertTrue($question->fresh()->show_question_reading);
            $this->assertSame($question->question_text, $question->fresh()->question_text);
        }
        unset($base['show_question_reading']);
        $new = $quiz->questions()->create([...$base, 'question_text' => '食品']);
        $this->assertFalse($new->fresh()->show_question_reading);
        $new->update(['show_question_reading' => true]);
        $this->artisan('migrate', ['--path' => 'database/migrations/2026_11_08_000003_disable_vocabulary_question_reading_by_default.php', '--force' => true])->assertSuccessful();
        $this->assertTrue($new->fresh()->show_question_reading);
    }
}
