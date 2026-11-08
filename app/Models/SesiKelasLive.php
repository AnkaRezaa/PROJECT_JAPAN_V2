<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SesiKelasLive extends Model
{
    use HasFactory;

    protected $table = 'live_class_sessions';

    protected $fillable = [
        'program_pembelajaran_id',
        'kloter_belajar_id',
        'presentation_deck_id',
        'mentor_id',
        'room_name',
        'join_code',
        'status',
        'stage_mode',
        'current_slide_index',
        'board_snapshot',
        'scheduled_at',
        'started_at',
        'ended_at',
        'recording_url',
        'summary_url',
    ];

    protected function casts(): array
    {
        return [
            'board_snapshot' => 'array',
            'current_slide_index' => 'integer',
            'scheduled_at' => 'datetime',
            'started_at' => 'datetime',
            'ended_at' => 'datetime',
        ];
    }

    public function program(): BelongsTo
    {
        return $this->belongsTo(ProgramPembelajaran::class, 'program_pembelajaran_id');
    }

    public function kloter(): BelongsTo
    {
        return $this->belongsTo(KloterBelajar::class, 'kloter_belajar_id');
    }

    public function deck(): BelongsTo
    {
        return $this->belongsTo(DeckPresentasi::class, 'presentation_deck_id');
    }

    public function mentor(): BelongsTo
    {
        return $this->belongsTo(Pengguna::class, 'mentor_id');
    }

    public function participants(): HasMany
    {
        return $this->hasMany(PesertaKelasLive::class, 'live_class_session_id');
    }
}
