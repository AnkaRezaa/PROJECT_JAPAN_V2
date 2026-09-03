<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SesiReview extends Model
{
    use HasFactory;

    protected $table = 'review_sessions';

    protected $fillable = [
        'uuid',
        'user_id',
        'mode',
        'target_count',
        'correct_count',
        'wrong_count',
        'skipped_count',
        'started_at',
        'completed_at',
        'expires_at',
    ];

    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
            'expires_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(Pengguna::class, 'user_id');
    }

    public function events(): HasMany
    {
        return $this->hasMany(EventReview::class, 'session_id');
    }
}
