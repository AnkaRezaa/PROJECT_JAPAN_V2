<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('review_daily_stats', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->date('stat_date');
            $table->unsignedInteger('total_count')->default(0);
            $table->unsignedInteger('new_count')->default(0);
            $table->unsignedInteger('learning_count')->default(0);
            $table->unsignedInteger('review_count')->default(0);
            $table->unsignedInteger('correct_count')->default(0);
            $table->unsignedInteger('wrong_count')->default(0);
            $table->unsignedInteger('skipped_count')->default(0);

            $table->unique(['user_id', 'stat_date']);
            $table->index('stat_date', 'review_daily_stats_prune_index');
        });

        $buffer = [];
        $rows = DB::table('review_events')
            ->where('occurred_at', '>=', now()->subDays(29)->startOfDay())
            ->selectRaw('user_id, DATE(occurred_at) as stat_date')
            ->selectRaw('COUNT(*) as total_count')
            ->selectRaw("SUM(CASE WHEN learning_state = 'new' THEN 1 ELSE 0 END) as new_count")
            ->selectRaw("SUM(CASE WHEN learning_state = 'learning' THEN 1 ELSE 0 END) as learning_count")
            ->selectRaw("SUM(CASE WHEN learning_state IN ('review', 'mastered') THEN 1 ELSE 0 END) as review_count")
            ->selectRaw("SUM(CASE WHEN result = 'correct' THEN 1 ELSE 0 END) as correct_count")
            ->selectRaw("SUM(CASE WHEN result = 'wrong' THEN 1 ELSE 0 END) as wrong_count")
            ->selectRaw("SUM(CASE WHEN result = 'skipped' THEN 1 ELSE 0 END) as skipped_count")
            ->groupBy('user_id', DB::raw('DATE(occurred_at)'))
            ->orderBy('user_id')
            ->cursor();

        foreach ($rows as $row) {
            $buffer[] = (array) $row;

            if (count($buffer) === 500) {
                DB::table('review_daily_stats')->insert($buffer);
                $buffer = [];
            }
        }

        if ($buffer !== []) {
            DB::table('review_daily_stats')->insert($buffer);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('review_daily_stats');
    }
};
