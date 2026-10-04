<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DokkaiPassage extends Model
{
    use HasFactory;

    protected $table = 'dokkai_passages';

    protected $fillable = [
        'quiz_id',
        'title',
        'sub_title',
        'theme_category',
        'jlpt_level',
        'estimated_reading_time',
        'xp_reward',
        'audio_url',
        'status',
    ];

    protected $casts = [
        'estimated_reading_time' => 'integer',
        'xp_reward' => 'integer',
    ];

    public function quiz(): BelongsTo
    {
        return $this->belongsTo(Kuis::class, 'quiz_id');
    }

    public function paragraphs(): HasMany
    {
        return $this->hasMany(DokkaiParagraph::class, 'dokkai_passage_id')->orderBy('paragraph_number');
    }

    public function vocabularies(): HasMany
    {
        return $this->hasMany(DokkaiVocabulary::class, 'dokkai_passage_id');
    }

    public function questions(): HasMany
    {
        return $this->hasMany(DokkaiQuestion::class, 'dokkai_passage_id')->orderBy('question_number');
    }
}
