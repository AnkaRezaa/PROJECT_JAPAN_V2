<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Transaksi extends Model
{
    protected $table = 'transactions';

    use HasFactory;

    protected $fillable = [
        'transaction_code',
        'checkout_request_key',
        'midtrans_snap_token',
        'midtrans_snap_redirect_url',
        'user_id',
        'payment_plan_id',
        'subscription_id',
        'scope_type',
        'program_pembelajaran_id',
        'kloter_belajar_id',
        'amount',
        'payment_method',
        'payment_channel',
        'payment_payload',
        'status',
        'proof_of_payment_path',
        'notes',
        'processed_at',
    ];

    protected $casts = [
        'processed_at' => 'datetime',
        'payment_payload' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(Pengguna::class, 'user_id');
    }

    public function paymentPlan()
    {
        return $this->belongsTo(PaketPembayaran::class, 'payment_plan_id');
    }

    public function subscription()
    {
        return $this->belongsTo(Langganan::class, 'subscription_id');
    }

    public function logs()
    {
        return $this->hasMany(LogTransaksi::class, 'transaction_id');
    }

    public function programPembelajaran()
    {
        return $this->belongsTo(ProgramPembelajaran::class, 'program_pembelajaran_id');
    }

    public function kloterBelajar()
    {
        return $this->belongsTo(KloterBelajar::class, 'kloter_belajar_id');
    }

    public function anggotaKloter()
    {
        return $this->hasOne(AnggotaKloter::class, 'transaction_id');
    }
}
