<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('show_romaji')->default(false)->after('avatar');
            $table->boolean('show_indonesian_translation')->default(false)->after('show_romaji');
            $table->timestamp('scheduled_anonymization_at')->nullable()->after('suspended_reason')->index();
            $table->timestamp('anonymized_at')->nullable()->after('scheduled_anonymization_at')->index();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['scheduled_anonymization_at']);
            $table->dropIndex(['anonymized_at']);
            $table->dropColumn([
                'show_romaji',
                'show_indonesian_translation',
                'scheduled_anonymization_at',
                'anonymized_at',
            ]);
        });
    }
};
