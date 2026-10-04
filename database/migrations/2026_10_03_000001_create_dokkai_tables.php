<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('dokkai_passages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('quiz_id')->unique()->constrained('quizzes')->cascadeOnDelete();
            $table->string('title');
            $table->string('sub_title')->nullable();
            $table->string('theme_category')->default('Umum');
            $table->string('jlpt_level', 5)->default('N3');
            $table->unsignedSmallInteger('estimated_reading_time')->default(5);
            $table->unsignedSmallInteger('xp_reward')->default(80);
            $table->string('audio_url')->nullable();
            $table->string('status')->default('draft');
            $table->timestamps();
        });

        Schema::create('dokkai_paragraphs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('dokkai_passage_id')->constrained('dokkai_passages')->cascadeOnDelete();
            $table->unsignedTinyInteger('paragraph_number');
            $table->string('label')->nullable();
            $table->unsignedSmallInteger('character_count')->default(0);
            $table->text('content_raw');
            $table->timestamps();

            $table->index(['dokkai_passage_id', 'paragraph_number']);
        });

        Schema::create('dokkai_vocabularies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('dokkai_passage_id')->constrained('dokkai_passages')->cascadeOnDelete();
            $table->foreignId('paragraph_id')->nullable()->constrained('dokkai_paragraphs')->nullOnDelete();
            $table->string('word');
            $table->string('furigana');
            $table->string('romaji')->nullable();
            $table->text('meaning');
            $table->string('pitch_accent')->nullable();
            $table->string('part_of_speech')->nullable();
            $table->string('jlpt_level', 5)->nullable();
            $table->text('example_sentence')->nullable();
            $table->text('example_translation')->nullable();
            $table->string('audio_url')->nullable();
            $table->timestamps();

            $table->index(['dokkai_passage_id', 'word']);
        });

        Schema::create('dokkai_questions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('dokkai_passage_id')->constrained('dokkai_passages')->cascadeOnDelete();
            $table->unsignedTinyInteger('question_number');
            $table->text('question_text');
            $table->text('question_translation')->nullable();
            $table->foreignId('evidence_paragraph_id')->nullable()->constrained('dokkai_paragraphs')->nullOnDelete();
            $table->text('evidence_quote')->nullable();
            $table->text('explanation_correct')->nullable();
            $table->json('explanation_distractors')->nullable();
            $table->json('options');
            $table->unsignedTinyInteger('order')->default(0);
            $table->timestamps();

            $table->index(['dokkai_passage_id', 'question_number']);
        });

        Schema::create('dokkai_attempt_answers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('attempt_id')->constrained('attempts')->cascadeOnDelete();
            $table->foreignId('dokkai_question_id')->constrained('dokkai_questions')->cascadeOnDelete();
            $table->string('selected_option', 5)->nullable();
            $table->boolean('is_correct')->default(false);
            $table->timestamps();

            $table->unique(['attempt_id', 'dokkai_question_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('dokkai_attempt_answers');
        Schema::dropIfExists('dokkai_questions');
        Schema::dropIfExists('dokkai_vocabularies');
        Schema::dropIfExists('dokkai_paragraphs');
        Schema::dropIfExists('dokkai_passages');
    }
};
