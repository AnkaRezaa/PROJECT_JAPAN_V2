<?php

namespace App\Services;

use App\Models\EventReview;
use App\Models\Flashcard;
use App\Models\Pengguna;
use App\Models\ReviewFlashcard;
use App\Models\ReviewSoal;
use App\Models\SesiReview;
use App\Models\Soal;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class SesiReviewService
{
    private const SESSION_MINUTES = 30;

    private const MAX_ATTEMPTS_PER_ITEM = 2;

    public function __construct(
        private readonly AntreanReviewService $queue,
        private readonly AksesKuisPenggunaService $aksesKuis,
        private readonly AksesPremiumService $aksesPremium,
        private readonly AksesFlashcardPenggunaService $aksesFlashcard,
        private readonly PenilaianJawabanKuisService $penilaian,
        private readonly RepetisiPembelajaranService $repetisi
    ) {}

    public function start(Pengguna $user, bool $forceNew = false): ?array
    {
        if (! $forceNew && $active = $this->active($user)) {
            return $active;
        }

        $this->forgetActive($user);
        $selected = $this->queue->selected($user);

        if ($selected->isEmpty()) {
            return null;
        }

        $uuid = (string) Str::uuid();
        $session = SesiReview::create([
            'uuid' => $uuid,
            'user_id' => $user->id,
            'mode' => 'review',
            'target_count' => $selected->count(),
            'started_at' => now(),
            'expires_at' => now()->addMinutes(self::SESSION_MINUTES),
        ]);
        $items = $selected->keyBy('key')->map(fn (array $item) => $item + [
            'attempts' => 0,
            'resolved' => false,
        ])->all();
        $state = [
            'id' => $uuid,
            'record_id' => $session->id,
            'user_id' => $user->id,
            'created_at' => now()->toIso8601String(),
            'expires_at' => now()->addMinutes(self::SESSION_MINUTES)->toIso8601String(),
            'target_count' => $selected->count(),
            'resolved_count' => 0,
            'correct_count' => 0,
            'wrong_count' => 0,
            'skipped_count' => 0,
            'queue' => $selected->pluck('key')->values()->all(),
            'items' => $items,
            'current_token' => (string) Str::uuid(),
            'completed' => false,
            'undo' => null,
        ];

        $this->store($state);

        return $state;
    }

    public function active(Pengguna $user): ?array
    {
        $id = Cache::get($this->activeKey($user->id));
        $state = is_string($id) ? $this->find($user, $id) : null;

        if ($state && ($state['completed'] ?? false)) {
            Cache::forget($this->activeKey($user->id));

            return null;
        }

        return $state;
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
            'correct_count' => $state['correct_count'],
            'wrong_count' => $state['wrong_count'],
            'skipped_count' => $state['skipped_count'],
            'completed' => $state['completed'],
            'expires_at' => $state['expires_at'],
            'current_token' => $state['current_token'],
            'can_undo' => is_array($state['undo'] ?? null),
            'current_item' => $this->currentItemPayload($user, $state),
        ];
    }

    public function answer(Pengguna $user, string $id, array $answer): array
    {
        return $this->withLock($id, function () use ($user, $id, $answer) {
            $state = $this->validatedState($user, $id, $answer['item_token']);
            $key = (string) ($state['queue'][0] ?? '');
            $item = $state['items'][$key] ?? null;
            abort_unless(is_array($item), 404, 'Materi Review tidak lagi tersedia.');

            $source = $this->sourceForUser($user, $item);
            abort_unless($source, 404, 'Materi Review tidak lagi tersedia.');
            $isCorrect = $this->isCorrect($item, $source, $answer);
            $beforeState = $state;
            $isFirstAttempt = (int) $item['attempts'] === 0;
            $reviewSnapshot = null;
            $event = null;

            DB::transaction(function () use ($user, $state, $item, $source, $answer, $isCorrect, $isFirstAttempt, &$reviewSnapshot, &$event) {
                if ($isFirstAttempt) {
                    $review = $this->reviewModel($user, $item, $source);
                    $reviewSnapshot = $this->repetisi->snapshot($review);
                    $this->recordMastery($user, $item, $source, $isCorrect);
                }

                $event = EventReview::create([
                    'session_id' => $state['record_id'],
                    'user_id' => $user->id,
                    'source_type' => $item['source_type'],
                    'source_id' => $item['source_id'],
                    'skill' => $item['skill'],
                    'result' => $isCorrect ? 'correct' : 'wrong',
                    'duration_ms' => data_get($answer, 'answer_payload.duration_ms'),
                    'previous_state' => $reviewSnapshot,
                    'occurred_at' => now(),
                ]);
            });
            abort_unless($event instanceof EventReview, 500, 'Hasil Review gagal disimpan.');

            $item['attempts']++;
            array_shift($state['queue']);
            $resolved = $isCorrect || $item['attempts'] >= self::MAX_ATTEMPTS_PER_ITEM;

            if ($resolved) {
                $item['resolved'] = true;
                $state['resolved_count']++;
            } else {
                $insertAt = min(2, count($state['queue']));
                array_splice($state['queue'], $insertAt, 0, [$key]);
            }

            $state[$isCorrect ? 'correct_count' : 'wrong_count']++;
            $state['items'][$key] = $item;
            $state['completed'] = $state['queue'] === [];
            $state['current_token'] = (string) Str::uuid();
            $state['expires_at'] = now()->addMinutes(self::SESSION_MINUTES)->toIso8601String();
            $state['undo'] = ['event_id' => $event->id, 'state' => $beforeState];
            $this->persistMetrics($state);
            $this->store($state);
            $this->queue->forgetSummary($user);

            return [
                'result' => $isCorrect ? 'correct' : 'wrong',
                'is_correct' => $isCorrect,
                'will_repeat' => ! $resolved,
                'correct_answer' => $this->correctAnswer($item, $source),
                'explanation' => $this->explanation($item, $source),
                'message' => $isCorrect
                    ? 'Benar. Jadwal penguatan materi sudah diperbarui.'
                    : ($resolved ? 'Materi ini diprioritaskan lagi pada sesi berikutnya.' : 'Belum tepat. Materi akan muncul sekali lagi di sesi ini.'),
                'session' => $this->payload($user, $state),
            ];
        });
    }

    public function skip(Pengguna $user, string $id, string $itemToken): array
    {
        return $this->withLock($id, function () use ($user, $id, $itemToken) {
            $state = $this->validatedState($user, $id, $itemToken);
            $beforeState = $state;
            $key = (string) array_shift($state['queue']);
            $item = $state['items'][$key] ?? null;
            abort_unless(is_array($item) && $this->sourceForUser($user, $item), 404, 'Materi Review tidak lagi tersedia.');

            $event = EventReview::create([
                'session_id' => $state['record_id'],
                'user_id' => $user->id,
                'source_type' => $item['source_type'],
                'source_id' => $item['source_id'],
                'skill' => $item['skill'],
                'result' => 'skipped',
                'occurred_at' => now(),
            ]);

            $item['resolved'] = true;
            $state['items'][$key] = $item;
            $state['resolved_count']++;
            $state['skipped_count']++;
            $state['completed'] = $state['queue'] === [];
            $state['current_token'] = (string) Str::uuid();
            $state['undo'] = ['event_id' => $event->id, 'state' => $beforeState];
            $this->persistMetrics($state);
            $this->store($state);

            return ['result' => 'skipped', 'session' => $this->payload($user, $state)];
        });
    }

    public function undo(Pengguna $user, string $id): array
    {
        return $this->withLock($id, function () use ($user, $id) {
            $state = $this->find($user, $id);
            abort_unless($state && is_array($state['undo'] ?? null), 422, 'Tidak ada jawaban yang dapat dibatalkan.');
            $undo = $state['undo'];
            $event = EventReview::query()
                ->whereKey($undo['event_id'])
                ->where('session_id', $state['record_id'])
                ->where('user_id', $user->id)
                ->whereNull('undone_at')
                ->firstOrFail();

            DB::transaction(function () use ($user, $event) {
                if (is_array($event->previous_state)) {
                    $item = [
                        'source_type' => $event->source_type,
                        'source_id' => $event->source_id,
                        'skill' => $event->skill,
                    ];
                    $source = $this->sourceForUser($user, $item);
                    abort_unless($source, 404, 'Materi Review tidak lagi tersedia.');
                    $review = $this->reviewModel($user, $item, $source);
                    $this->repetisi->pulihkan($review, $event->previous_state);
                }

                $event->update(['undone_at' => now()]);
            });

            $state = $undo['state'];
            $state['undo'] = null;
            $state['current_token'] = (string) Str::uuid();
            $this->persistMetrics($state);
            $this->store($state);
            $this->queue->forgetSummary($user);

            return ['session' => $this->payload($user, $state)];
        });
    }

    private function validatedState(Pengguna $user, string $id, string $itemToken): array
    {
        $state = $this->find($user, $id);
        abort_unless($state, 404, 'Sesi Review sudah berakhir.');
        abort_if($state['completed'], 422, 'Sesi Review sudah selesai.');
        abort_unless(hash_equals((string) $state['current_token'], $itemToken), 409, 'Materi ini sudah diproses.');

        return $state;
    }

    private function sourceForUser(Pengguna $user, array $item): Soal|Flashcard|null
    {
        if ($item['source_type'] === 'question') {
            $question = Soal::query()
                ->with(['quiz.module.programPembelajaran:id,title,slug', 'quiz.day:id,module_id,day_number,title,status,checkpoint_quiz_id'])
                ->find($item['source_id']);
            $programId = $question?->quiz?->module?->program_pembelajaran_id;

            return $question?->quiz
                && $question->quiz->status === 'published'
                && ! $question->quiz->isWeeklyExam()
                && $question->type !== 'handwriting'
                && ! (bool) data_get($question->options, 'practice_only', false)
                && $programId
                && $this->aksesPremium->punyaAksesKelas($user, $programId)
                && $this->aksesKuis->status($user, $question->quiz)['allowed']
                    ? $question
                    : null;
        }

        $flashcard = Flashcard::query()
            ->with(['set.module.programPembelajaran:id,title,slug', 'set.day:id,module_id,day_number,title,status,checkpoint_quiz_id', 'vocabulary'])
            ->find($item['source_id']);

        return $flashcard?->set && $this->aksesFlashcard->status($user, $flashcard->set)['allowed']
            ? $flashcard
            : null;
    }

    private function isCorrect(array $item, Soal|Flashcard $source, array $answer): bool
    {
        if ($source instanceof Soal) {
            return $this->penilaian->benar($source, $answer['answer'] ?? null, $answer['answer_payload'] ?? []);
        }

        if ($item['skill'] === 'writing') {
            return $this->penilaian->handwritingDikuasai($answer['answer_payload'] ?? []);
        }

        return ($answer['answer'] ?? null) === 'known';
    }

    private function reviewModel(Pengguna $user, array $item, Soal|Flashcard $source): ReviewSoal|ReviewFlashcard
    {
        return $source instanceof Soal
            ? ReviewSoal::firstOrNew(['user_id' => $user->id, 'question_id' => $source->id])
            : ReviewFlashcard::firstOrNew([
                'user_id' => $user->id,
                'flashcard_id' => $source->id,
                'skill' => $item['skill'],
            ]);
    }

    private function recordMastery(Pengguna $user, array $item, Soal|Flashcard $source, bool $isCorrect): void
    {
        if ($source instanceof Soal) {
            $this->repetisi->catatJawabanSoal($user, $source, $isCorrect, $source->quiz);

            return;
        }

        $this->repetisi->catatReviewFlashcard($user, $source, $isCorrect, $item['skill']);
    }

    private function currentItemPayload(Pengguna $user, array $state): ?array
    {
        if ($state['completed'] || empty($state['queue'])) {
            return null;
        }

        $item = $state['items'][$state['queue'][0]] ?? null;
        if (! is_array($item) || ! $source = $this->sourceForUser($user, $item)) {
            return null;
        }

        $base = [
            'key' => $item['key'],
            'source_type' => $item['source_type'],
            'skill' => $item['skill'],
            'state' => $item['bucket'],
            'state_label' => $this->stateLabel($item['bucket']),
            'attempt_number' => (int) $item['attempts'] + 1,
        ];

        if ($source instanceof Soal) {
            return $base + [
                'id' => $source->id,
                'kind' => 'question',
                'question' => $source->question_text,
                'question_reading' => $source->question_reading,
                'type' => $source->type,
                'options' => $source->options,
                'option_readings' => $source->option_readings,
                'audio_url' => $source->audio_url,
                'definition' => $source->explanation,
                'source' => $this->sourceLabel($source->quiz?->module, $source->quiz?->day),
            ];
        }

        preg_match('/\p{Han}/u', (string) $source->front_text, $character);
        $vocabulary = $source->vocabulary;
        $metadata = (array) ($vocabulary?->metadata ?? []);

        return $base + [
            'id' => $source->id,
            'kind' => $item['skill'] === 'writing' ? 'writing' : 'flashcard',
            'front_text' => $source->front_text,
            'reading' => $source->reading,
            'meaning' => $source->back_text,
            'hint' => $source->hint,
            'example_sentence' => $source->example_sentence,
            'example_meaning' => $source->example_meaning,
            'audio_url' => $source->audio_url,
            'character' => $character[0] ?? $source->front_text,
            'definition' => $source->back_text,
            'content_type' => $vocabulary?->content_type,
            'onyomi' => $metadata['onyomi'] ?? null,
            'kunyomi' => $metadata['kunyomi'] ?? null,
            'radicals' => array_values(array_filter((array) ($metadata['radicals'] ?? []))),
            'source' => $this->sourceLabel($source->set?->module, $source->set?->day),
        ];
    }

    private function sourceLabel($module, $day): array
    {
        return [
            'program' => $module?->programPembelajaran?->title,
            'week' => $module?->week_number,
            'day' => $day?->day_number,
            'day_title' => $day?->title,
        ];
    }

    private function correctAnswer(array $item, Soal|Flashcard $source): ?string
    {
        if ($source instanceof Soal) {
            return $source->correct_answer;
        }

        return $item['skill'] === 'writing' ? $source->front_text : $source->back_text;
    }

    private function explanation(array $item, Soal|Flashcard $source): ?string
    {
        return $source instanceof Soal ? $source->explanation : $source->example_meaning;
    }

    private function stateLabel(string $state): string
    {
        return match ($state) {
            'wrong' => 'Perlu diperbaiki',
            'due' => 'Waktunya diulang',
            'learning' => 'Sedang dipelajari',
            'new' => 'Baru',
            default => 'Perlu diulang',
        };
    }

    private function persistMetrics(array $state): void
    {
        SesiReview::query()->whereKey($state['record_id'])->update([
            'correct_count' => $state['correct_count'],
            'wrong_count' => $state['wrong_count'],
            'skipped_count' => $state['skipped_count'],
            'completed_at' => $state['completed'] ? now() : null,
            'expires_at' => now()->addMinutes(self::SESSION_MINUTES),
        ]);
    }

    private function withLock(string $id, callable $callback): mixed
    {
        return Cache::lock($this->sessionKey($id).':lock', 10)->block(3, $callback);
    }

    private function store(array $state): void
    {
        $expiresAt = now()->addMinutes(self::SESSION_MINUTES);
        Cache::put($this->sessionKey($state['id']), $state, $expiresAt);

        if ($state['completed'] ?? false) {
            Cache::forget($this->activeKey((int) $state['user_id']));
        } else {
            Cache::put($this->activeKey((int) $state['user_id']), $state['id'], $expiresAt);
        }
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
        return "review:active:{$userId}";
    }

    private function sessionKey(string $id): string
    {
        return "review:session:{$id}";
    }
}
