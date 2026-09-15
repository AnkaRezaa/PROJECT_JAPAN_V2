<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('product_feedback')
            ->where('response_type', 'skipped')
            ->where('status', 'new')
            ->update(['status' => 'dismissed']);
    }

    public function down(): void
    {
        DB::table('product_feedback')
            ->where('response_type', 'skipped')
            ->where('status', 'dismissed')
            ->update(['status' => 'new']);
    }
};
