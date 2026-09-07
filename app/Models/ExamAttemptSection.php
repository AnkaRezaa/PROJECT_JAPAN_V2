<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ExamAttemptSection extends Model
{
    protected $fillable = ['exam_attempt_id', 'exam_section_id', 'answered_count', 'correct_count', 'raw_points', 'estimated_score', 'estimated_passed', 'started_at', 'submitted_at'];

    protected $casts = ['estimated_passed' => 'boolean', 'started_at' => 'datetime', 'submitted_at' => 'datetime'];

    public function attempt(): BelongsTo
    {
        return $this->belongsTo(ExamAttempt::class, 'exam_attempt_id');
    }

    public function section(): BelongsTo
    {
        return $this->belongsTo(ExamSection::class, 'exam_section_id');
    }
}
