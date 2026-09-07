<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ExamVersion extends Model
{
    protected $fillable = ['exam_id', 'version_number', 'status', 'attempt_limit', 'result_release_policy', 'review_policy', 'ranking_policy', 'estimated_total_pass_score', 'content_hash', 'published_at', 'published_by'];

    protected $casts = ['published_at' => 'datetime'];

    public function exam(): BelongsTo
    {
        return $this->belongsTo(Exam::class);
    }

    public function sections(): HasMany
    {
        return $this->hasMany(ExamSection::class)->orderBy('sort_order');
    }

    public function sessions(): HasMany
    {
        return $this->hasMany(ExamSession::class);
    }
}
