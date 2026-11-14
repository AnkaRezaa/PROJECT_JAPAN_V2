<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('module_days', function (Blueprint $table) {
            $table->foreignId('exam_id')->nullable()->after('checkpoint_quiz_id')
                ->constrained('exams')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('module_days', function (Blueprint $table) {
            $table->dropConstrainedForeignId('exam_id');
        });
    }
};
