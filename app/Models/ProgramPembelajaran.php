<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProgramPembelajaran extends Model
{
    use HasFactory;

    protected $table = 'program_pembelajaran';

    protected $fillable = [
        'curriculum_track_id',
        'level_id',
        'title',
        'slug',
        'description',
        'instructor_name',
        'thumbnail_url',
        'status',
        'sort_order',
    ];

    public function curriculumTrack(): BelongsTo
    {
        return $this->belongsTo(CurriculumTrack::class, 'curriculum_track_id');
    }

    public function level(): BelongsTo
    {
        return $this->belongsTo(LevelPembelajaran::class, 'level_id');
    }

    public function modules(): HasMany
    {
        return $this->hasMany(Modul::class, 'program_pembelajaran_id')->orderBy('week_number')->orderBy('id');
    }

    public function paymentPlans(): HasMany
    {
        return $this->hasMany(PaketPembayaran::class, 'program_pembelajaran_id');
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(Langganan::class, 'program_pembelajaran_id');
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(Transaksi::class, 'program_pembelajaran_id');
    }

    public function examTargets(): HasMany
    {
        return $this->hasMany(TargetUjianPengguna::class, 'program_pembelajaran_id');
    }

    public function courseReviews(): HasMany
    {
        return $this->hasMany(UlasanKelas::class, 'program_pembelajaran_id');
    }

    public function accessKeys(): HasMany
    {
        return $this->hasMany(KodeAkses::class, 'program_pembelajaran_id');
    }

    public function kloterBelajar(): HasMany
    {
        return $this->hasMany(KloterBelajar::class, 'program_pembelajaran_id');
    }
}
