<?php

namespace App\Services;

use App\Models\ExamAttempt;
use App\Models\ExamAttemptAnswer;
use App\Models\ExamSession;
use App\Models\ExamVersionQuestion;
use App\Models\Pengguna;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ExamAttemptService
{
    public function __construct(
        private readonly ExamAccessService $access,
        private readonly PenilaianJawabanKuisService $evaluator,
        private readonly ExamAuditService $audit,
    ) {}

    public function start(Pengguna $user, ExamSession $session, array $data): ExamAttempt
    {
        return DB::transaction(function () use ($user, $session, $data) {
            $session = ExamSession::whereKey($session->id)->lockForUpdate()->with('version.exam', 'version.sections')->firstOrFail();
            $existing = ExamAttempt::where('submission_token', $data['submission_token'])->first();
            if ($existing) {
                abort_unless((int) $existing->user_id === (int) $user->id && (int) $existing->exam_session_id === (int) $session->id, 409);

                return $existing;
            }

            abort_unless($this->access->canStart($user, $session), 403);

            $mode = $data['mode'] ?? 'full';
            $sectionKey = $mode === 'section' ? ($data['section_key'] ?? null) : null;
            if ($session->version->exam->type === 'simulation' && $mode !== 'full') {
                throw ValidationException::withMessages(['mode' => 'Simulasi wajib dikerjakan secara penuh.']);
            }
            if ($session->version->exam->category === 'jft_basic' && $mode !== 'full') {
                throw ValidationException::withMessages(['mode' => 'JFT-Basic harus dikerjakan secara penuh.']);
            }

            $sections = $session->version->sections;
            if ($mode === 'section') {
                $sections = $sections->where('key', $sectionKey);
                if ($sections->isEmpty()) {
                    throw ValidationException::withMessages(['section_key' => 'Bagian ujian tidak ditemukan.']);
                }
            }

            $attemptCount = ExamAttempt::where('user_id', $user->id)->where('exam_session_id', $session->id)->count();
            $limit = $session->attempt_limit_override ?? $session->version->attempt_limit;
            if ($limit !== null && $attemptCount >= $limit) {
                throw ValidationException::withMessages(['attempt' => 'Batas pengerjaan untuk sesi ini telah tercapai.']);
            }

            $duration = ($session->version->exam->category ?? 'jlpt') === 'jft_basic'
                ? max(60, (int) ($session->version->total_time_limit_seconds ?? 3600))
                : max(60, (int) $sections->sum('time_limit_seconds'));
            $deadline = now()->addSeconds($duration);
            if ($session->ends_at && $deadline->gt($session->ends_at)) {
                $deadline = $session->ends_at->copy();
            }

            $attempt = ExamAttempt::create([
                'exam_session_id' => $session->id,
                'exam_version_id' => $session->exam_version_id,
                'user_id' => $user->id,
                'submission_token' => $data['submission_token'],
                'mode' => $mode,
                'selected_section_key' => $sectionKey,
                'attempt_number' => $attemptCount + 1,
                'status' => 'in_progress',
                'started_at' => now(),
                'deadline_at' => $deadline,
            ]);

            foreach ($sections as $section) {
                $attempt->sections()->create(['exam_section_id' => $section->id, 'started_at' => now()]);
            }

            return $attempt;
        });
    }

    public function state(ExamAttempt $attempt): array
    {
        $attempt->load(['version.exam.level', 'sections.section.questions', 'answers']);
        $answers = $attempt->answers->keyBy('exam_version_question_id');
        $isJft = $attempt->version->exam->category === 'jft_basic';
        $sections = $attempt->sections->sortBy(fn ($entry) => $entry->section->sort_order)->values();
        if ($isJft) {
            $sections = $sections->slice((int) $attempt->active_section_index, 1)->values();
        }
        $currentSection = $sections->first()?->section;

        return [
            'id' => $attempt->id,
            'status' => $attempt->status,
            'mode' => $attempt->mode,
            'server_revision' => $attempt->server_revision,
            'server_now' => now()->toIso8601String(),
            'deadline_at' => $attempt->deadline_at->toIso8601String(),
            'remaining_seconds' => max(0, (int) floor(now()->diffInSeconds($attempt->deadline_at, false))),
            'navigation' => $isJft ? [
                'section_index' => (int) $attempt->active_section_index,
                'question_index' => (int) $attempt->active_question_index,
                'section_count' => $attempt->sections->count(),
                'question_count' => $currentSection?->questions->count() ?? 0,
                'has_next' => ((int) $attempt->active_section_index + 1 < $attempt->sections->count())
                    || ($currentSection?->key === 'listening' && (int) $attempt->active_question_index + 1 < $currentSection->questions->count()),
            ] : null,
            'exam' => ['title' => $attempt->version->exam->title, 'level' => $attempt->version->exam->level?->level_name, 'type' => $attempt->version->exam->type, 'category' => $attempt->version->exam->category, 'ssw_field' => $attempt->version->exam->ssw_field],
            'sections' => $sections->map(fn ($attemptSection) => [
                'id' => $attemptSection->section->id,
                'key' => $attemptSection->section->key,
                'title' => $attemptSection->section->title,
                'time_limit_seconds' => $attemptSection->section->time_limit_seconds,
                'questions' => ($isJft && $attemptSection->section->key === 'listening' ? $attemptSection->section->questions->slice((int) $attempt->active_question_index, 1) : $attemptSection->section->questions)->map(fn ($question) => [
                    'id' => $question->id,
                    'code' => $question->code,
                    'type' => $question->type,
                    'question_text' => $question->question_text,
                    'question_reading' => $question->question_reading,
                    'options' => $question->options,
                    'option_readings' => $question->option_readings,
                    'audio_path' => $question->audio_path,
                    'answer' => ($saved = $answers->get($question->id)) ? [
                        'answer_text' => $saved->answer_text,
                        'answer_payload' => $saved->answer_payload,
                        'flagged' => $saved->flagged,
                    ] : null,
                ])->values(),
            ])->values(),
        ];
    }

    public function autosave(ExamAttempt $attempt, array $data): array
    {
        return DB::transaction(function () use ($attempt, $data) {
            $attempt = ExamAttempt::whereKey($attempt->id)->lockForUpdate()->firstOrFail();
            if (hash_equals((string) $attempt->last_autosave_token, (string) $data['autosave_token'])) {
                return $this->autosaveResponse($attempt);
            }
            $this->assertWritable($attempt);
            abort_if((int) $data['client_revision'] !== (int) $attempt->server_revision, 409, 'Jawaban berubah di sesi lain. Muat ulang state attempt sebelum menyimpan.');

            $allowedIds = ExamVersionQuestion::query()
                ->whereHas('section', fn ($query) => $query->whereIn('id', $attempt->sections()->pluck('exam_section_id')))
                ->pluck('id')->all();
            $allowed = array_flip($allowedIds);
            if ($attempt->loadMissing('version.exam')->version->exam->category === 'jft_basic') {
                $sections = $attempt->sections()->with('section.questions')->get()->sortBy(fn ($entry) => $entry->section->sort_order)->values();
                $active = $sections->get((int) $attempt->active_section_index);
                abort_unless($active, 409, 'Bagian ujian tidak ditemukan.');
                $questions = $active->section->questions;
                if ($active->section->key === 'listening') {
                    $questions = $questions->slice((int) $attempt->active_question_index, 1);
                }
                $allowed = array_flip($questions->pluck('id')->all());
            }
            $now = now();
            $rows = [];
            foreach ($data['answers'] as $answer) {
                if (! isset($allowed[$answer['question_id']])) {
                    throw ValidationException::withMessages(['answers' => 'Jawaban memuat soal yang bukan bagian attempt ini.']);
                }
                $rows[] = [
                    'exam_attempt_id' => $attempt->id,
                    'exam_version_question_id' => $answer['question_id'],
                    'answer_text' => $answer['answer_text'] ?? null,
                    'answer_payload' => isset($answer['answer_payload']) ? json_encode($answer['answer_payload']) : null,
                    'flagged' => (bool) ($answer['flagged'] ?? false),
                    'answered_at' => $now,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }
            ExamAttemptAnswer::upsert($rows, ['exam_attempt_id', 'exam_version_question_id'], ['answer_text', 'answer_payload', 'flagged', 'answered_at', 'updated_at']);
            $attempt->update([
                'server_revision' => $attempt->server_revision + 1,
                'last_autosave_token' => $data['autosave_token'],
            ]);

            return $this->autosaveResponse($attempt, $now);
        });
    }

    public function advanceJft(ExamAttempt $attempt, int $revision): array
    {
        return DB::transaction(function () use ($attempt, $revision) {
            $attempt = ExamAttempt::whereKey($attempt->id)->lockForUpdate()->firstOrFail();
            $this->assertWritable($attempt);
            abort_unless($attempt->loadMissing('version.exam')->version->exam->category === 'jft_basic', 409);
            abort_if($revision !== (int) $attempt->server_revision, 409, 'Posisi ujian berubah. Muat ulang sebelum melanjutkan.');
            $sections = $attempt->sections()->with('section.questions')->get()->sortBy(fn ($entry) => $entry->section->sort_order)->values();
            $section = $sections->get((int) $attempt->active_section_index);
            abort_unless($section, 409, 'Bagian ujian tidak ditemukan.');
            $questionIndex = (int) $attempt->active_question_index;
            if ($section->section->key === 'listening' && $questionIndex + 1 < $section->section->questions->count()) {
                $attempt->active_question_index = $questionIndex + 1;
            } else {
                abort_if((int) $attempt->active_section_index + 1 >= $sections->count(), 409, 'Bagian terakhir telah dicapai.');
                $attempt->active_section_index++;
                $attempt->active_question_index = 0;
            }
            $attempt->server_revision++;
            $attempt->save();
            return $this->state($attempt);
        });
    }

    public function submit(ExamAttempt $attempt, string $submittedBy = 'user'): ExamAttempt
    {
        return DB::transaction(function () use ($attempt, $submittedBy) {
            $attempt = ExamAttempt::whereKey($attempt->id)->lockForUpdate()->firstOrFail();
            if (in_array($attempt->status, ['submitted', 'timed_out'], true)) {
                return $attempt;
            }
            abort_if($attempt->status !== 'in_progress', 409, 'Attempt tidak dapat diselesaikan.');

            if ($attempt->deadline_at->isPast()) {
                $submittedBy = 'timeout';
            }

            $attempt->load(['version.exam', 'sections.section.questions', 'answers']);
            $answers = $attempt->answers->keyBy('exam_version_question_id');
            $totalRaw = 0;
            $totalEstimated = 0;
            $allSectionsPassed = true;
            $evaluatedAnswers = [];

            foreach ($attempt->sections as $attemptSection) {
                $correct = 0;
                $raw = 0;
                $answered = 0;
                foreach ($attemptSection->section->questions as $question) {
                    $answer = $answers->get($question->id);
                    if (! $answer) {
                        continue;
                    }
                    if (trim((string) $answer->answer_text) === '') {
                        $answer->forceFill(['is_correct' => false, 'earned_points' => 0]);
                        $evaluatedAnswers[] = [
                            'id' => $answer->id,
                            'exam_attempt_id' => $attempt->id,
                            'exam_version_question_id' => $question->id,
                            'is_correct' => false,
                            'earned_points' => 0,
                            'updated_at' => now(),
                        ];
                        continue;
                    }
                    $answered++;
                    $isCorrect = $question->type === 'sentence_builder'
                        ? $this->evaluator->jawabanSama((string) $answer->answer_text, $question->correct_answer)
                        : $this->evaluator->benarUntukData($question->type, $question->correct_answer, (array) ($question->options ?? []), $answer->answer_text, (array) ($answer->answer_payload ?? []));
                    $earned = $isCorrect ? $question->points : 0;
                    $answer->forceFill(['is_correct' => $isCorrect, 'earned_points' => $earned]);
                    $evaluatedAnswers[] = [
                        'id' => $answer->id,
                        'exam_attempt_id' => $attempt->id,
                        'exam_version_question_id' => $question->id,
                        'is_correct' => $isCorrect,
                        'earned_points' => $earned,
                        'updated_at' => now(),
                    ];
                    $correct += $isCorrect ? 1 : 0;
                    $raw += $earned;
                }

                $maxRaw = max(1, (int) $attemptSection->section->raw_max_points);
                $estimated = (int) round(($raw / $maxRaw) * $attemptSection->section->estimated_max_score);
                $passed = $estimated >= $attemptSection->section->estimated_pass_score;
                $attemptSection->update([
                    'answered_count' => $answered,
                    'correct_count' => $correct,
                    'raw_points' => $raw,
                    'estimated_score' => $estimated,
                    'estimated_passed' => $passed,
                    'submitted_at' => now(),
                ]);
                $totalRaw += $raw;
                $totalEstimated += $estimated;
                $allSectionsPassed = $allSectionsPassed && $passed;
            }

            if (! empty($evaluatedAnswers)) {
                ExamAttemptAnswer::upsert($evaluatedAnswers, ['id'], ['is_correct', 'earned_points', 'updated_at']);
            }

            $isFullSimulation = $attempt->mode === 'full' && $attempt->version->exam->type === 'simulation';
            $rankingEligible = $isFullSimulation
                && $attempt->attempt_number === 1
                && $attempt->session->ranking_enabled
                && $attempt->version->ranking_policy === 'first_attempt';
            $totalPassScore = $attempt->version->estimated_total_pass_score
                ?? $attempt->sections->sum(fn ($section) => $section->section->estimated_pass_score);
            $attempt->update([
                'status' => $submittedBy === 'timeout' ? 'timed_out' : 'submitted',
                'submitted_at' => now(),
                'raw_points' => $totalRaw,
                'estimated_score' => $totalEstimated,
                'estimated_passed' => $isFullSimulation ? ($attempt->version->exam->category === 'jft_basic' || $allSectionsPassed) && $totalEstimated >= $totalPassScore : null,
                'ranking_eligible' => $rankingEligible,
                'submitted_by' => $submittedBy,
            ]);
            $this->audit->record($attempt, 'submitted', $attempt->user, ['submitted_by' => $submittedBy]);
            Cache::forget('exam:ranking:'.$attempt->exam_session_id);

            return $attempt->refresh()->load('sections.section');
        });
    }

    public function result(ExamAttempt $attempt): array
    {
        abort_unless($this->access->resultReleased($attempt), 403, 'Hasil ujian belum dirilis.');
        $attempt->load(['version.exam.level', 'sections.section.questions', 'answers']);
        $showReview = $attempt->version->review_policy !== 'none';
        $questions = $attempt->sections->sortBy(fn ($item) => $item->section->sort_order)->flatMap(fn ($item) => $item->section->questions);
        $answers = $attempt->answers->keyBy('exam_version_question_id');

        return [
            'id' => $attempt->id,
            'exam_title' => $attempt->version->exam->title,
            'level' => $attempt->version->exam->level?->level_name,
            'score' => $attempt->estimated_score,
            'max_score' => $attempt->sections->sum(fn ($item) => $item->section->estimated_max_score),
            'question_count' => $questions->count(),
            'status' => $attempt->estimated_passed === null ? 'completed' : ($attempt->estimated_passed ? 'passed' : 'failed'),
            'label' => $attempt->version->exam->type === 'simulation' ? 'Estimasi Simulasi TOKU-UP' : 'Hasil Latihan Ujian',
            'submitted_at' => $attempt->submitted_at?->toIso8601String(),
            'sections' => $attempt->sections->map(fn ($item) => [
                'key' => $item->section->key,
                'title' => $item->section->title,
                'score' => $item->estimated_score,
                'max_score' => $item->section->estimated_max_score,
                'correct_count' => $item->correct_count,
                'answered_count' => $item->answered_count,
            ])->values(),
            'review' => $showReview ? $questions
                ->filter(fn ($question) => $attempt->version->review_policy === 'full' || ! $answers->get($question->id)?->is_correct)
                ->map(fn ($question) => [
                    'question_id' => $question->id,
                    'question_text' => $question->question_text,
                    'answer_text' => $answers->get($question->id)?->answer_text,
                    'correct_answer' => $question->correct_answer,
                    'explanation' => $question->explanation,
                    'is_correct' => $answers->get($question->id)?->is_correct ?? false,
                ])->values() : [],
        ];
    }

    private function assertWritable(ExamAttempt $attempt): void
    {
        abort_if($attempt->status !== 'in_progress', 409, 'Attempt sudah selesai.');
        abort_if(now()->gte($attempt->deadline_at), 409, 'Waktu ujian telah habis.');
    }

    private function autosaveResponse(ExamAttempt $attempt, $savedAt = null): array
    {
        return [
            'server_revision' => $attempt->server_revision,
            'saved_at' => ($savedAt ?? $attempt->updated_at)->toIso8601String(),
            'remaining_seconds' => max(0, (int) floor(now()->diffInSeconds($attempt->deadline_at, false))),
        ];
    }
}
