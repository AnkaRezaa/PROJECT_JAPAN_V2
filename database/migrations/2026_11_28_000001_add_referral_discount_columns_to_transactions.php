<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            if (! Schema::hasColumn('transactions', 'original_amount')) {
                $table->unsignedInteger('original_amount')->nullable()->after('amount');
            }
            if (! Schema::hasColumn('transactions', 'discount_amount')) {
                $table->unsignedInteger('discount_amount')->default(0)->after('original_amount');
            }
            if (! Schema::hasColumn('transactions', 'discount_meta')) {
                $table->json('discount_meta')->nullable()->after('discount_amount');
            }
        });
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $columns = array_values(array_filter(
                ['original_amount', 'discount_amount', 'discount_meta'],
                static fn (string $column): bool => Schema::hasColumn('transactions', $column)
            ));

            if ($columns !== []) {
                $table->dropColumn($columns);
            }
        });
    }
};
