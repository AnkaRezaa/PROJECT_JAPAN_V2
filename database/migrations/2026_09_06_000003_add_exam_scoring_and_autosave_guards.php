<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('exam_versions', 'estimated_total_pass_score')) {
            Schema::table('exam_versions', function (Blueprint $table) {
                $table->unsignedSmallInteger('estimated_total_pass_score')->nullable()->after('ranking_policy');
            });
        }

        if (! Schema::hasColumn('exam_attempts', 'last_autosave_token')) {
            Schema::table('exam_attempts', function (Blueprint $table) {
                $table->uuid('last_autosave_token')->nullable()->after('server_revision');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('exam_attempts', 'last_autosave_token')) {
            Schema::table('exam_attempts', function (Blueprint $table) {
                $table->dropColumn('last_autosave_token');
            });
        }

        if (Schema::hasColumn('exam_versions', 'estimated_total_pass_score')) {
            Schema::table('exam_versions', function (Blueprint $table) {
                $table->dropColumn('estimated_total_pass_score');
            });
        }
    }
};
