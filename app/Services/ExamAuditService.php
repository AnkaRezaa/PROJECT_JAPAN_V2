<?php

namespace App\Services;

use App\Models\ExamAuditLog;
use App\Models\Pengguna;
use Illuminate\Database\Eloquent\Model;

class ExamAuditService
{
    public function record(Model $subject, string $action, ?Pengguna $actor, array $metadata = []): void
    {
        ExamAuditLog::create([
            'subject_type' => class_basename($subject),
            'subject_id' => $subject->getKey(),
            'action' => $action,
            'actor_id' => $actor?->id,
            'metadata' => $metadata ?: null,
            'created_at' => now(),
        ]);
    }
}
