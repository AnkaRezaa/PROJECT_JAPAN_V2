<?php

namespace App\Console\Commands;

use App\Models\SupportChat;
use Illuminate\Console\Command;

class PruneSupportChats extends Command
{
    protected $signature = 'support:prune';

    protected $description = 'Remove old support chat conversations';

    public function handle(): int
    {
        $deleted = 0;
        do {
            $ids = SupportChat::query()
                ->where(fn ($query) => $query
                    ->where(fn ($closed) => $closed->where('status', 'closed')->where('updated_at', '<', now()->subDays(90)))
                    ->orWhere(fn ($open) => $open->where('status', 'open')->where('updated_at', '<', now()->subDays(180))))
                ->limit(500)
                ->pluck('id');
            if ($ids->isEmpty()) break;

            $deleted += SupportChat::query()->whereIn('id', $ids)->delete();
        } while ($ids->count() === 500);

        $this->info("Deleted {$deleted} old support chats.");

        return self::SUCCESS;
    }
}
