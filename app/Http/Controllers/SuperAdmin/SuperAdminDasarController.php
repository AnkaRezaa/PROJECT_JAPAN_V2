<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\LogAktivitas;
use Illuminate\Http\Request;

abstract class SuperAdminDasarController extends Controller
{
    protected function stat(string $title, string $value, string $icon, string $change = '0', string $changeType = 'up'): array
    {
        return compact('title', 'value', 'icon', 'change', 'changeType');
    }

    protected function displayStatus(?string $status): string
    {
        return match ($status) {
            'active', null => 'Aktif',
            'suspended' => 'Suspended',
            'anonymized' => 'Dihapus / Anonim',
            default => ucfirst($status),
        };
    }

    protected function logActivity(
        Request $request,
        string $action,
        ?string $targetType = null,
        ?int $targetId = null,
        ?string $description = null,
        array $metadata = []
    ): void {
        LogAktivitas::create([
            'actor_id' => $request->user()?->id,
            'action' => $action,
            'target_type' => $targetType,
            'target_id' => $targetId,
            'description' => $description,
            'metadata' => $metadata ?: null,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);
    }
}
