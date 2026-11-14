<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('module_days', function (Blueprint $table) {
            $table->boolean('handwriting_enabled')->default(true);
        });
    }

    public function down(): void
    {
        Schema::table('module_days', function (Blueprint $table) {
            $table->dropColumn('handwriting_enabled');
        });
    }
};
