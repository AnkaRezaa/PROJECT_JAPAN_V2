<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Kuis extends Model
{
    protected $table = 'quizzes';

    use HasFactory;

    protected $fillable = [
        'module_id',
        'module_day_id',
        'type',
        'time_limit',
        'passing_score',
        'available_at',
        'status',
    ];

    protected $casts = [
        'available_at' => 'datetime',
    ];

    public function isGrammar(): bool
    {
        return $this->type === 'grammar';
    }

    public function grammarLesson(): HasOne
    {
        return $this->hasOne(PelajaranGrammar::class, 'quiz_id');
    }

    public function module(): BelongsTo
    {
        return $this->belongsTo(Modul::class, 'module_id');
    }

    public function day(): BelongsTo
    {
        return $this->belongsTo(HariModul::class, 'module_day_id');
    }

    public function questions(): HasMany
    {
        return $this->hasMany(Soal::class, 'quiz_id')->orderBy('order');
    }

    public function attempts(): HasMany
    {
        return $this->hasMany(PengerjaanKuis::class, 'quiz_id');
    }

    public function questionReviews(): HasMany
    {
        return $this->hasMany(ReviewSoal::class, 'quiz_id');
    }
}
