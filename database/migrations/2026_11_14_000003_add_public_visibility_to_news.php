<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('news', function (Blueprint $table) {
            $table->boolean('is_public')->default(false)->after('audience');
            $table->index(['is_public', 'audience', 'status'], 'news_public_visibility_index');
        });

        DB::table('news')->where('audience', 'all')->update(['is_public' => true]);
    }

    public function down(): void
    {
        Schema::table('news', function (Blueprint $table) {
            $table->dropIndex('news_public_visibility_index');
            $table->dropColumn('is_public');
        });
    }
};
