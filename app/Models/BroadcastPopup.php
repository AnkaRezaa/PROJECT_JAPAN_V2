<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class BroadcastPopup extends Model
{
    use HasFactory;

    protected $table = 'broadcast_popups';

    protected $fillable = [
        'title',
        'description',
        'type',
        'badge',
        'image_path',
        'cta_label',
        'cta_url',
        'target_page',
        'target_audience',
        'is_active',
        'starts_at',
        'ends_at',
        'created_by',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'starts_at' => 'datetime',
        'ends_at' => 'datetime',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(Pengguna::class, 'created_by');
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true)
            ->where(function (Builder $subQuery) {
                $subQuery->whereNull('starts_at')->orWhere('starts_at', '<=', now());
            })
            ->where(function (Builder $subQuery) {
                $subQuery->whereNull('ends_at')->orWhere('ends_at', '>=', now());
            });
    }

    public function scopeForPage(Builder $query, string $page): Builder
    {
        return $query->whereIn('target_page', ['all', $page]);
    }

    public function imageUrl(): ?string
    {
        if (! $this->image_path) {
            return null;
        }

        if (str_starts_with($this->image_path, 'http://') || str_starts_with($this->image_path, 'https://')) {
            return $this->image_path;
        }

        if (str_starts_with($this->image_path, '/')) {
            return $this->image_path;
        }

        return Storage::url($this->image_path);
    }
}
