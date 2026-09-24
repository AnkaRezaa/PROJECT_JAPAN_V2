<?php

use App\Models\Kuis;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Bersihkan 6 data kuis dummy mingguan
        Kuis::query()->whereNotNull('exam_order')->each(function (Kuis $quiz) {
            $quiz->questions()->delete();
            $quiz->delete();
        });

        // 2. Drop unique index dan column exam_order
        Schema::table('quizzes', function (Blueprint $table) {
            if (Schema::hasColumn('quizzes', 'exam_order')) {
                $table->dropUnique('quizzes_module_exam_order_unique');
                $table->dropColumn('exam_order');
            }
        });
    }

    public function down(): void
    {
        Schema::table('quizzes', function (Blueprint $table) {
            if (! Schema::hasColumn('quizzes', 'exam_order')) {
                $table->unsignedSmallInteger('exam_order')->nullable()->after('module_day_id');
                $table->unique(['module_id', 'exam_order'], 'quizzes_module_exam_order_unique');
            }
        });
    }
};
