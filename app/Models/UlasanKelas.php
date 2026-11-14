<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class UlasanKelas extends Model
{
    use SoftDeletes;

    protected $table = 'course_reviews';

    protected $fillable = ['rating', 'comment'];

    protected $casts = ['rating' => 'integer', 'moderated_at' => 'datetime'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(Pengguna::class, 'user_id');
    }

    public function program(): BelongsTo
    {
        return $this->belongsTo(ProgramPembelajaran::class, 'program_pembelajaran_id');
    }
}
