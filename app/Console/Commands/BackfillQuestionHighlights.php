<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class BackfillQuestionHighlights extends Command
{
    protected $signature = 'quiz:backfill-highlights {--apply : Persist only unambiguous vocabulary targets} {--rollback= : Private journal filename to restore conditionally}';

    protected $description = 'Inspect old question highlight targets; dry-run unless --apply is supplied';

    public function handle(): int
    {
        $apply = (bool) $this->option('apply');
        if ($filename = $this->option('rollback')) {
            if (basename($filename) !== $filename || ! str_starts_with($filename, 'highlight-')) {
                $this->error('Invalid journal filename.');

                return self::FAILURE;
            }
            $rows = json_decode(Storage::disk('local')->get('highlight-backfills/'.$filename), true, 512, JSON_THROW_ON_ERROR);
            $restored = DB::transaction(function () use ($rows) {
                $total = 0;
                foreach ($rows as $row) {
                    $total += DB::table('questions')->where('id', $row['id'])
                        ->where('question_text', $row['question_text'])->where('updated_at', $row['updated_at'])
                        ->where('highlight_text', $row['after'])->update(['highlight_text' => $row['before']]);
                }

                return $total;
            });
            $this->info("Restored: {$restored}; other rows unchanged.");

            return self::SUCCESS;
        }
        $journal = [];
        $updated = 0;
        $count = 0;
        DB::transaction(function () use ($apply, &$count, &$updated, &$journal) {
            DB::table('questions')->whereNull('highlight_text')->orderBy('id')->chunkById(250, function ($rows) use ($apply, &$count, &$updated, &$journal) {
                $ids = $rows->where('source_type', 'vocabulary')->pluck('source_id')->filter();
                $words = DB::table('vocabulary_bank')->whereIn('id', $ids)->get()->keyBy('id');
                foreach ($rows as $row) {
                    $word = ($row->source_type ?? null) === 'vocabulary' ? $words->get($row->source_id) : null;
                    $target = match ($row->generation_mode ?? null) {
                        'word_to_meaning', 'word_to_reading' => $word?->word,
                        'reading_to_word' => $word?->reading,
                        default => null,
                    };
                    if (! $target && preg_match('/\A(?:Apa arti(?: dari)?|Bagaimana cara membaca) ([^()（）?]+)\?\z/u', $row->question_text, $matches)) {
                        $target = $matches[1];
                    }
                    if (! $target || ! str_contains($row->question_text, $target)) {
                        $this->line("SKIP {$row->id}: target requires review");

                        continue;
                    }
                    if (str_contains($row->question_text, '(') || str_contains($row->question_text, '（')) {
                        $this->line("SKIP {$row->id}: parenthesized text requires review");

                        continue;
                    }
                    $this->line(($apply ? 'APPLY ' : 'PROPOSE ').$row->id.': '.$target);
                    if ($apply) {
                        $changed = DB::table('questions')->where('id', $row->id)->whereNull('highlight_text')
                            ->where('question_text', $row->question_text)->where('updated_at', $row->updated_at)
                            ->update(['highlight_text' => $target]);
                        if ($changed) {
                            $updated += $changed;
                            $journal[] = ['id' => $row->id, 'question_text' => $row->question_text, 'updated_at' => $row->updated_at, 'before' => null, 'after' => $target];
                        }
                    }
                    $count++;
                }
            });
            if ($apply && $journal) {
                $name = 'highlight-'.now()->format('Ymd-His').'-'.bin2hex(random_bytes(4)).'.json';
                if (! Storage::disk('local')->put('highlight-backfills/'.$name, json_encode($journal, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE))) {
                    throw new \RuntimeException('Cannot save journal; transaction rolled back.');
                }
                $this->info('Journal: '.$name);
            }
        });
        $this->info("Updated: {$updated}");
        $this->info("Eligible: {$count}. Mode: ".($apply ? 'apply' : 'dry-run'));

        return self::SUCCESS;
    }
}
