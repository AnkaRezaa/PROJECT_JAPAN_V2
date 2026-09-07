<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ExamSession extends Model
{
    protected $fillable = ['exam_version_id', 'name', 'starts_at', 'ends_at', 'status', 'attempt_limit_override', 'result_released_at', 'ranking_enabled', 'created_by'];

    protected $casts = ['starts_at' => 'datetime', 'ends_at' => 'datetime', 'result_released_at' => 'datetime', 'ranking_enabled' => 'boolean'];

    public function version(): BelongsTo
    {
        return $this->belongsTo(ExamVersion::class, 'exam_version_id');
    }

    public function cohorts(): BelongsToMany
    {
        return $this->belongsToMany(KloterBelajar::class, 'exam_session_cohorts', 'exam_session_id', 'kloter_belajar_id');
    }

    public function attempts(): HasMany
    {
        return $this->hasMany(ExamAttempt::class);
    }
}
