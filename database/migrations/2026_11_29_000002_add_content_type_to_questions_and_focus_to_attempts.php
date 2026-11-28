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
            if (! Schema::hasColumn('questions', 'content_type')) {
                $table->string('content_type', 30)->nullable()->after('generation_mode')->index();
            }
        });

        Schema::table('attempts', function (Blueprint $table) {
            if (! Schema::hasColumn('attempts', 'focus')) {
                $table->string('focus', 30)->nullable()->after('quiz_id')->index();
            }
        });

        // Backfill existing questions linked to vocabulary_bank or flashcards
        if (DB::getDriverName() === 'mysql') {
            DB::statement("
                UPDATE questions q
                INNER JOIN vocabulary_bank v ON q.source_type = 'vocabulary' AND q.source_id = v.id
                SET q.content_type = v.content_type
                WHERE q.content_type IS NULL AND v.content_type IS NOT NULL
            ");

            DB::statement("
                UPDATE questions q
                INNER JOIN flashcards f ON q.source_type = 'flashcard' AND q.source_id = f.id
                INNER JOIN vocabulary_bank v ON f.vocabulary_id = v.id
                SET q.content_type = v.content_type
                WHERE q.content_type IS NULL AND v.content_type IS NOT NULL
            ");
        }
    }

    public function down(): void
    {
        Schema::table('attempts', function (Blueprint $table) {
            if (Schema::hasColumn('attempts', 'focus')) {
                $table->dropIndex(['focus']);
                $table->dropColumn('focus');
            }
        });

        Schema::table('questions', function (Blueprint $table) {
            if (Schema::hasColumn('questions', 'content_type')) {
                $table->dropIndex(['content_type']);
                $table->dropColumn('content_type');
            }
        });
    }
};
