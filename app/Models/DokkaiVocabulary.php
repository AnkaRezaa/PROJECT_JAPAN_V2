<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DokkaiVocabulary extends Model
{
    use HasFactory;

    protected $table = 'dokkai_vocabularies';

    protected $fillable = [
        'dokkai_passage_id',
        'paragraph_id',
        'word',
        'furigana',
        'romaji',
        'meaning',
        'pitch_accent',
        'part_of_speech',
        'jlpt_level',
        'example_sentence',
        'example_translation',
        'audio_url',
    ];

    public function passage(): BelongsTo
    {
        return $this->belongsTo(DokkaiPassage::class, 'dokkai_passage_id');
    }

    public function paragraph(): BelongsTo
    {
        return $this->belongsTo(DokkaiParagraph::class, 'paragraph_id');
    }
}
