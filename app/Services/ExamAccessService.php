<?php

namespace App\Services;

use App\Models\Exam;
use App\Models\ExamAttempt;
use App\Models\ExamSession;
use App\Models\Pengguna;

class ExamAccessService
{
    public function __construct(private readonly AksesPremiumService $premium) {}

    public function canViewExam(Pengguna $user, Exam $exam): bool
    {
        if ($exam->status !== 'published') {
            return false;
        }

        if ($exam->access_type === 'all') {
            return true;
        }

        if ($exam->access_type === 'premium') {
            return $this->premium->isPremium($user);
        }

        return $exam->versions()
            ->where('status', 'published')
            ->whereHas('sessions.cohorts.anggota', fn ($query) => $query
                ->where('user_id', $user->id)
                ->where('status', 'active'))
            ->exists();
    }

    public function canStart(Pengguna $user, ExamSession $session): bool
    {
        $session->loadMissing('version.exam', 'cohorts.anggota');
        $now = now();

        if ($session->status !== 'active'
            || ($session->starts_at && $now->lt($session->starts_at))
            || ($session->ends_at && $now->gte($session->ends_at))
            || $session->version->status !== 'published') {
            return false;
        }

        $exam = $session->version->exam;
        if ($exam->access_type === 'all') {
            return true;
        }

        if ($exam->access_type === 'premium') {
            return $this->premium->isPremium($user);
        }

        return $session->cohorts->contains(fn ($cohort) => $cohort->anggota
            ->contains(fn ($member) => (int) $member->user_id === (int) $user->id && $member->status === 'active'));
    }

    public function resultReleased(ExamAttempt $attempt): bool
    {
        $attempt->loadMissing('session', 'version.exam');
        $policy = $attempt->version->result_release_policy;

        return $policy === 'immediate'
            || $attempt->version->exam->type === 'practice'
            || ($policy === 'after_session' && $attempt->session->ends_at?->isPast())
            || $attempt->session->result_released_at?->isPast();
    }
}
