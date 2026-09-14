<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ExamQuestionBank extends Model
{
    protected $fillable = [
        'level_id',
        'slug',
        'title',
        'source',
        'description',
        'status',
        'created_by',
        'updated_by',
    ];

    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    public function level(): BelongsTo
    {
        return $this->belongsTo(LevelPembelajaran::class, 'level_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(Pengguna::class, 'created_by');
    }

    public function wrappers(): HasMany
    {
        return $this->hasMany(ExamQuestionWrapper::class, 'exam_question_bank_id')->orderBy('sort_order')->orderBy('id');
    }

    public function questions(): HasMany
    {
        return $this->hasMany(ExamBankQuestion::class, 'exam_question_bank_id')->orderBy('sort_order')->orderBy('id');
    }
}
