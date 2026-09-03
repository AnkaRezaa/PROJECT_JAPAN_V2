<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EventReview extends Model
{
    use HasFactory;

    protected $table = 'review_events';

    protected $fillable = [
        'session_id',
        'user_id',
        'source_type',
        'source_id',
        'skill',
        'result',
        'duration_ms',
        'previous_state',
        'occurred_at',
        'undone_at',
    ];

    protected function casts(): array
    {
        return [
            'previous_state' => 'array',
            'occurred_at' => 'datetime',
            'undone_at' => 'datetime',
        ];
    }

    public function session(): BelongsTo
    {
        return $this->belongsTo(SesiReview::class, 'session_id');
    }
}
