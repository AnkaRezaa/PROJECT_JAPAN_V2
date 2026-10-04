<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DokkaiQuestion extends Model
{
    use HasFactory;

    protected $table = 'dokkai_questions';

    protected $fillable = [
        'dokkai_passage_id',
        'question_number',
        'question_text',
        'question_translation',
        'evidence_paragraph_id',
        'evidence_quote',
        'explanation_correct',
        'explanation_distractors',
        'options',
        'order',
    ];

    protected $casts = [
        'question_number' => 'integer',
        'order' => 'integer',
        'options' => 'array',
        'explanation_distractors' => 'array',
    ];

    public function passage(): BelongsTo
    {
        return $this->belongsTo(DokkaiPassage::class, 'dokkai_passage_id');
    }

    public function evidenceParagraph(): BelongsTo
    {
        return $this->belongsTo(DokkaiParagraph::class, 'evidence_paragraph_id');
    }
}
