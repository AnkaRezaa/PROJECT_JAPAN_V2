<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PaketPembayaran extends Model
{
    protected $table = 'payment_plans';

    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'scope_type',
        'program_pembelajaran_id',
        'description',
        'price',
        'duration_days',
        'features',
        'is_active',
    ];

    protected $casts = [
        'features' => 'array',
        'is_active' => 'boolean',
    ];

    public function scopeNonTechnical($query)
    {
        return $query->where(fn ($q) => $q->where('price', '!=', 0)
            ->orWhere('is_active', true)->orWhere('slug', 'not like', 'access-key-%'));
    }

    public function isTechnicalAccessKeyPlan(): bool
    {
        return str_starts_with((string) $this->slug, 'access-key-') && (int) $this->price === 0 && ! $this->is_active;
    }

    public function subscriptions()
    {
        return $this->hasMany(Langganan::class, 'payment_plan_id');
    }

    public function transactions()
    {
        return $this->hasMany(Transaksi::class, 'payment_plan_id');
    }

    public function programPembelajaran()
    {
        return $this->belongsTo(ProgramPembelajaran::class, 'program_pembelajaran_id');
    }
}
