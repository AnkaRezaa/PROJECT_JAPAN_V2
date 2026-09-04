<?php

namespace App\Console\Commands;

use App\Models\EventReview;
use App\Models\ReviewDailyStat;
use Illuminate\Console\Command;

class PruneReviewHistory extends Command
{
    protected $signature = 'reviews:prune
                            {--days=30 : Jumlah hari penyimpanan histori detail}
                            {--limit=100 : Jumlah maksimum histori detail per pengguna}
                            {--chunk=1000 : Jumlah baris per batch}';

    protected $description = 'Menghapus histori detail Review lama tanpa menghapus mastery pengguna';

    public function handle(): int
    {
        $days = max(1, (int) $this->option('days'));
        $limit = min(1000, max(20, (int) $this->option('limit')));
        $chunk = min(5000, max(100, (int) $this->option('chunk')));
        $cutoff = now()->subDays($days);
        $deletedEvents = 0;

        do {
            $ids = EventReview::query()
                ->where('occurred_at', '<', $cutoff)
                ->orderBy('id')
                ->limit($chunk)
                ->pluck('id');
            $deleted = $ids->isEmpty() ? 0 : EventReview::query()->whereIn('id', $ids)->delete();
            $deletedEvents += $deleted;
        } while ($deleted === $chunk);

        $cappedEvents = 0;
        EventReview::query()
            ->select('user_id')
            ->groupBy('user_id')
            ->havingRaw('COUNT(*) > ?', [$limit])
            ->orderBy('user_id')
            ->pluck('user_id')
            ->each(function (int $userId) use ($limit, &$cappedEvents) {
                $cutoff = EventReview::query()
                    ->where('user_id', $userId)
                    ->latest('occurred_at')
                    ->latest('id')
                    ->skip($limit - 1)
                    ->first(['id', 'occurred_at']);

                if (! $cutoff) {
                    return;
                }

                $cappedEvents += EventReview::query()
                    ->where('user_id', $userId)
                    ->where(function ($query) use ($cutoff) {
                        $query->where('occurred_at', '<', $cutoff->occurred_at)
                            ->orWhere(function ($sameTime) use ($cutoff) {
                                $sameTime->where('occurred_at', $cutoff->occurred_at)
                                    ->where('id', '<', $cutoff->id);
                            });
                    })
                    ->delete();
            });

        $deletedStats = ReviewDailyStat::query()
            ->where('stat_date', '<', today()->subDays($days - 1)->toDateString())
            ->delete();

        $this->info("Menghapus {$deletedEvents} event lama, {$cappedEvents} event melebihi batas, dan {$deletedStats} ringkasan lama.");

        return self::SUCCESS;
    }
}
