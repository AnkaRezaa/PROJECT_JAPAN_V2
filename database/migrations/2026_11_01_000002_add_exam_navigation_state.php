<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('exam_versions', function (Blueprint $table) {
            $table->unsignedInteger('total_time_limit_seconds')->nullable();
        });
        Schema::table('exam_attempts', function (Blueprint $table) {
            $table->unsignedSmallInteger('active_section_index')->default(0);
            $table->unsignedSmallInteger('active_question_index')->default(0);
        });
    }

    public function down(): void
    {
        Schema::table('exam_attempts', fn (Blueprint $table) => $table->dropColumn(['active_section_index', 'active_question_index']));
        Schema::table('exam_versions', fn (Blueprint $table) => $table->dropColumn('total_time_limit_seconds'));
    }
};
