<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Soal extends Model
{
    protected $table = 'questions';

    use HasFactory;

    protected $fillable = [
        'quiz_id',
        'type',
        'question_text',
        'question_reading',
        'correct_answer',
        'correct_answer_reading',
        'explanation',
        'explanation_reading',
        'options',
        'option_readings',
        'audio_url',
        'order',
        'points',
    ];

    protected $casts = [
        'options' => 'array',
        'option_readings' => 'array',
        'points' => 'integer',
    ];

    public function quiz(): BelongsTo
    {
        return $this->belongsTo(Kuis::class, 'quiz_id');
    }

    public function attemptAnswers(): HasMany
    {
        return $this->hasMany(JawabanPengerjaanKuis::class, 'question_id');
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(ReviewSoal::class, 'question_id');
    }
}
