<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class HariModul extends Model
{
    use HasFactory;

    protected $table = 'module_days';

    protected $fillable = [
        'module_id',
        'day_number',
        'title',
        'description',
        'kotoba_intro_title',
        'kotoba_intro_body',
        'status',
        'checkpoint_quiz_id',
        'exam_id',
        'handwriting_enabled',
        'handwriting_mode',
    ];

    protected $casts = [
        'day_number' => 'integer',
        'exam_id' => 'integer',
        'handwriting_enabled' => 'boolean',
    ];

    public function module(): BelongsTo
    {
        return $this->belongsTo(Modul::class, 'module_id');
    }

    public function checkpointQuiz(): BelongsTo
    {
        return $this->belongsTo(Kuis::class, 'checkpoint_quiz_id');
    }

    public function exam(): BelongsTo
    {
        return $this->belongsTo(Exam::class);
    }

    public function quizzes(): HasMany
    {
        return $this->hasMany(Kuis::class, 'module_day_id')->orderBy('id');
    }

    public function flashcardSets(): HasMany
    {
        return $this->hasMany(SetFlashcard::class, 'module_day_id')->orderBy('id');
    }

    public function presentationDecks(): HasMany
    {
        return $this->hasMany(DeckPresentasi::class, 'module_day_id')->orderBy('id');
    }

    public function vocabulary(): BelongsToMany
    {
        return $this->belongsToMany(Kosakata::class, 'module_day_vocabulary', 'module_day_id', 'vocabulary_id')
            ->withPivot('sort_order')
            ->withTimestamps()
            ->orderByPivot('sort_order');
    }

    public function progress(): HasMany
    {
        return $this->hasMany(ProgresHariModul::class, 'module_day_id');
    }
}
