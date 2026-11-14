<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ProgramPembelajaran extends Model
{
    use HasFactory;

    protected $table = 'program_pembelajaran';

    protected $fillable = [
        'curriculum_track_id',
        'level_id',
        'learning_type',
        'title',
        'slug',
        'description',
        'instructor_name',
        'thumbnail_url',
        'status',
        'sort_order',
    ];

    public function liveClassSessions(): HasMany
    {
        return $this->hasMany(SesiKelasLive::class, 'program_pembelajaran_id');
    }

    public function isMentor(): bool
    {
        return $this->learning_type === 'mentor';
    }

    public function learningTypeLockReason(bool $fresh = false): ?string
    {
        foreach (['kloterBelajar', 'liveClassSessions', 'paymentPlans', 'subscriptions', 'transactions', 'accessKeys'] as $relation) {
            $countKey = Str::snake($relation).'_count';
            $exists = ! $fresh && array_key_exists($countKey, $this->getAttributes())
                ? (int) $this->getAttribute($countKey) > 0
                : ($relation === 'paymentPlans' ? $this->$relation()->nonTechnical()->exists() : $this->$relation()->exists());
            if ($exists) {
                return 'Tipe terkunci karena kelas sudah memiliki paket atau riwayat operasional.';
            }
        }

        return null;
    }

    public function assertPlanScope(string $scope): void
    {
        if ($scope !== ($this->isMentor() ? 'kloter' : 'program')) {
            throw ValidationException::withMessages(['scope_type' => 'Mode paket harus sesuai tipe kelas.']);
        }
    }

    public function assertMentorClass(): void
    {
        if (! $this->isMentor()) {
            throw ValidationException::withMessages(['program_pembelajaran_id' => 'Pilih kelas Mentor untuk kloter.']);
        }
    }

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
