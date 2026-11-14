<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('course_reviews', function (Blueprint $table) {
            $table->unsignedTinyInteger('rating')->nullable()->change();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        if (DB::table('course_reviews')->whereNotNull('deleted_at')->orWhereNull('rating')->exists()) {
            throw new RuntimeException('Cannot remove review deletion history while withdrawn reviews exist.');
        }
        Schema::table('course_reviews', function (Blueprint $table) {
            $table->dropSoftDeletes();
            $table->unsignedTinyInteger('rating')->nullable(false)->change();
        });
    }
};
