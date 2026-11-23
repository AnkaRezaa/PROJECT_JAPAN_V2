<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DeckPresentasi extends Model
{
    public const AUDIENCE_SHARED = 'shared';

    public const AUDIENCE_MENTOR_SESSION = 'mentor_session';

    protected $table = 'presentation_decks';

    use HasFactory;

    protected $fillable = [
        'level_id',
        'created_by',
        'module_id',
        'module_day_id',
        'week_slot',
        'sort_order',
        'title',
        'description',
        'status',
        'audience_scope',
        'source_type',
        'source_file_path',
        'source_file_name',
        'source_file_size',
        'import_status',
        'import_summary',
    ];

    protected $casts = [
        'created_by' => 'integer',
        'import_summary' => 'array',
        'sort_order' => 'integer',
    ];

    protected $appends = [
        'source_file_url',
    ];

    public function level(): BelongsTo
    {
        return $this->belongsTo(LevelPembelajaran::class, 'level_id');
    }

    public function module(): BelongsTo
    {
        return $this->belongsTo(Modul::class, 'module_id');
    }

    public function day(): BelongsTo
    {
        return $this->belongsTo(HariModul::class, 'module_day_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(Pengguna::class, 'created_by');
    }

    public function scopeShared(Builder $query): Builder
    {
        return $query->where('audience_scope', self::AUDIENCE_SHARED);
    }

    public function isMentorSession(): bool
    {
        return $this->audience_scope === self::AUDIENCE_MENTOR_SESSION;
    }

    public function slides(): HasMany
    {
        return $this->hasMany(SlidePresentasi::class, 'presentation_deck_id')->orderBy('order');
    }

    public function getSourceFileUrlAttribute(): ?string
    {
        $path = $this->finalPdfPath();

        if (! $path) {
            return null;
        }

        if (str_starts_with($path, 'http')) {
            return $path;
        }

        return route('presentations.pdf.content', $this, false);
    }

    public function finalPdfPath(): ?string
    {
        if ($this->source_type !== 'pdf') {
            return null;
        }

        if (filled($this->source_file_path)) {
            return $this->source_file_path;
        }

        $slide = $this->relationLoaded('slides')
            ? $this->slides->where('layout', 'pdf')->where('source_type', 'pdf')->last()
            : $this->slides()->where('layout', 'pdf')->where('source_type', 'pdf')->latest('id')->first();

        return $slide?->source_meta['path'] ?? null;
    }

    public function finalPdfName(): string
    {
        if ($this->source_type === 'pdf' && filled($this->source_file_name)) {
            return $this->source_file_name;
        }

        $slide = $this->relationLoaded('slides')
            ? $this->slides->where('layout', 'pdf')->where('source_type', 'pdf')->last()
            : $this->slides()->where('layout', 'pdf')->where('source_type', 'pdf')->latest('id')->first();

        return $slide?->source_meta['original_name'] ?? "presentasi-{$this->id}.pdf";
    }
}
