<?php

namespace App\Services;

use App\Models\Flashcard;
use App\Models\Kuis;
use App\Models\Pengguna;
use App\Models\ReviewFlashcard;
use App\Models\ReviewSoal;
use App\Models\Soal;
use Illuminate\Support\Carbon;

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

        $this->applyResult($review, $isCorrect, 'last_answered_at');

        $review->quiz_id = $quiz?->id;
        $review->module_id = $moduleId;
        $review->save();

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

        $review->known_count = (int) $review->known_count + ($isKnown ? 1 : 0);
        $review->learning_count = (int) $review->learning_count + ($isKnown ? 0 : 1);

        $this->applyResult($review, $isKnown, 'last_reviewed_at');
        $review->save();

        return $review;
    }

    public function snapshot(ReviewSoal|ReviewFlashcard $review): array
    {
        return ['_exists' => $review->exists] + collect([
            'status',
            'mastery_level',
            'correct_streak',
            'wrong_count',
            'review_count',
            'last_result',
            'last_answered_at',
            'last_reviewed_at',
            'next_review_at',
            'known_count',
            'learning_count',
        ])->filter(fn (string $attribute) => array_key_exists($attribute, $review->getAttributes()))
            ->mapWithKeys(fn (string $attribute) => [$attribute => $review->getAttribute($attribute)])
            ->all();
    }

    public function pulihkan(ReviewSoal|ReviewFlashcard $review, array $snapshot): void
    {
        if (($snapshot['_exists'] ?? true) === false) {
            $review->delete();

            return;
        }

        unset($snapshot['_exists']);
        $review->forceFill($snapshot)->save();
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
