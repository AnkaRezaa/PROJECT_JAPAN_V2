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
        'stage',
        'source_type',
        'source_id',
        'generation_mode',
        'content_type',
        'question_text',
        'highlight_text',
        'question_reading',
        'show_question_reading',
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
        'show_question_reading' => 'boolean',
    ];

    public function questionReadingForStudent(): ?string
    {
        return ($this->show_question_reading ?? false) ? $this->question_reading : null;
    }

    public function shouldDisableQuestionNarration(): bool
    {
        if ($this->stage === 'word_to_reading' || $this->generation_mode === 'word_to_reading') {
            return true;
        }

        if ($this->type === 'listening') {
            return false;
        }

        $questionText = trim((string) ($this->question_text ?? ''));
        if ($questionText === '' || ! preg_match('/cara\s*baca|yomikata|bacaan|読み方/iu', $questionText)) {
            return false;
        }

        $options = is_array($this->options) ? array_values(array_filter(array_map('trim', $this->options))) : [];
        if ($options === []) {
            return true;
        }

        $kanaCount = 0;
        foreach ($options as $option) {
            if (preg_match('/^[\p{Hiragana}\p{Katakana}ー・〜\s()（）]+$/u', $option)) {
                $kanaCount++;
            }
        }

        return $kanaCount >= (int) ceil(count($options) / 2);
    }

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
