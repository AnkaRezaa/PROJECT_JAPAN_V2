<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DokkaiAttemptAnswer extends Model
{
    use HasFactory;

    protected $table = 'dokkai_attempt_answers';

    protected $fillable = [
        'attempt_id',
        'dokkai_question_id',
        'selected_option',
        'is_correct',
    ];

    protected $casts = [
        'is_correct' => 'boolean',
    ];

    public function attempt(): BelongsTo
    {
        return $this->belongsTo(PengerjaanKuis::class, 'attempt_id');
    }

    public function question(): BelongsTo
    {
        return $this->belongsTo(DokkaiQuestion::class, 'dokkai_question_id');
    }
}
