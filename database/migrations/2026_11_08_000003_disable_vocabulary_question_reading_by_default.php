<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('questions', function (Blueprint $table) {
            $table->boolean('show_question_reading')->default(false)->change();
        });

        $this->disableExistingQuestions();
    }

    private function disableExistingQuestions(): void
    {
        DB::transaction(function () {
            $questions = DB::table('questions')->whereIn('quiz_id', function ($query) {
                $query->select('id')->from('quizzes')->whereNotIn('type', ['grammar', 'dokkai']);
            });
            (clone $questions)->update(['show_question_reading' => false]);

            // Only remove the exact kana suffix produced by the old vocabulary generator.
            (clone $questions)->whereNotNull('question_reading')->select(['id', 'question_text', 'question_reading', 'highlight_text'])
                ->chunkById(500, function ($rows) {
                    foreach ($rows as $row) {
                        $reading = trim((string) $row->question_reading);
                        if ($reading === '' || preg_match('/\A[\p{Hiragana}\p{Katakana}\x{30FC}\x{30FB} \x{3000}]+\z/u', $reading) !== 1) {
                            continue;
                        }
                        $kana = preg_quote($reading, '/');
                        if (preg_match('/\AApa arti dari (.+) (?:\('.$kana.'\)|（'.$kana.'）)\?\z/u', $row->question_text, $matches) !== 1
                            || preg_match('/\p{Han}/u', $matches[1]) !== 1) {
                            continue;
                        }
                        $text = 'Apa arti dari '.$matches[1].'?';
                        if (trim((string) $row->highlight_text) !== '' && ! str_contains($text, trim($row->highlight_text))) {
                            continue;
                        }
                        DB::table('questions')->where('id', $row->id)->update(['question_text' => $text]);
                    }
                });
        });
    }

    public function down(): void
    {
        // Original text and per-question preferences must be restored from a backup, not guessed.
        Schema::table('questions', function (Blueprint $table) {
            $table->boolean('show_question_reading')->default(true)->change();
        });
    }
};
