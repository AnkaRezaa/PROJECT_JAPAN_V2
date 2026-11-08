<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        foreach (['questions', 'dokkai_questions'] as $name) {
            Schema::table($name, function (Blueprint $table) {
                $table->string('highlight_text', 500)->nullable();
            });
        }
    }

    public function down(): void
    {
        foreach (['questions', 'dokkai_questions'] as $name) {
            Schema::table($name, function (Blueprint $table) {
                $table->dropColumn('highlight_text');
            });
        }
    }
};
