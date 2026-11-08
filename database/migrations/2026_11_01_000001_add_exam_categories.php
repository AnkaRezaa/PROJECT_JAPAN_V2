<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        foreach (['exams', 'exam_question_banks'] as $name) {
            Schema::table($name, function (Blueprint $table) {
                $table->foreignId('level_id')->nullable()->change();
                $table->string('category', 20)->default('jlpt');
                $table->string('ssw_field')->nullable();
                $table->index(['category', 'status']);
            });
        }
    }

    public function down(): void
    {
        foreach (['exams', 'exam_question_banks'] as $name) {
            if (DB::table($name)->whereNull('level_id')->exists()) {
                throw new RuntimeException('Cannot restore required levels while non-JLPT records exist.');
            }
        }
        foreach (['exams', 'exam_question_banks'] as $name) {
            Schema::table($name, function (Blueprint $table) {
                $table->dropIndex(['category', 'status']);
                $table->dropColumn(['category', 'ssw_field']);
                $table->foreignId('level_id')->nullable(false)->change();
            });
        }
    }
};
