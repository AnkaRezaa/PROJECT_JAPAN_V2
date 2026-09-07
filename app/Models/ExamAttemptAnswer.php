<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ExamAttemptAnswer extends Model
{
    protected $fillable = ['exam_attempt_id', 'exam_version_question_id', 'answer_text', 'answer_payload', 'is_correct', 'earned_points', 'flagged', 'answered_at'];

    protected $casts = ['answer_payload' => 'array', 'is_correct' => 'boolean', 'flagged' => 'boolean', 'answered_at' => 'datetime'];

    public function attempt(): BelongsTo
    {
        return $this->belongsTo(ExamAttempt::class, 'exam_attempt_id');
    }

    public function question(): BelongsTo
    {
        return $this->belongsTo(ExamVersionQuestion::class, 'exam_version_question_id');
    }
}
