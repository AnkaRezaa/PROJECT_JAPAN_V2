<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('flashcard_reviews', function (Blueprint $table) {
            $table->dropUnique('flashcard_reviews_user_id_flashcard_id_unique');
            $table->string('skill', 24)->default('recognition')->after('flashcard_id');
            $table->unique(['user_id', 'flashcard_id', 'skill']);
            $table->index(['user_id', 'skill', 'status', 'next_review_at'], 'flashcard_review_queue_index');
        });

        Schema::create('review_sessions', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('mode', 24)->default('review');
            $table->unsignedSmallInteger('target_count')->default(0);
            $table->unsignedSmallInteger('correct_count')->default(0);
            $table->unsignedSmallInteger('wrong_count')->default(0);
            $table->unsignedSmallInteger('skipped_count')->default(0);
            $table->timestamp('started_at');
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('expires_at');
            $table->timestamps();

            $table->index(['user_id', 'mode', 'completed_at'], 'review_session_history_index');
        });

        Schema::create('review_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('session_id')->constrained('review_sessions')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('source_type', 24);
            $table->unsignedBigInteger('source_id');
            $table->string('skill', 24);
            $table->string('result', 16);
            $table->unsignedInteger('duration_ms')->nullable();
            $table->json('previous_state')->nullable();
            $table->timestamp('occurred_at');
            $table->timestamp('undone_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'occurred_at'], 'review_event_user_history_index');
            $table->index(['session_id', 'result'], 'review_event_session_result_index');
            $table->index(['source_type', 'source_id', 'skill'], 'review_event_source_index');
            $table->index(['occurred_at', 'id'], 'review_event_prune_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('review_events');
        Schema::dropIfExists('review_sessions');

        Schema::table('flashcard_reviews', function (Blueprint $table) {
            $table->dropIndex('flashcard_review_queue_index');
            $table->dropUnique(['user_id', 'flashcard_id', 'skill']);
            $table->dropColumn('skill');
            $table->unique(['user_id', 'flashcard_id']);
        });
    }
};
