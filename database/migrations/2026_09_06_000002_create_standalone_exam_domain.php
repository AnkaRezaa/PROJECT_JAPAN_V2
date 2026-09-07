<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('exams', function (Blueprint $table) {
            $table->id();
            $table->foreignId('level_id')->constrained('levels')->restrictOnDelete();
            $table->string('slug')->unique();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('type', 20);
            $table->string('access_type', 20)->default('all');
            $table->string('status', 20)->default('draft');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['status', 'type', 'level_id']);
        });

        Schema::create('exam_versions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('exam_id')->constrained('exams')->cascadeOnDelete();
            $table->unsignedSmallInteger('version_number');
            $table->string('status', 20)->default('draft');
            $table->unsignedSmallInteger('attempt_limit')->nullable();
            $table->string('result_release_policy', 20)->default('immediate');
            $table->string('review_policy', 20)->default('wrong_only');
            $table->string('ranking_policy', 20)->default('disabled');
            $table->char('content_hash', 64)->nullable();
            $table->timestamp('published_at')->nullable();
            $table->foreignId('published_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['exam_id', 'version_number']);
            $table->index(['exam_id', 'status']);
        });

        Schema::create('exam_sections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('exam_version_id')->constrained('exam_versions')->cascadeOnDelete();
            $table->string('key', 40);
            $table->string('title');
            $table->string('short_title')->nullable();
            $table->unsignedSmallInteger('sort_order');
            $table->unsignedInteger('time_limit_seconds');
            $table->unsignedInteger('raw_max_points')->default(0);
            $table->unsignedSmallInteger('estimated_max_score')->default(60);
            $table->unsignedSmallInteger('estimated_pass_score')->default(19);
            $table->timestamps();

            $table->unique(['exam_version_id', 'key']);
            $table->unique(['exam_version_id', 'sort_order']);
        });

        Schema::create('exam_version_questions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('exam_section_id')->constrained('exam_sections')->cascadeOnDelete();
            $table->foreignId('source_question_id')->nullable()->constrained('questions')->nullOnDelete();
            $table->string('code', 80)->nullable();
            $table->string('type', 40);
            $table->unsignedSmallInteger('sort_order');
            $table->unsignedSmallInteger('points')->default(1);
            $table->text('question_text');
            $table->text('question_reading')->nullable();
            $table->json('options')->nullable();
            $table->json('option_readings')->nullable();
            $table->text('correct_answer');
            $table->text('correct_answer_reading')->nullable();
            $table->text('explanation')->nullable();
            $table->text('explanation_reading')->nullable();
            $table->string('audio_path', 500)->nullable();
            $table->char('content_hash', 64);
            $table->timestamps();

            $table->unique(['exam_section_id', 'sort_order']);
            $table->index(['exam_section_id', 'type']);
        });

        Schema::create('exam_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('exam_version_id')->constrained('exam_versions')->restrictOnDelete();
            $table->string('name');
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            $table->string('status', 20)->default('draft');
            $table->unsignedSmallInteger('attempt_limit_override')->nullable();
            $table->timestamp('result_released_at')->nullable();
            $table->boolean('ranking_enabled')->default(false);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['status', 'starts_at', 'ends_at']);
            $table->index(['exam_version_id', 'status']);
        });

        Schema::create('exam_session_cohorts', function (Blueprint $table) {
            $table->foreignId('exam_session_id')->constrained('exam_sessions')->cascadeOnDelete();
            $table->foreignId('kloter_belajar_id')->constrained('kloter_belajar')->cascadeOnDelete();
            $table->primary(['exam_session_id', 'kloter_belajar_id']);
        });

        Schema::create('exam_attempts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('exam_session_id')->constrained('exam_sessions')->restrictOnDelete();
            $table->foreignId('exam_version_id')->constrained('exam_versions')->restrictOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->uuid('submission_token')->unique();
            $table->string('mode', 20)->default('full');
            $table->string('selected_section_key', 40)->nullable();
            $table->unsignedSmallInteger('attempt_number');
            $table->string('status', 20)->default('in_progress');
            $table->timestamp('started_at');
            $table->timestamp('deadline_at');
            $table->timestamp('submitted_at')->nullable();
            $table->unsignedInteger('raw_points')->default(0);
            $table->unsignedSmallInteger('estimated_score')->default(0);
            $table->boolean('estimated_passed')->nullable();
            $table->boolean('ranking_eligible')->default(false);
            $table->string('submitted_by', 20)->nullable();
            $table->unsignedInteger('server_revision')->default(0);
            $table->timestamp('invalidated_at')->nullable();
            $table->foreignId('invalidated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('invalidation_reason')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'exam_session_id', 'attempt_number'], 'exam_attempt_user_session_number_unique');
            $table->index(['exam_session_id', 'status', 'ranking_eligible', 'estimated_score'], 'exam_attempt_ranking_index');
            $table->index(['user_id', 'submitted_at']);
            $table->index(['status', 'deadline_at']);
        });

        Schema::create('exam_attempt_sections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('exam_attempt_id')->constrained('exam_attempts')->cascadeOnDelete();
            $table->foreignId('exam_section_id')->constrained('exam_sections')->restrictOnDelete();
            $table->unsignedSmallInteger('answered_count')->default(0);
            $table->unsignedSmallInteger('correct_count')->default(0);
            $table->unsignedInteger('raw_points')->default(0);
            $table->unsignedSmallInteger('estimated_score')->default(0);
            $table->boolean('estimated_passed')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamps();

            $table->unique(['exam_attempt_id', 'exam_section_id'], 'exam_attempt_section_unique');
        });

        Schema::create('exam_attempt_answers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('exam_attempt_id')->constrained('exam_attempts')->cascadeOnDelete();
            $table->foreignId('exam_version_question_id')->constrained('exam_version_questions')->restrictOnDelete();
            $table->text('answer_text')->nullable();
            $table->json('answer_payload')->nullable();
            $table->boolean('is_correct')->nullable();
            $table->unsignedSmallInteger('earned_points')->default(0);
            $table->boolean('flagged')->default(false);
            $table->timestamp('answered_at')->nullable();
            $table->timestamps();

            $table->unique(['exam_attempt_id', 'exam_version_question_id'], 'exam_attempt_answer_unique');
            $table->index(['exam_attempt_id', 'flagged']);
            $table->index('updated_at');
        });

        Schema::create('exam_audit_logs', function (Blueprint $table) {
            $table->id();
            $table->string('subject_type', 40);
            $table->unsignedBigInteger('subject_id');
            $table->string('action', 40);
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->json('metadata')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['subject_type', 'subject_id', 'created_at'], 'exam_audit_subject_index');
            $table->index(['action', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('exam_audit_logs');
        Schema::dropIfExists('exam_attempt_answers');
        Schema::dropIfExists('exam_attempt_sections');
        Schema::dropIfExists('exam_attempts');
        Schema::dropIfExists('exam_session_cohorts');
        Schema::dropIfExists('exam_sessions');
        Schema::dropIfExists('exam_version_questions');
        Schema::dropIfExists('exam_sections');
        Schema::dropIfExists('exam_versions');
        Schema::dropIfExists('exams');
    }
};
