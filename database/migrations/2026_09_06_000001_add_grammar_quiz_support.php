<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('grammar_lessons', function (Blueprint $table) {
            $table->id();
            $table->foreignId('quiz_id')->unique()->constrained('quizzes')->cascadeOnDelete();
            $table->string('lesson_key')->unique();
            $table->string('level', 30)->nullable();
            $table->string('pattern');
            $table->string('title');
            $table->text('meaning');
            $table->text('formula');
            $table->text('explanation')->nullable();
            $table->json('examples')->nullable();
            $table->json('settings')->nullable();
            $table->timestamps();
        });

        Schema::table('questions', function (Blueprint $table) {
            $table->string('stage', 30)->nullable()->after('type');
            $table->index(['quiz_id', 'stage', 'order']);
        });
    }

    public function down(): void
    {
        Schema::table('questions', function (Blueprint $table) {
            $table->dropIndex(['quiz_id', 'stage', 'order']);
            $table->dropColumn('stage');
        });

        Schema::dropIfExists('grammar_lessons');
    }
};
