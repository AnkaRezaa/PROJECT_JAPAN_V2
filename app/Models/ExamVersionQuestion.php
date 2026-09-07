<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ExamVersionQuestion extends Model
{
    protected $fillable = ['exam_section_id', 'source_question_id', 'code', 'type', 'sort_order', 'points', 'question_text', 'question_reading', 'options', 'option_readings', 'correct_answer', 'correct_answer_reading', 'explanation', 'explanation_reading', 'audio_path', 'content_hash'];

    protected $casts = ['options' => 'array', 'option_readings' => 'array'];

    protected $hidden = ['correct_answer', 'correct_answer_reading', 'explanation', 'explanation_reading', 'content_hash'];

    public function section(): BelongsTo
    {
        return $this->belongsTo(ExamSection::class, 'exam_section_id');
    }
}
