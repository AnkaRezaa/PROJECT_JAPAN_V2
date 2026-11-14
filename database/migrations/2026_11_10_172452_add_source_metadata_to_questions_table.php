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
        Schema::table('questions', function (Blueprint $table) {
            $table->string('source_type', 50)->nullable()->after('stage');
            $table->unsignedBigInteger('source_id')->nullable()->after('source_type');
            $table->string('generation_mode', 50)->nullable()->after('source_id');

            $table->unique(
                ['quiz_id', 'source_type', 'source_id', 'generation_mode'],
                'unique_generated_question'
            );
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('questions', function (Blueprint $table) {
            $table->dropUnique('unique_generated_question');
            $table->dropColumn(['source_type', 'source_id', 'generation_mode']);
        });
    }
};
