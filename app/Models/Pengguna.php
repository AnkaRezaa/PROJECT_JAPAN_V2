<?php

namespace App\Models;

use App\Notifications\EmailVerificationNotification;
// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\PenggunaFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail as MustVerifyEmailContract;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class Pengguna extends Authenticatable implements MustVerifyEmailContract
{
    public const ADMIN_SCOPE_GLOBAL = 'global';

    public const ADMIN_SCOPE_KLOTER = 'kloter';

    protected $table = 'users';

    /** @use HasFactory<PenggunaFactory> */
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'username',
        'email',
        'email_verified_at',
        'password',
        'password_login_enabled',
        'role',
        'admin_scope',
        'subscription_status',
        'auth_provider',
        'google_id',
        'avatar',
        'show_romaji',
        'show_indonesian_translation',
        'status',
        'suspended_at',
        'suspended_reason',
        'scheduled_anonymization_at',
        'anonymized_at',
        'xp',
        'level',
        'streak_count',
        'last_activity_date',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'last_activity_date' => 'date',
            'suspended_at' => 'datetime',
            'scheduled_anonymization_at' => 'datetime',
            'anonymized_at' => 'datetime',
            'password' => 'hashed',
            'password_login_enabled' => 'boolean',
            'show_romaji' => 'boolean',
            'show_indonesian_translation' => 'boolean',
        ];
    }

    public function sendEmailVerificationNotification(): void
    {
        $this->notify(new EmailVerificationNotification);
    }

    public function attempts(): HasMany
    {
        return $this->hasMany(PengerjaanKuis::class, 'user_id');
    }

    public function learningFeedback(): HasMany
    {
        return $this->hasMany(UmpanBalikPembelajaran::class, 'user_id');
    }

    public function productFeedback(): HasMany
    {
        return $this->hasMany(UmpanBalikProduk::class, 'user_id');
    }

    public function examTargets(): HasMany
    {
        return $this->hasMany(TargetUjianPengguna::class, 'user_id');
    }

    public function progress(): HasMany
    {
        return $this->hasMany(Progres::class, 'user_id');
    }

    public function dayProgress(): HasMany
    {
        return $this->hasMany(ProgresHariModul::class, 'user_id');
    }


    public function achievements(): BelongsToMany
    {
        return $this->belongsToMany(Pencapaian::class, 'user_achievements', 'user_id', 'achievement_id')
            ->withPivot('unlocked_at')
            ->withTimestamps();
    }

    public function createdNews(): HasMany
    {
        return $this->hasMany(Berita::class, 'created_by');
    }

    public function activityLogs(): HasMany
    {
        return $this->hasMany(LogAktivitas::class, 'actor_id');
    }

    public function loginHistories(): HasMany
    {
        return $this->hasMany(RiwayatLogin::class, 'user_id');
    }

    public function statusHistories(): HasMany
    {
        return $this->hasMany(RiwayatStatusPengguna::class, 'user_id');
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(Langganan::class, 'user_id');
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(Transaksi::class, 'user_id');
    }

    public function anggotaKloter(): HasMany
    {
        return $this->hasMany(AnggotaKloter::class, 'user_id');
    }

    public function kloterBelajar(): BelongsToMany
    {
        return $this->belongsToMany(KloterBelajar::class, 'anggota_kloter', 'user_id', 'kloter_belajar_id')
            ->withPivot(['subscription_id', 'transaction_id', 'access_key_id', 'joined_at', 'status', 'catatan'])
            ->withTimestamps();
    }

    public function kloterDikelola(): HasMany
    {
        return $this->hasMany(KloterBelajar::class, 'admin_id');
    }

    public function isAdminGlobal(): bool
    {
        return $this->role === 'admin' && $this->admin_scope !== self::ADMIN_SCOPE_KLOTER;
    }

    public function isMentor(): bool
    {
        return $this->role === 'admin' && $this->admin_scope === self::ADMIN_SCOPE_KLOTER;
    }

    /**
     * Backward-compatible alias for older integrations and stored terminology.
     */
    public function isAdminKloter(): bool
    {
        return $this->isMentor();
    }
}
