<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('support_chat_messages', function (Blueprint $table) {
            $table->string('topic', 32)->nullable()->after('sender');
        });
    }

    public function down(): void
    {
        Schema::table('support_chat_messages', function (Blueprint $table) {
            $table->dropColumn('topic');
        });
    }
};
