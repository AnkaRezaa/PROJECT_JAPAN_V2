<?php

namespace App\Services;

use App\Models\Kosakata;
use App\Models\Kuis;
use App\Models\PengerjaanKuis;
use App\Models\Pengguna;
use App\Models\ReviewFlashcard;
use App\Models\ReviewSoal;
use App\Models\SetFlashcard;
use Illuminate\Support\Collection;

class PembelajaranPenggunaService
{
    public function __construct(
        private AksesKuisPenggunaService $aksesKuis
    ) {}

    public function quizLobby(Pengguna $user): Collection
    {
        $quizzes = Kuis::with('module.level')
            ->withCount('questions')
            ->where('status', 'published')
            ->whereHas('module', fn ($query) => $query->where('status', 'published'))
            ->get();

        $completedModuleIds = $this->completedModuleIds($user);

        return $quizzes->map(function (Kuis $quiz) use ($completedModuleIds, $user) {
            $module = $quiz->module;
            $accessStatus = $this->aksesKuis->status($user, $quiz);

            return [
                'id' => $quiz->id,
                'title' => $this->quizTitle($quiz),
                'description' => $quiz->description ?? 'Kuis evaluasi modul mingguan.',
                'xpReward' => 50,
                'durationEstimate' => $this->durationEstimate($quiz->time_limit),
                'totalQuestions' => $quiz->questions_count,
                'level' => $module?->level?->level_name ?? 'General',
                'isPremium' => (bool) ($module?->level?->is_premium),
                'status' => $accessStatus['allowed'] ? 'available' : 'locked',
                'lockReason' => $accessStatus['reason'],
                'isCompleted' => $module ? in_array($module->id, $completedModuleIds, true) : false,
            ];
        });
    }

    public static function normalizeFocus(?string $focus): ?string
    {
        return match ($focus) {
            'kanji' => 'kanji',
            'kosakata', 'kotoba' => 'kosakata',
            default => null,
        };
    }

    public static function filterQuestionsByFocus(Collection $questions, ?string $focus, bool $strict = false): Collection
    {
        $normalizedFocus = self::normalizeFocus($focus);
        if ($normalizedFocus === null || $questions->isEmpty()) {
            return $strict ? collect() : $questions->values();
        }

        $vocabIdsToResolve = $questions
            ->filter(fn ($q) => empty($q->content_type) && $q->source_type === 'vocabulary' && $q->source_id)
            ->pluck('source_id')
            ->unique()
            ->values();

        $vocabTypesById = $vocabIdsToResolve->isNotEmpty()
            ? Kosakata::query()->whereIn('id', $vocabIdsToResolve)->pluck('content_type', 'id')
            : collect();

        $filtered = $questions->filter(function ($q) use ($normalizedFocus, $vocabTypesById) {
            $type = $q->content_type;
            if (! $type && $q->source_type === 'vocabulary' && $q->source_id) {
                $type = $vocabTypesById->get($q->source_id);
            }

            if ($normalizedFocus === 'kanji') {
                return $type === 'kanji';
            }

            return $type !== null && $type !== 'kanji';
        })->values();

        if ($strict) {
            return $filtered;
        }

        return $filtered->isNotEmpty() ? $filtered : $questions->values();
    }

    public function quizPayload(Pengguna $user, Kuis $quiz, ?string $focus = null, bool $skipFlashcards = false): array
    {
        $normalizedFocus = self::normalizeFocus($focus);
        $module = $quiz->module;
        $questions = $quiz->questions
            ->where('type', '!=', 'handwriting')
            ->values();

        if ($normalizedFocus !== null && $questions->isNotEmpty()) {
            $questions = self::filterQuestionsByFocus($questions, $normalizedFocus, false);
        }

        if ($quiz->shuffle_questions) {
            $questions = $questions->shuffle()->values();
        }

        $questionReviews = ReviewSoal::where('user_id', $user->id)
            ->whereIn('question_id', $questions->pluck('id'))
            ->get()
            ->keyBy('question_id');

        $attemptsUsed = PengerjaanKuis::query()
            ->where('user_id', $user->id)
            ->where('quiz_id', $quiz->id)
            ->when(
                $normalizedFocus !== null,
                fn ($q) => $q->where('focus', $normalizedFocus),
                fn ($q) => $q->whereNull('focus')
            )
            ->where('status', 'completed')
            ->count();
        $maxAttempts = $quiz->max_attempts ? (int) $quiz->max_attempts : null;
        $attemptsRemaining = $maxAttempts !== null ? max(0, $maxAttempts - $attemptsUsed) : null;
        $shouldShuffleOptions = (bool) ($quiz->shuffle_options ?? false);

        return [
            'quiz' => [
                'id' => $quiz->id,
                'title' => $this->quizTitle($quiz),
                'description' => $quiz->description ?? 'Kuis evaluasi materi.',
                'type' => $quiz->type,
                'focus' => $normalizedFocus,
                'time_limit' => $quiz->time_limit,
                'passing_score' => $quiz->passing_score ?? 70,
                'shuffle_questions' => (bool) ($quiz->shuffle_questions ?? false),
                'shuffle_options' => $shouldShuffleOptions,
                'max_attempts' => $maxAttempts,
                'attempts_used' => $attemptsUsed,
                'attempts_remaining' => $attemptsRemaining,
                'explanation_display' => $quiz->explanation_display ?: 'after_answer',
                'handwriting_enabled' => $quiz->day?->handwriting_enabled ?? true,
                'handwriting_mode' => $quiz->day?->handwriting_mode ?: 'guided_then_blank',
                'available_at' => $quiz->available_at?->toISOString(),
                'lesson' => [
                    'id' => $module?->id,
                    'title' => $module?->title ?? 'Modul Mingguan',
                ],
                'module' => [
                    'id' => $module?->id,
                    'title' => $module?->title,
                    'week_number' => $module?->week_number,
                ],
            ],
            'questions' => $questions->map(function ($question) use ($questionReviews, $shouldShuffleOptions) {
                $review = $questionReviews->get($question->id);
                $options = $question->options;
                $optionReadings = $question->option_readings;

                if (
                    $shouldShuffleOptions
                    && ($question->type === 'multiple_choice' || $question->type === null)
                    && is_array($options)
                    && count($options) > 1
                ) {
                    $indices = range(0, count($options) - 1);
                    shuffle($indices);
                    $options = array_values(array_map(fn ($i) => $options[$i], $indices));
                    if (is_array($optionReadings)) {
                        $optionReadings = array_values(array_map(fn ($i) => $optionReadings[$i] ?? null, $indices));
                    }
                }

                return [
                    'id' => $question->id,
                    'question' => $question->question_text,
                    'highlight_text' => $question->highlight_text,
                    'question_reading' => $question->questionReadingForStudent(),
                    'question_tts_reading' => $question->question_reading,
                    'kanji' => '',
                    'type' => $question->type,
                    'stage' => $question->stage,
                    'disable_question_narration' => $question->shouldDisableQuestionNarration(),
                    'options' => $options,
                    'option_readings' => $optionReadings,
                    'audio_url' => $question->audio_url,
                    'points' => max(1, (int) ($question->points ?? 1)),
                    'review_status' => $review?->status ?? 'new',
                    'mastery_level' => $review?->mastery_level ?? 0,
                    'correct_streak' => $review?->correct_streak ?? 0,
                    'review_count' => $review?->review_count ?? 0,
                    'next_review_at' => $review?->next_review_at?->toISOString(),
                    'review_due' => $review?->next_review_at ? $review->next_review_at->isPast() : false,
                ];
            }),
            'total_points' => (int) $questions->sum(
                fn ($question) => max(1, (int) ($question->points ?? 1))
            ),
            'flashcards' => $skipFlashcards ? collect() : $this->quizFlashcards($user, $quiz, $normalizedFocus),
        ];
    }

    public function hasCompletedModule(Pengguna $user, ?int $moduleId): bool
    {
        if (! $moduleId) {
            return true;
        }

        return $user->progress()
            ->where('module_id', $moduleId)
            ->whereNotNull('completed_at')
            ->exists();
    }

    private function completedModuleIds(Pengguna $user): array
    {
        return $user->progress()
            ->whereNotNull('completed_at')
            ->pluck('module_id')
            ->all();
    }

    private function quizTitle(Kuis $quiz): string
    {
        $moduleTitle = $quiz->module?->title;
        $type = str($quiz->type)->replace('_', ' ')->title();

        return $moduleTitle ? "Kuis {$moduleTitle} ({$type})" : "Kuis {$type}";
    }

    private function durationEstimate(?int $timeLimit): string
    {
        if (! $timeLimit) {
            return '10 Menit';
        }

        return max(1, (int) ceil($timeLimit / 60)).' Menit';
    }

    private function quizFlashcards(Pengguna $user, Kuis $quiz, ?string $focus = null): Collection
    {
        $moduleId = $quiz->module_id;
        $moduleDayId = $quiz->module_day_id;
        $levelId = $quiz->module?->level_id;

        $sets = SetFlashcard::with('flashcards.vocabulary')
            ->where('status', 'published')
            ->whereHas('flashcards')
            ->where(function ($query) use ($moduleId, $moduleDayId, $levelId) {
                if ($moduleDayId) {
                    $query->where('module_day_id', $moduleDayId);

                    return;
                }

                if ($moduleId) {
                    $query->where('module_id', $moduleId);
                }

                if ($levelId) {
                    $moduleId ? $query->orWhere('level_id', $levelId) : $query->where('level_id', $levelId);
                }
            })
            ->get()
            ->sortBy(function (SetFlashcard $set) use ($moduleId, $levelId) {
                return match (true) {
                    $moduleId && $set->module_id === $moduleId => 1,
                    $levelId && $set->level_id === $levelId => 2,
                    default => 3,
                };
            });

        $cards = $sets
            ->flatMap(fn (SetFlashcard $set) => $set->flashcards)
            ->unique('id')
            ->values();

        if ($focus !== null && $cards->isNotEmpty()) {
            $focusedCards = $cards
                ->filter(fn ($card) => $card->vocabulary?->content_type === $focus)
                ->values();

            if ($focusedCards->isNotEmpty()) {
                $cards = $focusedCards;
            }
        }
        $reviews = ReviewFlashcard::query()
            ->where('user_id', $user->id)
            ->where('skill', 'recognition')
            ->whereIn('flashcard_id', $cards->pluck('id'))
            ->get()
            ->keyBy('flashcard_id');

        return $cards
            ->groupBy(function ($card) use ($reviews) {
                $review = $reviews->get($card->id);

                return match (true) {
                    $review?->next_review_at?->isPast() => 0,
                    $review?->status === 'learning' => 1,
                    $review === null || $review->status === 'new' => 2,
                    $review?->status === 'review' => 3,
                    default => 4,
                };
            })
            ->sortKeys()
            ->flatMap(fn (Collection $group) => $group->shuffle())
            ->take(5)
            ->map(function ($card) use ($reviews) {
                $review = $reviews->get($card->id);
                $vocabulary = $card->vocabulary;
                $metadata = is_array($vocabulary?->metadata) ? $vocabulary->metadata : [];

                return [
                    'id' => $card->id,
                    'front_text' => $card->front_text,
                    'reading' => $card->reading,
                    'back_text' => $card->back_text,
                    'hint' => $card->hint,
                    'example_sentence' => $card->example_sentence,
                    'example_reading' => $vocabulary?->example_reading,
                    'example_meaning' => $card->example_meaning,
                    'audio_url' => $card->audio_url,
                    'audio_reading_override' => $metadata['audio_reading_override'] ?? null,
                    'content_type' => $vocabulary?->content_type,
                    'meaning_en' => $vocabulary?->meaning_en,
                    'onyomi' => $metadata['onyomi'] ?? null,
                    'kunyomi' => $metadata['kunyomi'] ?? null,
                    'radicals' => array_values(array_filter((array) ($metadata['radicals'] ?? []))),
                    'stroke_count' => isset($metadata['stroke_count']) ? (int) $metadata['stroke_count'] : null,
                    'notes' => $metadata['notes'] ?? null,
                    'review_status' => $review?->status ?? 'new',
                    'mastery_level' => (int) ($review?->mastery_level ?? 0),
                    'next_review_at' => $review?->next_review_at?->toISOString(),
                    'review_due' => $review?->next_review_at?->isPast() ?? false,
                ];
            })
            ->values();
    }
}
