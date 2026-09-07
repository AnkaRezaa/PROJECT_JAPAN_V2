<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ExamSection extends Model
{
    protected $fillable = ['exam_version_id', 'key', 'title', 'short_title', 'sort_order', 'time_limit_seconds', 'raw_max_points', 'estimated_max_score', 'estimated_pass_score'];

    public function version(): BelongsTo
    {
        return $this->belongsTo(ExamVersion::class, 'exam_version_id');
    }

    public function questions(): HasMany
    {
        return $this->hasMany(ExamVersionQuestion::class)->orderBy('sort_order');
    }
}
