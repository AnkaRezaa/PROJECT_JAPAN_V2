<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ExamAuditLog extends Model
{
    public $timestamps = false;

    protected $fillable = ['subject_type', 'subject_id', 'action', 'actor_id', 'metadata', 'created_at'];

    protected $casts = ['metadata' => 'array', 'created_at' => 'datetime'];
}
