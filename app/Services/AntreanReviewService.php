<?php

namespace App\Services;

use App\Models\Kuis;
use App\Models\Pengguna;
use App\Models\ReviewFlashcard;
use App\Models\ReviewSoal;
use App\Models\SetFlashcard;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;

class AntreanReviewService
{
    public const MAX_ITEMS = 10;

    public const MAX_NEW_ITEMS = 3;

    public function __construct(
        private readonly AksesKuisPenggunaService $aksesKuis,
        private readonly AksesPremiumService $aksesPremium,
        private readonly AksesFlashcardPenggunaService $aksesFlashcard
    ) {}

    public function summary(Pengguna $user, bool $fresh = false): array
    {
        if ($fresh) {
            Cache::forget($this->summaryKey($user));
        }

        return Cache::remember($this->summaryKey($user), now()->addMinutes(2), function () use ($user) {
            $candidates = $this->candidates($user);

            return [
                'required_count' => $candidates->whereIn('bucket', ['wrong', 'due', 'learning'])->count(),
                'wrong_count' => $candidates->where('bucket', 'wrong')->count(),
                'due_count' => $candidates->where('bucket', 'due')->count(),
                'learning_count' => $candidates->where('bucket', 'learning')->count(),
                'new_count' => $candidates->where('bucket', 'new')->count(),
                'session_count' => $this->select($candidates)->count(),
            ];
        });
    }

    public function selected(Pengguna $user): Collection
    {
        return $this->select($this->candidates($user));
    }

    public function badgeCount(Pengguna $user): int
    {
        return Cache::remember($this->badgeKey($user), now()->addMinutes(2), function () use ($user) {
            $due = function ($query): void {
                $query->where('last_result', 'wrong')
                    ->orWhere('status', 'learning')
                    ->orWhere('next_review_at', '<=', now());
            };

            return ReviewSoal::query()
                ->where('user_id', $user->id)
                ->where($due)
                ->count()
                + ReviewFlashcard::query()
                    ->where('user_id', $user->id)
                    ->where($due)
                    ->count();
        });
    }

    public function forgetSummary(Pengguna $user): void
    {
        Cache::forget($this->summaryKey($user));
        Cache::forget($this->badgeKey($user));
    }

    private function candidates(Pengguna $user): Collection
    {
        return $this->questionCandidates($user)
            ->concat($this->flashcardCandidates($user))
            ->unique('key')
            ->values();
    }

    private function questionCandidates(Pengguna $user): Collection
    {
        $quizzes = Kuis::query()
            ->with([
                'module.programPembelajaran:id,title,slug',
                'day:id,module_id,day_number,title,status,checkpoint_quiz_id',
                'questions' => fn ($query) => $query->orderBy('order'),
            ])
            ->where('status', 'published')
            ->whereHas('questions')
            ->whereHas('module', fn ($query) => $query->where('status', 'published'))
            ->get()
            ->filter(fn (Kuis $quiz) => ! $quiz->isWeeklyExam()
                && $quiz->module?->program_pembelajaran_id
                && $this->aksesPremium->punyaAksesKelas($user, $quiz->module->program_pembelajaran_id)
                && $this->aksesKuis->status($user, $quiz)['allowed']);

        $questions = $quizzes->flatMap(fn (Kuis $quiz) => $quiz->questions
            ->where('type', '!=', 'handwriting')
            ->reject(fn ($question) => (bool) data_get($question->options, 'practice_only', false))
            ->map(fn ($question) => [
                'question' => $question,
                'quiz' => $quiz,
            ]));
        $reviews = ReviewSoal::query()
            ->where('user_id', $user->id)
            ->whereIn('question_id', $questions->pluck('question.id'))
            ->get()
            ->keyBy('question_id');

        return $questions->map(function (array $candidate) use ($reviews) {
            $question = $candidate['question'];
            $quiz = $candidate['quiz'];
            $review = $reviews->get($question->id);
            $bucket = $this->bucket($review);

            return [
                'key' => "question:{$question->id}:quiz",
                'source_type' => 'question',
                'source_id' => $question->id,
                'skill' => 'quiz',
                'bucket' => $bucket,
                'priority' => $this->priority($bucket),
                'program_id' => $quiz->module?->program_pembelajaran_id,
            ];
        });
    }

    private function flashcardCandidates(Pengguna $user): Collection
    {
        $sets = SetFlashcard::query()
            ->with([
                'module.programPembelajaran:id,title,slug',
                'day:id,module_id,day_number,title,status,checkpoint_quiz_id',
                'flashcards.vocabulary',
            ])
            ->where('status', 'published')
            ->whereHas('flashcards')
            ->whereHas('module', fn ($query) => $query->where('status', 'published'))
            ->get()
            ->filter(fn (SetFlashcard $set) => $this->aksesFlashcard->status($user, $set)['allowed']);

        $cards = $sets->flatMap(fn (SetFlashcard $set) => $set->flashcards->map(fn ($card) => [
            'card' => $card,
            'set' => $set,
        ]))->unique('card.id')->values();
        $reviews = ReviewFlashcard::query()
            ->where('user_id', $user->id)
            ->whereIn('flashcard_id', $cards->pluck('card.id'))
            ->get()
            ->keyBy(fn (ReviewFlashcard $review) => "{$review->flashcard_id}:{$review->skill}");

        return $cards->flatMap(function (array $candidate) use ($reviews) {
            $card = $candidate['card'];
            $set = $candidate['set'];
            $skills = ['recognition'];

            if (preg_match('/\p{Han}/u', (string) $card->front_text)) {
                $skills[] = 'writing';
            }

            return collect($skills)->map(function (string $skill) use ($card, $set, $reviews) {
                $review = $reviews->get("{$card->id}:{$skill}");
                $bucket = $this->bucket($review);

                return [
                    'key' => "flashcard:{$card->id}:{$skill}",
                    'source_type' => 'flashcard',
                    'source_id' => $card->id,
                    'skill' => $skill,
                    'bucket' => $bucket,
                    'priority' => $this->priority($bucket),
                    'program_id' => $set->module?->program_pembelajaran_id,
                ];
            });
        });
    }

    private function bucket(ReviewSoal|ReviewFlashcard|null $review): string
    {
        return match (true) {
            $review?->last_result === 'wrong' => 'wrong',
            $review?->next_review_at?->lte(now()) => 'due',
            $review?->status === 'learning' => 'learning',
            $review === null || $review?->status === 'new' => 'new',
            default => 'scheduled',
        };
    }

    private function priority(string $bucket): int
    {
        return match ($bucket) {
            'wrong' => 0,
            'due' => 1,
            'learning' => 2,
            'new' => 3,
            default => 4,
        };
    }

    private function select(Collection $candidates): Collection
    {
        $eligible = $candidates->whereIn('bucket', ['wrong', 'due', 'learning', 'new']);
        $selected = collect();
        $newCount = 0;

        foreach ($eligible->groupBy('priority')->sortKeys() as $group) {
            foreach ($group->shuffle() as $candidate) {
                if ($candidate['bucket'] === 'new' && $newCount >= self::MAX_NEW_ITEMS) {
                    continue;
                }

                $selected->push($candidate);
                $newCount += $candidate['bucket'] === 'new' ? 1 : 0;

                if ($selected->count() >= self::MAX_ITEMS) {
                    return $selected->values();
                }
            }
        }

        return $selected->values();
    }

    private function summaryKey(Pengguna $user): string
    {
        return "review:summary:{$user->id}";
    }

    private function badgeKey(Pengguna $user): string
    {
        return "review:badge:{$user->id}";
    }
}
