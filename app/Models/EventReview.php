<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EventReview extends Model
{
    use HasFactory;

    protected $table = 'review_events';

    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'source_type',
        'source_id',
        'activity_type',
        'learning_state',
        'result',
        'occurred_at',
    ];

    protected function casts(): array
    {
        return [
            'occurred_at' => 'datetime',
        ];
    }
}
