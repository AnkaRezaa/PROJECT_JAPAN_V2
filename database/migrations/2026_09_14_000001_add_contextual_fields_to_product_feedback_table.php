<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('product_feedback', function (Blueprint $table) {
            $table->string('source', 20)->default('manual')->after('role_snapshot');
            $table->string('feature', 20)->nullable()->after('source');
            $table->string('context_type', 30)->nullable()->after('feature');
            $table->unsignedBigInteger('context_id')->nullable()->after('context_type');
            $table->string('context_key', 100)->nullable()->after('context_id');
            $table->string('trigger', 40)->nullable()->after('context_key');
            $table->unsignedTinyInteger('rating')->nullable()->after('trigger');
            $table->string('reason', 40)->nullable()->after('rating');
            $table->string('response_type', 20)->default('submitted')->after('reason');
            $table->text('message')->nullable()->change();

            $table->unique(['user_id', 'context_key'], 'product_feedback_user_context_unique');
            $table->index(['source', 'status', 'created_at'], 'product_feedback_source_status_created_index');
            $table->index(['feature', 'created_at'], 'product_feedback_feature_created_index');
        });
    }

    public function down(): void
    {
        DB::table('product_feedback')->whereNull('message')->update(['message' => '']);

        Schema::table('product_feedback', function (Blueprint $table) {
            $table->dropUnique('product_feedback_user_context_unique');
            $table->dropIndex('product_feedback_source_status_created_index');
            $table->dropIndex('product_feedback_feature_created_index');
            $table->text('message')->nullable(false)->change();
            $table->dropColumn([
                'source',
                'feature',
                'context_type',
                'context_id',
                'context_key',
                'trigger',
                'rating',
                'reason',
                'response_type',
            ]);
        });
    }
};
