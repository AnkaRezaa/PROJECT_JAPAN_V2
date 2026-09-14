<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ExamBankQuestion extends Model
{
    protected $fillable = [
        'exam_question_bank_id',
        'exam_question_wrapper_id',
        'code',
        'type',
        'sort_order',
        'points',
        'question_text',
        'question_reading',
        'options',
        'option_readings',
        'correct_answer',
        'correct_answer_reading',
        'explanation',
        'explanation_reading',
        'audio_url',
        'content_hash',
    ];

    protected $casts = [
        'options' => 'array',
        'option_readings' => 'array',
        'sort_order' => 'integer',
        'points' => 'integer',
    ];

    public function bank(): BelongsTo
    {
        return $this->belongsTo(ExamQuestionBank::class, 'exam_question_bank_id');
    }

    public function wrapper(): BelongsTo
    {
        return $this->belongsTo(ExamQuestionWrapper::class, 'exam_question_wrapper_id');
    }
}
