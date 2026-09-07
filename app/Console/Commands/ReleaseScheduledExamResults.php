<?php

namespace App\Console\Commands;

use App\Models\ExamSession;
use Illuminate\Console\Command;

class ReleaseScheduledExamResults extends Command
{
    protected $signature = 'exams:release-scheduled';

    protected $description = 'Release results for ended sessions using the after-session policy';

    public function handle(): int
    {
        $count = ExamSession::query()
            ->whereNull('result_released_at')
            ->whereNotNull('ends_at')->where('ends_at', '<=', now())
            ->whereHas('version', fn ($query) => $query->where('result_release_policy', 'after_session'))
            ->update(['result_released_at' => now(), 'updated_at' => now()]);
        $this->info("Released {$count} sessions.");

        return self::SUCCESS;
    }
}
