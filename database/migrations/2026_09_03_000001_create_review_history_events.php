<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // The old composite unique is also the supporting index for the user FK on MySQL.
        Schema::table('flashcard_reviews', function (Blueprint $table) {
            $table->index('user_id', 'flashcard_reviews_user_id_index');
        });

        Schema::table('flashcard_reviews', function (Blueprint $table) {
            $table->dropUnique('flashcard_reviews_user_id_flashcard_id_unique');
            $table->string('skill', 24)->default('recognition')->after('flashcard_id');
            $table->unique(['user_id', 'flashcard_id', 'skill']);
        });

        Schema::create('review_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('source_type', 24);
            $table->unsignedBigInteger('source_id');
            $table->string('activity_type', 32);
            $table->string('learning_state', 16);
            $table->string('result', 16);
            $table->timestamp('occurred_at');

            $table->index(['user_id', 'occurred_at'], 'review_event_user_history_index');
            $table->index(['user_id', 'learning_state', 'occurred_at'], 'review_event_user_state_index');
            $table->index(['occurred_at', 'id'], 'review_event_prune_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('review_events');

        Schema::table('flashcard_reviews', function (Blueprint $table) {
            $table->dropUnique(['user_id', 'flashcard_id', 'skill']);
            $table->dropColumn('skill');
            $table->unique(['user_id', 'flashcard_id']);
        });

        Schema::table('flashcard_reviews', function (Blueprint $table) {
            $table->dropIndex('flashcard_reviews_user_id_index');
        });
    }
};
