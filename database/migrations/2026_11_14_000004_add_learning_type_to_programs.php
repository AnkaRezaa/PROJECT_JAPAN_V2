<?php

use App\Services\ProgramLearningTypeBackfill;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Validate all legacy records before MySQL performs any schema changes.
        $mapping = app(ProgramLearningTypeBackfill::class)->mapping();
        Schema::table('program_pembelajaran', function (Blueprint $table) {
            $table->string('learning_type', 20)->default('mandiri')->index();
        });
        foreach ($mapping as $id => $type) {
            DB::table('program_pembelajaran')->where('id', $id)->update(['learning_type' => $type]);
        }
    }

    public function down(): void
    {
        Schema::table('program_pembelajaran', function (Blueprint $table) {
            $table->dropIndex(['learning_type']);
            $table->dropColumn('learning_type');
        });
    }
};
