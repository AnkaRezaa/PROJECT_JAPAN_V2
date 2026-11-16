<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', fn (Blueprint $table) => $table->timestamp('beta_registered_at')->nullable()->index());
        DB::table('app_settings')->insert([
            'key' => 'beta_access',
            'value' => json_encode(['enabled' => false, 'registration_open' => false, 'opens_at' => null, 'opened_at' => null]),
            'created_at' => now(), 'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        DB::table('app_settings')->where('key', 'beta_access')->delete();
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['beta_registered_at']);
            $table->dropColumn('beta_registered_at');
        });
    }
};
