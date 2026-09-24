<?php

namespace App\Services;

use App\Models\Kuis;
use App\Models\Pengguna;
use App\Models\ReviewSoal;
use App\Models\Soal;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class QuickQuizSessionService
{
    private const SESSION_MINUTES = 30;

    private const MAX_TARGETS = 10;

    private const MAX_ATTEMPTS_PER_TARGET = 2;

    public function __construct(
        private readonly AksesKuisPenggunaService $aksesKuis,
        private readonly AksesPremiumService $aksesPremium,
        private readonly PenilaianJawabanKuisService $penilaian,
        private readonly RepetisiPembelajaranService $repetisi
    ) {}

    public function summary(Pengguna $user): array
    {
        $active = $this->active($user);

        if ($active) {
            return [
                'available' => true,
                'active' => true,
                'target_count' => $active['target_count'],
                'remaining_count' => max(0, $active['target_count'] - $active['resolved_count']),
                'program_count' => count($active['program_ids']),
                'selected_program_id' => $active['selected_program_id'] ?? null,
                'programs' => [],
                'start_url' => route('user.quick-quiz.start'),
                'resume_url' => route('user.quick-quiz.show', $active['id']),
            ];
        }

        $candidates = $this->candidates($user);
        $programs = $candidates
            ->filter(fn (array $candidate) => $candidate['program_id'])
            ->groupBy('program_id')
            ->map(fn (Collection $items) => [
                'id' => (int) $items->first()['program_id'],
                'title' => $items->first()['program_title'],
                'question_count' => $items->count(),
            ])
            ->sortBy('title')
            ->values();

        return [
            'available' => $candidates->isNotEmpty(),
            'active' => false,
            'target_count' => min(self::MAX_TARGETS, $candidates->count()),
            'remaining_count' => min(self::MAX_TARGETS, $candidates->count()),
            'program_count' => $candidates->pluck('program_id')->filter()->unique()->count(),
            'due_count' => $candidates->where('priority', 0)->count(),
            'selected_program_id' => null,
            'programs' => $programs,
            'start_url' => route('user.quick-quiz.start'),
            'resume_url' => null,
        ];
    }

    public function start(Pengguna $user, bool $forceNew = false, ?int $programId = null): ?array
    {
        if (! $forceNew && $active = $this->active($user)) {
            return $active;
        }

        $this->forgetActive($user);
        $selected = $this->selectTargets($this->candidates($user, $programId));

        if ($selected->isEmpty()) {
            return null;
        }

        $id = (string) Str::uuid();
        $queue = $selected->pluck('question_id')->values()->all();
        $state = [
            'id' => $id,
            'user_id' => $user->id,
            'created_at' => now()->toIso8601String(),
            'expires_at' => now()->addMinutes(self::SESSION_MINUTES)->toIso8601String(),
            'target_count' => count($queue),
            'resolved_count' => 0,
            'mastered_count' => 0,
            'review_count' => 0,
            'program_ids' => $selected->pluck('program_id')->filter()->unique()->values()->all(),
            'selected_program_id' => $programId,
            'queue' => $queue,
            'items' => $selected->keyBy('question_id')->map(fn (array $item) => [
                'attempts' => 0,
                'resolved' => false,
                'first_result' => null,
            ])->all(),
            'current_token' => (string) Str::uuid(),
            'completed' => false,
        ];

        $this->store($state);

        return $state;
    }

    public function active(Pengguna $user): ?array
    {
        $id = Cache::get($this->activeKey($user->id));

        return is_string($id) ? $this->find($user, $id) : null;
    }

    public function find(Pengguna $user, string $id): ?array
    {
        $state = Cache::get($this->sessionKey($id));

        return is_array($state) && (int) ($state['user_id'] ?? 0) === (int) $user->id
            ? $state
            : null;
    }

    public function payload(Pengguna $user, array $state): array
    {
        return [
            'id' => $state['id'],
            'target_count' => $state['target_count'],
            'resolved_count' => $state['resolved_count'],
            'mastered_count' => $state['mastered_count'],
            'review_count' => $state['review_count'],
            'completed' => $state['completed'],
            'expires_at' => $state['expires_at'],
            'current_token' => $state['current_token'],
            'current_question' => $this->currentQuestionPayload($user, $state),
        ];
    }

    public function answer(Pengguna $user, string $id, array $answer): array
    {
        $lock = Cache::lock($this->sessionKey($id).':lock', 10);

        return $lock->block(3, function () use ($user, $id, $answer) {
            $state = $this->find($user, $id);
            abort_unless($state, 404, 'Sesi Quick Kuis sudah berakhir.');
            abort_if($state['completed'], 422, 'Sesi Quick Kuis sudah selesai.');
            abort_unless(hash_equals((string) $state['current_token'], (string) $answer['item_token']), 409, 'Soal ini sudah diproses.');

            $questionId = (int) ($state['queue'][0] ?? 0);
            $question = $this->questionForUser($user, $questionId);
            $item = $state['items'][$questionId] ?? null;
            abort_unless($question && is_array($item), 404, 'Soal tidak lagi tersedia.');

            $isCorrect = $this->penilaian->benar(
                $question,
                $answer['answer'] ?? null,
                $answer['answer_payload'] ?? []
            );
            $isFirstAttempt = (int) $item['attempts'] === 0;
            $item['attempts']++;
            $item['first_result'] ??= $isCorrect ? 'correct' : 'wrong';

            if ($isFirstAttempt) {
                $this->repetisi->catatJawabanSoal($user, $question, $isCorrect, $question->quiz);
            }

            array_shift($state['queue']);
            $resolved = $isCorrect || $item['attempts'] >= self::MAX_ATTEMPTS_PER_TARGET;

            if ($resolved) {
                $item['resolved'] = true;
                $state['resolved_count']++;
                $isCorrect ? $state['mastered_count']++ : $state['review_count']++;
            } else {
                $insertAt = min(2, count($state['queue']));
                array_splice($state['queue'], $insertAt, 0, [$questionId]);
            }

            $state['items'][$questionId] = $item;
            $state['completed'] = $state['queue'] === [];
            $state['current_token'] = (string) Str::uuid();
            $state['expires_at'] = now()->addMinutes(self::SESSION_MINUTES)->toIso8601String();
            $this->store($state);

            return [
                'is_correct' => $isCorrect,
                'will_repeat' => ! $resolved,
                'correct_answer' => $question->correct_answer,
                'explanation' => $question->explanation,
                'explanation_reading' => $question->explanation_reading,
                'message' => $isCorrect
                    ? 'Benar. Materi ini masuk jadwal review berikutnya.'
                    : ($resolved
                        ? 'Materi ini akan diprioritaskan pada latihan berikutnya.'
                        : 'Belum tepat. Soal ini akan muncul kembali setelah beberapa soal.'),
                'session' => $this->payload($user, $state),
            ];
        });
    }

    private function candidates(Pengguna $user, ?int $programId = null): Collection
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
            ->when($programId, fn ($query) => $query->whereHas(
                'module',
                fn ($moduleQuery) => $moduleQuery->where('program_pembelajaran_id', $programId)
            ))
            ->get()
            ->filter(fn (Kuis $quiz) => $quiz->module?->program_pembelajaran_id
                && $this->aksesPremium->punyaAksesKelas($user, $quiz->module->program_pembelajaran_id)
                && $this->aksesKuis->status($user, $quiz)['allowed']);

        $questions = $quizzes->flatMap(fn (Kuis $quiz) => $quiz->questions->map(fn (Soal $question) => [
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

            return [
                'question_id' => $question->id,
                'program_id' => $quiz->module?->program_pembelajaran_id,
                'program_title' => $quiz->module?->programPembelajaran?->title,
                'priority' => match (true) {
                    $review?->next_review_at?->isPast() => 0,
                    $review?->last_result === 'wrong' || $review?->status === 'learning' => 1,
                    $review === null => 2,
                    $review?->status === 'review' => 3,
                    default => 4,
                },
            ];
        })->unique('question_id')->values();
    }

    private function selectTargets(Collection $candidates): Collection
    {
        $selected = collect();

        foreach ($candidates->groupBy('priority')->sortKeys() as $priorityGroup) {
            $programGroups = $priorityGroup->shuffle()->groupBy('program_id')->map->shuffle();

            while ($programGroups->contains(fn (Collection $group) => $group->isNotEmpty())) {
                foreach ($programGroups as $programId => $group) {
                    if ($group->isEmpty()) {
                        continue;
                    }

                    $selected->push($group->shift());
                    $programGroups[$programId] = $group;

                    if ($selected->count() >= self::MAX_TARGETS) {
                        return $selected->values();
                    }
                }
            }
        }

        return $selected->values();
    }

    private function currentQuestionPayload(Pengguna $user, array $state): ?array
    {
        if ($state['completed'] || empty($state['queue'])) {
            return null;
        }

        $question = $this->questionForUser($user, (int) $state['queue'][0]);

        return $question ? [
            'id' => $question->id,
            'question' => $question->question_text,
            'question_reading' => $question->question_reading,
            'type' => $question->type,
            'options' => $question->options,
            'option_readings' => $question->option_readings,
            'audio_url' => $question->audio_url,
            'character' => $question->type === 'handwriting'
                ? (data_get($question->options, 'character')
                    ?? data_get($question->options, 'target_character')
                    ?? $question->correct_answer)
                : null,
            'points' => max(1, (int) ($question->points ?? 1)),
            'source' => [
                'program' => $question->quiz?->module?->programPembelajaran?->title,
                'week' => $question->quiz?->module?->week_number,
                'day' => $question->quiz?->day?->day_number,
                'day_title' => $question->quiz?->day?->title,
            ],
            'attempt_number' => (int) data_get($state, "items.{$question->id}.attempts", 0) + 1,
        ] : null;
    }

    private function questionForUser(Pengguna $user, int $questionId): ?Soal
    {
        $question = Soal::query()
            ->with(['quiz.module.programPembelajaran:id,title,slug', 'quiz.day:id,module_id,day_number,title,status,checkpoint_quiz_id'])
            ->find($questionId);

        if (! $question?->quiz || $question->quiz->status !== 'published') {
            return null;
        }

        $programId = $question->quiz->module?->program_pembelajaran_id;

        return $programId
            && $this->aksesPremium->punyaAksesKelas($user, $programId)
            && $this->aksesKuis->status($user, $question->quiz)['allowed']
                ? $question
                : null;
    }

    private function store(array $state): void
    {
        $expiresAt = now()->addMinutes(self::SESSION_MINUTES);

        Cache::put($this->sessionKey($state['id']), $state, $expiresAt);
        Cache::put($this->activeKey((int) $state['user_id']), $state['id'], $expiresAt);
    }

    private function forgetActive(Pengguna $user): void
    {
        $id = Cache::pull($this->activeKey($user->id));
        if (is_string($id)) {
            Cache::forget($this->sessionKey($id));
        }
    }

    private function activeKey(int $userId): string
    {
        return "quick-quiz:active:{$userId}";
    }

    private function sessionKey(string $id): string
    {
        return "quick-quiz:session:{$id}";
    }
}
