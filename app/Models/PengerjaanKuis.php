<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PengerjaanKuis extends Model
{
    protected $table = 'attempts';

    use HasFactory;

    protected $fillable = [
        'user_id',
        'quiz_id',
        'submission_token',
        'status',
        'score',
        'xp_earned',
        'started_at',
        'completed_at',
        'attempted_at',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
        'attempted_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(Pengguna::class, 'user_id');
    }

    public function quiz(): BelongsTo
    {
        return $this->belongsTo(Kuis::class, 'quiz_id');
    }

    public function answers(): HasMany
    {
        return $this->hasMany(JawabanPengerjaanKuis::class, 'attempt_id');
    }

    public function scopeWithCompleteGrammarAnswers(Builder $query): Builder
    {
        return $query->whereNotExists(fn ($questions) => $questions->selectRaw('1')
            ->from('questions')
            ->whereColumn('questions.quiz_id', 'attempts.quiz_id')
            ->where('questions.type', '!=', 'handwriting')
            ->where(fn ($scored) => $scored->whereNull('questions.options->practice_only')
                ->orWhereJsonDoesntContain('questions.options->practice_only', true))
            ->whereNotExists(fn ($answers) => $answers->selectRaw('1')
                ->from('attempt_answers')
                ->whereColumn('attempt_answers.attempt_id', 'attempts.id')
                ->whereColumn('attempt_answers.question_id', 'questions.id')));
    }
}
