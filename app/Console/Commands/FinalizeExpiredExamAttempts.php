<?php

namespace App\Console\Commands;

use App\Models\ExamAttempt;
use App\Services\ExamAttemptService;
use Illuminate\Console\Command;

class FinalizeExpiredExamAttempts extends Command
{
    protected $signature = 'exams:finalize-expired {--limit=500}';

    protected $description = 'Finalize standalone exam attempts whose server deadline has passed';

    public function handle(ExamAttemptService $attempts): int
    {
        $processed = 0;
        ExamAttempt::query()->where('status', 'in_progress')->where('deadline_at', '<=', now())->orderBy('id')
            ->limit((int) $this->option('limit'))->get()->each(function ($attempt) use ($attempts, &$processed) {
                $attempts->submit($attempt, 'timeout');
                $processed++;
            });
        $this->info("Finalized {$processed} expired attempts.");

        return self::SUCCESS;
    }
}
