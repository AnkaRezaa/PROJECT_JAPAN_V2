<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('live_class_sessions', function (Blueprint $table) {
            $table->text('recording_url')->nullable();
            $table->text('summary_url')->nullable();
        });

        Schema::create('live_class_rsvps', function (Blueprint $table) {
            $table->id();
            $table->foreignId('live_class_session_id')->constrained('live_class_sessions')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('response', 16);
            $table->timestamps();
            $table->unique(['live_class_session_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('live_class_rsvps');
        Schema::table('live_class_sessions', function (Blueprint $table) {
            $table->dropColumn(['recording_url', 'summary_url']);
        });
    }
};
