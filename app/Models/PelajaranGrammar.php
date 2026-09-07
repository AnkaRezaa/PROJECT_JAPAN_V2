<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PelajaranGrammar extends Model
{
    protected $table = 'grammar_lessons';

    protected $fillable = [
        'quiz_id',
        'lesson_key',
        'level',
        'pattern',
        'title',
        'meaning',
        'formula',
        'explanation',
        'examples',
        'settings',
    ];

    protected $casts = [
        'examples' => 'array',
        'settings' => 'array',
    ];

    public function quiz(): BelongsTo
    {
        return $this->belongsTo(Kuis::class, 'quiz_id');
    }
}
