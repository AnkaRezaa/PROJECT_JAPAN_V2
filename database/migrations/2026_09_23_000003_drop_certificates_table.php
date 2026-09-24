<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('certificates');
    }

    public function down(): void
    {
        Schema::create('certificates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('level_id')->nullable()->constrained('learning_levels')->nullOnDelete();
            $table->timestamp('issued_at')->nullable();
            $table->string('certificate_number')->unique();
            $table->timestamps();
        });
    }
};
