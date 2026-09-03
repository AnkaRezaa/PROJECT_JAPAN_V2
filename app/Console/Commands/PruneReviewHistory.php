<?php

namespace App\Console\Commands;

use App\Models\EventReview;
use App\Models\SesiReview;
use Illuminate\Console\Command;

class PruneReviewHistory extends Command
{
    protected $signature = 'reviews:prune {--days=30 : Jumlah hari penyimpanan histori detail} {--chunk=1000 : Jumlah baris per batch}';

    protected $description = 'Menghapus histori detail Review lama tanpa menghapus mastery pengguna';

    public function handle(): int
    {
        $days = max(1, (int) $this->option('days'));
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

        $deletedSessions = SesiReview::query()
            ->where('started_at', '<', $cutoff)
            ->whereDoesntHave('events')
            ->delete();

        $this->info("Menghapus {$deletedEvents} event dan {$deletedSessions} sesi Review lama.");

        return self::SUCCESS;
    }
}
