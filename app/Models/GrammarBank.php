<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class GrammarBank extends Model
{
    use HasFactory;

    protected $table = 'grammar_bank';

    protected $fillable = [
        'level_id',
        'jlpt_level',
        'lesson_key',
        'pattern',
        'title',
        'meaning',
        'formula',
        'explanation',
        'examples',
        'category',
        'tags',
        'status',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'examples' => 'array',
        'tags' => 'array',
    ];

    public function level(): BelongsTo
    {
        return $this->belongsTo(LevelPembelajaran::class, 'level_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(Pengguna::class, 'created_by');
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(Pengguna::class, 'updated_by');
    }

    public function lessons(): HasMany
    {
        return $this->hasMany(PelajaranGrammar::class, 'grammar_bank_id');
    }

    public function examQuestions(): HasMany
    {
        return $this->hasMany(ExamBankQuestion::class, 'grammar_id');
    }

    public function scopePublished($query)
    {
        return $query->where('status', 'published');
    }

    public function scopeLevel($query, ?string $level)
    {
        if (! $level || $level === 'all') {
            return $query;
        }

        return $query->where(function ($q) use ($level) {
            $q->where('jlpt_level', $level)
                ->orWhereHas('level', fn ($lq) => $lq->where('level_name', 'like', "%{$level}%"));
        });
    }

    public function scopeSearch($query, ?string $search)
    {
        if (! $search) {
            return $query;
        }

        return $query->where(function ($q) use ($search) {
            $q->where('pattern', 'like', "%{$search}%")
                ->orWhere('title', 'like', "%{$search}%")
                ->orWhere('meaning', 'like', "%{$search}%")
                ->orWhere('lesson_key', 'like', "%{$search}%");
        });
    }
}
