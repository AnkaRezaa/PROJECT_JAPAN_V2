<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ExamQuestionWrapper extends Model
{
    protected $fillable = [
        'exam_question_bank_id',
        'wrapper_code',
        'title',
        'category',
        'mondai_number',
        'stimulus_text',
        'stimulus_reading',
        'audio_url',
        'sort_order',
    ];

    public function bank(): BelongsTo
    {
        return $this->belongsTo(ExamQuestionBank::class, 'exam_question_bank_id');
    }

    public function questions(): HasMany
    {
        return $this->hasMany(ExamBankQuestion::class, 'exam_question_wrapper_id')->orderBy('sort_order')->orderBy('id');
    }
}
