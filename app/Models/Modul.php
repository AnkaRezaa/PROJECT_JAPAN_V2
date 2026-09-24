<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Modul extends Model
{
    protected $table = 'modules';

    use HasFactory;

    protected $fillable = [
        'level_id',
        'program_pembelajaran_id',
        'title',
        'week_number',
        'description',
        'status',
    ];

    public function level(): BelongsTo
    {
        return $this->belongsTo(LevelPembelajaran::class, 'level_id');
    }

    public function programPembelajaran(): BelongsTo
    {
        return $this->belongsTo(ProgramPembelajaran::class, 'program_pembelajaran_id');
    }

    public function quizzes(): HasMany
    {
        return $this->hasMany(Kuis::class, 'module_id')->orderBy('id');
    }

    public function flashcardSets(): HasMany
    {
        return $this->hasMany(SetFlashcard::class, 'module_id')->orderBy('id');
    }

    public function presentationDecks(): HasMany
    {
        return $this->hasMany(DeckPresentasi::class, 'module_id')->orderBy('id');
    }

    public function progress(): HasMany
    {
        return $this->hasMany(Progres::class, 'module_id');
    }

    public function questionReviews(): HasMany
    {
        return $this->hasMany(ReviewSoal::class, 'module_id');
    }

    public function days(): HasMany
    {
        return $this->hasMany(HariModul::class, 'module_id')->orderBy('day_number');
    }
}
