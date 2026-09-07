<?php

namespace App\Console\Commands;

use App\Models\ExamAttemptAnswer;
use Illuminate\Console\Command;

class PruneExamAnswerDetails extends Command
{
    protected $signature = 'exams:prune-answers {--days=365} {--limit=10000}';

    protected $description = 'Prune old standalone exam answer details while retaining attempt summaries';

    public function handle(): int
    {
        $ids = ExamAttemptAnswer::query()
            ->where('updated_at', '<', now()->subDays(max(30, (int) $this->option('days'))))
            ->whereHas('attempt', fn ($query) => $query->whereIn('status', ['submitted', 'timed_out', 'invalidated']))
            ->orderBy('id')->limit((int) $this->option('limit'))->pluck('id');
        $count = $ids->isEmpty() ? 0 : ExamAttemptAnswer::whereKey($ids)->delete();
        $this->info("Pruned {$count} answer rows.");

        return self::SUCCESS;
    }
}
