<?php

namespace App\Services;

use App\Models\ExamAttempt;
use App\Models\PengerjaanKuis;
use App\Models\Pengguna;
use App\Models\PesertaKelasLive;
use App\Models\ProgresHariModul;
use Illuminate\Validation\ValidationException;

class ContextualFeedbackService
{
    public const REASONS = [
        'quiz' => ['clear_questions', 'unclear_explanation', 'too_difficult', 'too_easy', 'technical_issue'],
        'exam' => ['clear_instructions', 'clear_results', 'confusing_time', 'difficult_navigation', 'technical_issue'],
        'lesson_day' => ['easy_to_understand', 'too_dense', 'needs_examples', 'unclear_media', 'technical_issue'],
        'live_class' => ['easy_to_understand', 'too_dense', 'needs_examples', 'unclear_media', 'technical_issue'],
    ];

    public function resolve(Pengguna $user, string $feature, int $contextId): array
    {
        return match ($feature) {
            'quiz' => $this->quiz($user, $contextId),
            'exam' => $this->exam($user, $contextId),
            'lesson_day' => $this->lessonDay($user, $contextId),
            'live_class' => $this->liveClass($user, $contextId),
            default => throw ValidationException::withMessages(['feature' => 'Fitur feedback tidak dikenal.']),
        };
    }

    private function quiz(Pengguna $user, int $attemptId): array
    {
        $attempt = PengerjaanKuis::query()
            ->whereKey($attemptId)
            ->where('user_id', $user->id)
            ->where('status', 'completed')
            ->whereNotNull('completed_at')
            ->first();

        return $this->resolvedOrFail($attempt, 'quiz_attempt', $attemptId, 'quiz_completed');
    }

    private function exam(Pengguna $user, int $attemptId): array
    {
        $attempt = ExamAttempt::query()
            ->whereKey($attemptId)
            ->where('user_id', $user->id)
            ->whereIn('status', ['submitted', 'timed_out'])
            ->whereNotNull('submitted_at')
            ->first();

        return $this->resolvedOrFail($attempt, 'exam_attempt', $attemptId, 'exam_completed');
    }

    private function lessonDay(Pengguna $user, int $dayId): array
    {
        $progress = ProgresHariModul::query()
            ->where('module_day_id', $dayId)
            ->where('user_id', $user->id)
            ->whereNotNull('completed_at')
            ->first();

        return $this->resolvedOrFail($progress, 'day_completion', $dayId, 'lesson_completed');
    }

    private function liveClass(Pengguna $user, int $sessionId): array
    {
        $participant = PesertaKelasLive::query()
            ->where('live_class_session_id', $sessionId)
            ->where('user_id', $user->id)
            ->where('role', 'student')
            ->whereHas('session', fn ($query) => $query
                ->where('status', 'ended')
                ->whereNotNull('ended_at'))
            ->first();

        return $this->resolvedOrFail($participant, 'live_session', $sessionId, 'class_session_completed');
    }

    private function resolvedOrFail(mixed $record, string $type, int $id, string $trigger): array
    {
        if (! $record) {
            throw ValidationException::withMessages([
                'context_id' => 'Aktivitas belum selesai atau bukan milik akun ini.',
            ]);
        }

        return [
            'context_type' => $type,
            'context_id' => $id,
            'context_key' => $type.':'.$id,
            'trigger' => $trigger,
        ];
    }
}
