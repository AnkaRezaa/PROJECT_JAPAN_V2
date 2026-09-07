<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ExamAttempt extends Model
{
    protected $fillable = ['exam_session_id', 'exam_version_id', 'user_id', 'submission_token', 'mode', 'selected_section_key', 'attempt_number', 'status', 'started_at', 'deadline_at', 'submitted_at', 'raw_points', 'estimated_score', 'estimated_passed', 'ranking_eligible', 'submitted_by', 'server_revision', 'last_autosave_token', 'invalidated_at', 'invalidated_by', 'invalidation_reason'];

    protected $casts = ['started_at' => 'datetime', 'deadline_at' => 'datetime', 'submitted_at' => 'datetime', 'estimated_passed' => 'boolean', 'ranking_eligible' => 'boolean', 'invalidated_at' => 'datetime'];

    public function session(): BelongsTo
    {
        return $this->belongsTo(ExamSession::class, 'exam_session_id');
    }

    public function version(): BelongsTo
    {
        return $this->belongsTo(ExamVersion::class, 'exam_version_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(Pengguna::class, 'user_id');
    }

    public function sections(): HasMany
    {
        return $this->hasMany(ExamAttemptSection::class);
    }

    public function answers(): HasMany
    {
        return $this->hasMany(ExamAttemptAnswer::class);
    }
}
