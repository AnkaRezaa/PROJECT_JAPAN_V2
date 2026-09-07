<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Exam extends Model
{
    protected $fillable = ['level_id', 'slug', 'title', 'description', 'type', 'access_type', 'status', 'created_by', 'updated_by'];

    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    public function level(): BelongsTo
    {
        return $this->belongsTo(LevelPembelajaran::class, 'level_id');
    }

    public function versions(): HasMany
    {
        return $this->hasMany(ExamVersion::class);
    }

    public function attempts(): HasManyThrough
    {
        return $this->hasManyThrough(ExamAttempt::class, ExamVersion::class);
    }

    public function publishedVersion(): HasOne
    {
        return $this->hasOne(ExamVersion::class)
            ->where('status', 'published')
            ->ofMany('version_number', 'max');
    }

    public function latestVersion(): HasOne
    {
        return $this->hasOne(ExamVersion::class)->ofMany('version_number', 'max');
    }
}
