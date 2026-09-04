<?php

namespace App\Services;

use App\Models\EventReview;
use App\Models\Flashcard;
use App\Models\Kuis;
use App\Models\Pengguna;
use App\Models\ReviewDailyStat;
use App\Models\ReviewFlashcard;
use App\Models\ReviewSoal;
use App\Models\Soal;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class RepetisiPembelajaranService
{
    public function catatJawabanSoal(Pengguna $user, Soal $question, bool $isCorrect, ?Kuis $quiz = null): ReviewSoal
    {
        $quiz ??= $question->quiz;
        $moduleId = $quiz?->module_id;

        $review = ReviewSoal::firstOrNew([
            'user_id' => $user->id,
            'question_id' => $question->id,
        ]);
        $learningState = $this->learningState($review);

        $this->applyResult($review, $isCorrect, 'last_answered_at');

        $review->quiz_id = $quiz?->id;
        $review->module_id = $moduleId;
        $review->save();
        $this->recordEvent(
            $user,
            'question',
            $question->id,
            $this->questionActivityType($question),
            $learningState,
            $isCorrect ? 'correct' : 'wrong',
        );

        return $review;
    }

    public function catatReviewFlashcard(
        Pengguna $user,
        Flashcard $flashcard,
        bool $isKnown,
        string $skill = 'recognition'
    ): ReviewFlashcard {
        $review = ReviewFlashcard::firstOrNew([
            'user_id' => $user->id,
            'flashcard_id' => $flashcard->id,
            'skill' => $skill,
        ]);
        $learningState = $this->learningState($review);

        $review->known_count = (int) $review->known_count + ($isKnown ? 1 : 0);
        $review->learning_count = (int) $review->learning_count + ($isKnown ? 0 : 1);

        $this->applyResult($review, $isKnown, 'last_reviewed_at');
        $review->save();
        $this->recordEvent(
            $user,
            'flashcard',
            $flashcard->id,
            $skill === 'writing' ? 'kanji_writing' : 'flashcard',
            $learningState,
            $isKnown ? 'correct' : 'wrong',
        );

        return $review;
    }

    public function purgeHistory(Pengguna $user): int
    {
        $deleted = DB::transaction(function () use ($user) {
            $deletedStats = ReviewDailyStat::query()->where('user_id', $user->id)->delete();

            return $deletedStats + EventReview::query()->where('user_id', $user->id)->delete();
        });
        $this->forgetHistoryStats($user->id);

        return $deleted;
    }

    public function resetReview(Pengguna $user): void
    {
        DB::transaction(function () use ($user) {
            EventReview::query()->where('user_id', $user->id)->delete();
            ReviewDailyStat::query()->where('user_id', $user->id)->delete();

            ReviewSoal::query()->where('user_id', $user->id)->update([
                'status' => 'new',
                'mastery_level' => 0,
                'correct_streak' => 0,
                'wrong_count' => 0,
                'review_count' => 0,
                'last_result' => null,
                'last_answered_at' => null,
                'next_review_at' => null,
            ]);

            ReviewFlashcard::query()->where('user_id', $user->id)->update([
                'status' => 'new',
                'known_count' => 0,
                'learning_count' => 0,
                'mastery_level' => 0,
                'correct_streak' => 0,
                'wrong_count' => 0,
                'review_count' => 0,
                'last_result' => null,
                'last_reviewed_at' => null,
                'next_review_at' => null,
            ]);
        });

        $this->forgetHistoryStats($user->id);
    }

    public function historyStats(Pengguna $user, int $days): array
    {
        $days = in_array($days, [7, 30], true) ? $days : 30;

        return Cache::remember(
            "review:history:stats:{$user->id}:{$days}",
            now()->addMinutes(5),
            function () use ($user, $days) {
                $row = ReviewDailyStat::query()
                    ->where('user_id', $user->id)
                    ->where('stat_date', '>=', now()->subDays($days - 1)->toDateString())
                    ->selectRaw('COALESCE(SUM(total_count), 0) as total_count')
                    ->selectRaw('COALESCE(SUM(new_count), 0) as new_count')
                    ->selectRaw('COALESCE(SUM(learning_count), 0) as learning_count')
                    ->selectRaw('COALESCE(SUM(review_count), 0) as review_count')
                    ->selectRaw('COALESCE(SUM(correct_count), 0) as correct_count')
                    ->selectRaw('COALESCE(SUM(wrong_count), 0) as wrong_count')
                    ->selectRaw('COALESCE(SUM(skipped_count), 0) as skipped_count')
                    ->first();

                $answered = (int) $row->correct_count + (int) $row->wrong_count;

                return [
                    'total_count' => (int) $row->total_count,
                    'new_count' => (int) $row->new_count,
                    'learning_count' => (int) $row->learning_count,
                    'review_count' => (int) $row->review_count,
                    'correct_count' => (int) $row->correct_count,
                    'wrong_count' => (int) $row->wrong_count,
                    'skipped_count' => (int) $row->skipped_count,
                    'accuracy' => $answered > 0 ? (int) round(((int) $row->correct_count / $answered) * 100) : 0,
                ];
            },
        );
    }

    private function applyResult(ReviewSoal|ReviewFlashcard $review, bool $isCorrect, string $timestampColumn): void
    {
        $currentLevel = (int) ($review->mastery_level ?? 0);
        $reviewCount = (int) ($review->review_count ?? 0) + 1;

        if ($isCorrect) {
            $level = min(5, $currentLevel + 1);
            $review->correct_streak = (int) ($review->correct_streak ?? 0) + 1;
            $review->last_result = 'correct';
            $review->status = $level >= 5 ? 'mastered' : ($level >= 3 ? 'review' : 'learning');
        } else {
            $level = max(0, $currentLevel - 1);
            $review->correct_streak = 0;
            $review->wrong_count = (int) ($review->wrong_count ?? 0) + 1;
            $review->last_result = 'wrong';
            $review->status = 'learning';
        }

        $review->mastery_level = $level;
        $review->review_count = $reviewCount;
        $review->{$timestampColumn} = now();
        $review->next_review_at = $this->nextReviewAt($level, $isCorrect);
    }

    private function recordEvent(
        Pengguna $user,
        string $sourceType,
        int $sourceId,
        string $activityType,
        string $learningState,
        string $result,
    ): void {
        DB::transaction(function () use ($user, $sourceType, $sourceId, $activityType, $learningState, $result) {
            EventReview::create([
                'user_id' => $user->id,
                'source_type' => $sourceType,
                'source_id' => $sourceId,
                'activity_type' => $activityType,
                'learning_state' => $learningState,
                'result' => $result,
                'occurred_at' => now(),
            ]);
            $this->incrementDailyStats($user->id, $learningState, $result);
        });

        $this->forgetHistoryStats($user->id);
    }

    private function incrementDailyStats(int $userId, string $learningState, string $result): void
    {
        $stateColumn = in_array($learningState, ['review', 'mastered'], true)
            ? 'review_count'
            : $learningState.'_count';
        $resultColumn = $result.'_count';
        $key = [
            'user_id' => $userId,
            'stat_date' => today()->toDateString(),
        ];

        DB::table('review_daily_stats')->insertOrIgnore($key + [
            'total_count' => 0,
            'new_count' => 0,
            'learning_count' => 0,
            'review_count' => 0,
            'correct_count' => 0,
            'wrong_count' => 0,
            'skipped_count' => 0,
        ]);

        DB::table('review_daily_stats')
            ->where($key)
            ->update([
                'total_count' => DB::raw('total_count + 1'),
                $stateColumn => DB::raw($stateColumn.' + 1'),
                $resultColumn => DB::raw($resultColumn.' + 1'),
            ]);
    }

    private function learningState(ReviewSoal|ReviewFlashcard $review): string
    {
        $state = $review->exists ? (string) $review->status : 'new';

        return in_array($state, ['new', 'learning', 'review', 'mastered'], true) ? $state : 'new';
    }

    private function questionActivityType(Soal $question): string
    {
        return match ($question->type) {
            'listening' => 'listening',
            'handwriting' => 'kanji_writing',
            'fill_blank' => 'fill_blank',
            'typing' => 'typing',
            'transformation' => 'transformation',
            'sentence_builder' => 'sentence_builder',
            'context_choice' => 'context_choice',
            default => 'multiple_choice',
        };
    }

    private function forgetHistoryStats(int $userId): void
    {
        Cache::forget("review:history:stats:{$userId}:7");
        Cache::forget("review:history:stats:{$userId}:30");
    }

    private function nextReviewAt(int $level, bool $isCorrect): Carbon
    {
        if (! $isCorrect) {
            return now()->addMinutes(10);
        }

        return match ($level) {
            0, 1 => now()->addDay(),
            2 => now()->addDays(3),
            3 => now()->addDays(7),
            4 => now()->addDays(14),
            default => now()->addDays(30),
        };
    }
}
