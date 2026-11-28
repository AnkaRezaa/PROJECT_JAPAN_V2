<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('module_days', function (Blueprint $table) {
            if (! Schema::hasColumn('module_days', 'kotoba_intro_title')) {
                $table->string('kotoba_intro_title', 255)->nullable()->after('description');
            }
            if (! Schema::hasColumn('module_days', 'kotoba_intro_body')) {
                $table->text('kotoba_intro_body')->nullable()->after('kotoba_intro_title');
            }
        });
    }

    public function down(): void
    {
        Schema::table('module_days', function (Blueprint $table) {
            $columns = [];
            if (Schema::hasColumn('module_days', 'kotoba_intro_body')) {
                $columns[] = 'kotoba_intro_body';
            }
            if (Schema::hasColumn('module_days', 'kotoba_intro_title')) {
                $columns[] = 'kotoba_intro_title';
            }
            if ($columns !== []) {
                $table->dropColumn($columns);
            }
        });
    }
};
