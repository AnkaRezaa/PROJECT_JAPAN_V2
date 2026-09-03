<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ReviewFlashcard extends Model
{
    protected $table = 'flashcard_reviews';

    use HasFactory;

    protected $fillable = [
        'user_id',
        'flashcard_id',
        'skill',
        'status',
        'known_count',
        'learning_count',
        'mastery_level',
        'correct_streak',
        'review_count',
        'wrong_count',
        'last_result',
        'last_reviewed_at',
        'next_review_at',
    ];

    protected $casts = [
        'last_reviewed_at' => 'datetime',
        'next_review_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(Pengguna::class, 'user_id');
    }

    public function flashcard()
    {
        return $this->belongsTo(Flashcard::class, 'flashcard_id');
    }
}
