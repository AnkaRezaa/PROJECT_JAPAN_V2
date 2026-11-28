<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('quizzes')) {
            return;
        }

        Schema::table('quizzes', function (Blueprint $table) {
            if (! Schema::hasColumn('quizzes', 'shuffle_questions')) {
                $table->boolean('shuffle_questions')->default(false)->after('passing_score');
            }
            if (! Schema::hasColumn('quizzes', 'shuffle_options')) {
                $table->boolean('shuffle_options')->default(false)->after('shuffle_questions');
            }
            if (! Schema::hasColumn('quizzes', 'max_attempts')) {
                $table->unsignedSmallInteger('max_attempts')->nullable()->after('shuffle_options');
            }
            if (! Schema::hasColumn('quizzes', 'explanation_display')) {
                $table->string('explanation_display', 20)->default('after_answer')->after('max_attempts');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('quizzes')) {
            return;
        }

        Schema::table('quizzes', function (Blueprint $table) {
            foreach (['explanation_display', 'max_attempts', 'shuffle_options', 'shuffle_questions'] as $column) {
                if (Schema::hasColumn('quizzes', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
