<?php

namespace App\Services;

use App\Models\Exam;
use App\Models\ExamAttempt;
use App\Models\ExamSession;
use App\Models\Pengguna;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

class ExamAccessService
{
    public function __construct(private readonly AksesPremiumService $premium) {}

    public function selectableExamsQuery(Pengguna $admin, int $programId): Builder
    {
        return Exam::query()->where('status', 'published')->whereHas('publishedVersion')
            ->where(function (Builder $query) use ($admin, $programId) {
                $query->whereIn('access_type', ['all', 'premium'])
                    ->orWhere(fn (Builder $query) => $query->where('access_type', 'cohort')
                        ->whereHas('publishedVersion.sessions', fn (Builder $sessions) => $sessions
                            ->whereIn('status', ['active', 'scheduled'])
                            ->whereHas('cohorts', fn (Builder $cohorts) => $cohorts
                                ->where('program_pembelajaran_id', $programId)
                                ->where('status', 'active')
                                ->when($admin->isMentor(), fn (Builder $q) => $q->where('admin_id', $admin->id)))));
            });
    }

    public function viewableExamMap(Pengguna $user, Collection $exams): array
    {
        $exams = $exams->filter(fn ($exam) => $exam instanceof Exam)->unique('id');
        if ($exams->isEmpty()) {
            return [];
        }

        $isPremium = $exams->contains(fn (Exam $exam) => $exam->status === 'published' && $exam->access_type === 'premium')
            ? $this->premium->isPremium($user) : false;
        $cohortIds = $exams->where('status', 'published')->where('access_type', 'cohort')->pluck('id');
        $allowedCohortIds = $cohortIds->isEmpty() ? [] : Exam::query()
            ->whereIn('id', $cohortIds)
            ->whereHas('versions', fn (Builder $query) => $query->where('status', 'published')
                ->whereHas('sessions.cohorts.anggota', fn (Builder $members) => $members
                    ->where('user_id', $user->id)->where('status', 'active')))
            ->pluck('id')->flip()->all();

        return $exams->mapWithKeys(fn (Exam $exam) => [$exam->id => $exam->status === 'published' && match ($exam->access_type) {
            'all' => true,
            'premium' => $isPremium,
            'cohort' => isset($allowedCohortIds[$exam->id]),
            default => false,
        }])->all();
    }

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
        if ($exam->status !== 'published') {
            return false;
        }
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
        return $this->sessionResultsReleased($attempt->session);
    }

    public function sessionResultsReleased(ExamSession $session): bool
    {
        $session->loadMissing('version.exam');
        $policy = $session->version->result_release_policy;

        return $policy === 'immediate'
            || $session->version->exam->type === 'practice'
            || ($policy === 'after_session' && $session->ends_at?->isPast())
            || (bool) $session->result_released_at?->isPast();
    }

    public function canViewSession(Pengguna $user, ExamSession $session): bool
    {
        $session->loadMissing('version.exam');
        $exam = $session->version->exam;
        if (! $this->canViewExam($user, $exam)) {
            return false;
        }

        return $exam->access_type !== 'cohort' || $session->cohorts()->whereHas('anggota', fn ($query) => $query
            ->where('user_id', $user->id)->where('status', 'active'))->exists();
    }
}
