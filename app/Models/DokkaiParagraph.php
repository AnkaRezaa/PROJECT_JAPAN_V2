<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DokkaiParagraph extends Model
{
    use HasFactory;

    protected $table = 'dokkai_paragraphs';

    protected $fillable = [
        'dokkai_passage_id',
        'paragraph_number',
        'label',
        'character_count',
        'content_raw',
    ];

    protected $casts = [
        'paragraph_number' => 'integer',
        'character_count' => 'integer',
    ];

    public function passage(): BelongsTo
    {
        return $this->belongsTo(DokkaiPassage::class, 'dokkai_passage_id');
    }

    public function vocabularies(): HasMany
    {
        return $this->hasMany(DokkaiVocabulary::class, 'paragraph_id');
    }

    public function questions(): HasMany
    {
        return $this->hasMany(DokkaiQuestion::class, 'evidence_paragraph_id');
    }
}
