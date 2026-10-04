<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('support_chats', function (Blueprint $table) {
            $table->id();
            $table->string('visitor_token_hash', 64)->unique();
            $table->string('name', 80);
            $table->string('email', 254);
            $table->string('status', 16)->default('open');
            $table->timestamp('last_message_at')->nullable()->index();
            $table->timestamp('last_notified_at')->nullable();
            $table->string('notification_status', 16)->nullable();
            $table->unsignedInteger('unread_admin')->default(0);
            $table->unsignedInteger('unread_visitor')->default(0);
            $table->timestamps();
            $table->index(['status', 'last_message_at']);
            $table->index(['status', 'updated_at']);
        });

        Schema::create('support_chat_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('support_chat_id')->constrained('support_chats')->cascadeOnDelete();
            $table->foreignId('admin_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('sender', 16);
            $table->text('body');
            $table->timestamps();
            $table->index(['support_chat_id', 'id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('support_chat_messages');
        Schema::dropIfExists('support_chats');
    }
};
