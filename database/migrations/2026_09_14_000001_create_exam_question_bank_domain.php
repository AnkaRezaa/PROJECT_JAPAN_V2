<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('exam_question_banks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('level_id')->constrained('levels')->restrictOnDelete();
            $table->string('slug')->unique();
            $table->string('title');
            $table->string('source')->nullable();
            $table->text('description')->nullable();
            $table->string('status', 20)->default('published');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['level_id', 'status']);
        });

        Schema::create('exam_question_wrappers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('exam_question_bank_id')->constrained('exam_question_banks')->cascadeOnDelete();
            $table->string('wrapper_code', 80)->nullable();
            $table->string('title');
            $table->string('category', 40)->default('reading');
            $table->string('mondai_number', 40)->nullable();
            $table->longText('stimulus_text')->nullable();
            $table->longText('stimulus_reading')->nullable();
            $table->string('audio_url', 500)->nullable();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['exam_question_bank_id', 'category']);
            $table->index(['exam_question_bank_id', 'wrapper_code']);
        });

        Schema::create('exam_bank_questions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('exam_question_bank_id')->constrained('exam_question_banks')->cascadeOnDelete();
            $table->foreignId('exam_question_wrapper_id')->nullable()->constrained('exam_question_wrappers')->cascadeOnDelete();
            $table->string('code', 80)->nullable();
            $table->string('type', 40)->default('multiple_choice');
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->unsignedSmallInteger('points')->default(1);
            $table->text('question_text');
            $table->text('question_reading')->nullable();
            $table->json('options')->nullable();
            $table->json('option_readings')->nullable();
            $table->text('correct_answer');
            $table->text('correct_answer_reading')->nullable();
            $table->text('explanation')->nullable();
            $table->text('explanation_reading')->nullable();
            $table->string('audio_url', 500)->nullable();
            $table->char('content_hash', 64);
            $table->timestamps();

            $table->index(['exam_question_bank_id', 'type']);
            $table->index(['exam_question_wrapper_id', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('exam_bank_questions');
        Schema::dropIfExists('exam_question_wrappers');
        Schema::dropIfExists('exam_question_banks');
    }
};
