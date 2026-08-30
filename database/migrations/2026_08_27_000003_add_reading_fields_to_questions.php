<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('questions', function (Blueprint $table) {
            $table->text('question_reading')->nullable()->after('question_text');
            $table->text('correct_answer_reading')->nullable()->after('correct_answer');
            $table->json('option_readings')->nullable()->after('options');
            $table->text('explanation_reading')->nullable()->after('explanation');
        });
    }

    public function down(): void
    {
        Schema::table('questions', function (Blueprint $table) {
            $table->dropColumn([
                'question_reading',
                'correct_answer_reading',
                'option_readings',
                'explanation_reading',
            ]);
        });
    }
};
