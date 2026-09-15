<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UmpanBalikProduk extends Model
{
    use HasFactory;

    protected $table = 'product_feedback';

    protected $fillable = [
        'user_id',
        'role_snapshot',
        'source',
        'feature',
        'context_type',
        'context_id',
        'context_key',
        'trigger',
        'rating',
        'reason',
        'response_type',
        'category',
        'message',
        'page_url',
        'user_agent',
        'status',
        'resolution_note',
        'handled_by',
        'handled_at',
    ];

    protected function casts(): array
    {
        return [
            'context_id' => 'integer',
            'rating' => 'integer',
            'handled_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(Pengguna::class, 'user_id');
    }

    public function handler(): BelongsTo
    {
        return $this->belongsTo(Pengguna::class, 'handled_by');
    }
}
