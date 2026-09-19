<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('grammar_bank')) {
            Schema::create('grammar_bank', function (Blueprint $table) {
                $table->id();
                $table->foreignId('level_id')->nullable()->constrained('levels')->nullOnDelete();
                $table->string('jlpt_level', 10)->default('N3')->index();
                $table->string('lesson_key', 120)->nullable()->unique();
                $table->string('pattern');
                $table->string('title');
                $table->text('meaning');
                $table->text('formula');
                $table->text('explanation')->nullable();
                $table->json('examples')->nullable();
                $table->string('category', 100)->nullable()->index();
                $table->json('tags')->nullable();
                $table->string('status', 20)->default('published')->index();
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();

                $table->index(['jlpt_level', 'status']);
            });
        }

        Schema::table('grammar_lessons', function (Blueprint $table) {
            if (! Schema::hasColumn('grammar_lessons', 'grammar_bank_id')) {
                $table->foreignId('grammar_bank_id')->nullable()->after('quiz_id')->constrained('grammar_bank')->nullOnDelete();
            }
        });

        Schema::table('exam_bank_questions', function (Blueprint $table) {
            if (! Schema::hasColumn('exam_bank_questions', 'grammar_id')) {
                $table->foreignId('grammar_id')->nullable()->after('exam_question_wrapper_id')->constrained('grammar_bank')->nullOnDelete();
            }
        });

        if (Schema::hasTable('grammar_lessons') && Schema::hasTable('grammar_bank')) {
            $existingLessons = DB::table('grammar_lessons')->whereNull('grammar_bank_id')->get();
            foreach ($existingLessons as $lesson) {
                $levelName = $lesson->level ?: 'N3';
                $levelRecord = DB::table('levels')->where('level_name', 'like', "%{$levelName}%")->first();
                $levelId = $levelRecord ? $levelRecord->id : DB::table('levels')->value('id');

                $cleanJlpt = preg_replace('/[^N0-9]/', '', (string) $levelName);
                if (empty($cleanJlpt)) {
                    $cleanJlpt = 'N3';
                }

                $grammarBankId = DB::table('grammar_bank')->insertGetId([
                    'level_id' => $levelId,
                    'jlpt_level' => $cleanJlpt,
                    'lesson_key' => $lesson->lesson_key,
                    'pattern' => $lesson->pattern,
                    'title' => $lesson->title,
                    'meaning' => $lesson->meaning,
                    'formula' => $lesson->formula,
                    'explanation' => $lesson->explanation,
                    'examples' => $lesson->examples,
                    'category' => 'bunpo',
                    'tags' => json_encode(['migrated']),
                    'status' => 'published',
                    'created_at' => $lesson->created_at ?: now(),
                    'updated_at' => $lesson->updated_at ?: now(),
                ]);

                DB::table('grammar_lessons')->where('id', $lesson->id)->update([
                    'grammar_bank_id' => $grammarBankId,
                ]);
            }
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('exam_bank_questions') && Schema::hasColumn('exam_bank_questions', 'grammar_id')) {
            Schema::table('exam_bank_questions', function (Blueprint $table) {
                $table->dropConstrainedForeignId('grammar_id');
            });
        }

        if (Schema::hasTable('grammar_lessons') && Schema::hasColumn('grammar_lessons', 'grammar_bank_id')) {
            Schema::table('grammar_lessons', function (Blueprint $table) {
                $table->dropConstrainedForeignId('grammar_bank_id');
            });
        }

        Schema::dropIfExists('grammar_bank');
    }
};
