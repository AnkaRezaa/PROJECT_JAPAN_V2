<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('broadcast_popups', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('type')->default('promo'); // promo, announcement, event, maintenance
            $table->string('badge')->nullable(); // Diskon Terbatas, Event Spesial, Info Penting
            $table->string('image_path')->nullable();
            $table->string('cta_label')->nullable(); // Lihat Paket, Daftar Sekarang, dll
            $table->string('cta_url')->nullable(); // /pricing, https://..., dll
            $table->string('target_page')->default('all'); // all, landing_page, dashboard
            $table->string('target_audience')->default('all'); // all, guest, user, free_user
            $table->boolean('is_active')->default(true);
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['is_active', 'target_page']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('broadcast_popups');
    }
};
