<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('module_days', function (Blueprint $table) {
            if (! Schema::hasColumn('module_days', 'handwriting_mode')) {
                $table->string('handwriting_mode', 30)->default('guided_then_blank')->after('handwriting_enabled');
            }
        });
    }

    public function down(): void
    {
        Schema::table('module_days', function (Blueprint $table) {
            if (Schema::hasColumn('module_days', 'handwriting_mode')) {
                $table->dropColumn('handwriting_mode');
            }
        });
    }
};
