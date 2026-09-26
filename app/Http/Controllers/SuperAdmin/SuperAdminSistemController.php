<?php

namespace App\Http\Controllers\SuperAdmin;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class SuperAdminSistemController extends SuperAdminDasarController
{
    private const FRONTEND_THEME_KEY = 'frontend_theme';

    public function __invoke()
    {
        $dbConnected = false;
        $dbLatency = 0;
        try {
            $start = microtime(true);
            DB::select('SELECT 1');
            $dbLatency = round((microtime(true) - $start) * 1000, 1);
            $dbConnected = true;
        } catch (\Throwable $e) {
            $dbConnected = false;
        }

        $pendingJobs = DB::table('jobs')->count();
        $failedJobs = DB::table('failed_jobs')->count();
        $storageLinked = file_exists(public_path('storage'));

        $systemDiagnostics = [
            'app_env' => config('app.env'),
            'app_debug' => config('app.debug'),
            'app_url' => config('app.url'),
            'php_version' => PHP_VERSION,
            'laravel_version' => app()->version(),
            'os' => PHP_OS_FAMILY . ' (' . php_uname('s') . ')',
            'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'PHP CLI / Web Server',
            'memory_limit' => ini_get('memory_limit'),
            'max_execution_time' => ini_get('max_execution_time') . 's',
            'database' => [
                'connection' => config('database.default'),
                'connected' => $dbConnected,
                'latency' => $dbLatency . ' ms',
            ],
            'queue' => [
                'driver' => config('queue.default'),
                'pending_jobs' => $pendingJobs,
                'failed_jobs' => $failedJobs,
            ],
            'cache' => [
                'driver' => config('cache.default'),
            ],
            'storage' => [
                'driver' => config('filesystems.default'),
                'symlink_exists' => $storageLinked,
            ],
            'timezone' => config('app.timezone'),
            'server_time' => now()->format('d M Y H:i:s T'),
        ];

        return Inertia::render('SuperAdmin/Sistem/Sistem', [
            'telemetry' => [
                [
                    'label' => 'Status Aplikasi',
                    'value' => 'Stabil (HTTP 200)',
                    'subvalue' => strtoupper((string) config('app.env')) . ' · PHP ' . PHP_VERSION,
                    'status' => 'healthy',
                    'badge' => 'ONLINE',
                    'key' => 'app',
                ],
                [
                    'label' => 'Database Engine',
                    'value' => $dbConnected ? 'Terkoneksi' : 'Terputus',
                    'subvalue' => strtoupper((string) config('database.default')) . ($dbConnected ? ' · ' . $dbLatency . ' ms' : ''),
                    'status' => $dbConnected ? 'healthy' : 'danger',
                    'badge' => $dbConnected ? $dbLatency . ' ms' : 'DISCONNECTED',
                    'key' => 'db',
                ],
                [
                    'label' => 'Antrean Queue',
                    'value' => $pendingJobs . ' Job Pending',
                    'subvalue' => $failedJobs . ' Gagal · Driver ' . config('queue.default'),
                    'status' => $failedJobs > 0 ? 'warning' : 'healthy',
                    'badge' => $pendingJobs > 0 ? $pendingJobs . ' PENDING' : 'IDLE',
                    'key' => 'queue',
                ],
                [
                    'label' => 'Storage & Media',
                    'value' => $storageLinked ? 'Public Linked' : 'Symlink Unlinked',
                    'subvalue' => 'Driver ' . config('filesystems.default') . ($storageLinked ? ' · OK' : ' · Putus'),
                    'status' => $storageLinked ? 'healthy' : 'warning',
                    'badge' => $storageLinked ? 'MOUNTED' : 'UNLINKED',
                    'key' => 'storage',
                ],
            ],
            'diagnostics' => $systemDiagnostics,
            'stats' => [],
            'themeSettings' => $this->themeSettings(),
            'analyticsStatus' => [
                'gtm' => [
                    'enabled' => (bool) config('beta.google_tag_manager.enabled'),
                    'id' => config('beta.google_tag_manager.id'),
                ],
                'ga4' => [
                    'configured' => filled(config('beta.links.ga4')),
                    'url' => filter_var(config('beta.links.ga4'), FILTER_VALIDATE_URL) ?: null,
                ],
            ],
        ]);
    }

    public function runMaintenance(Request $request)
    {
        $validated = $request->validate([
            'action' => ['required', 'string', 'in:optimize_clear,view_clear,storage_link,cache_clear'],
        ]);

        $action = $validated['action'];
        $message = '';

        try {
            switch ($action) {
                case 'optimize_clear':
                    Artisan::call('optimize:clear');
                    $message = 'Cache config, route, dan views aplikasi berhasil dibersihkan (optimize:clear).';
                    break;
                case 'view_clear':
                    Artisan::call('view:clear');
                    $message = 'Cache compiled Blade views berhasil dibersihkan (view:clear).';
                    break;
                case 'cache_clear':
                    Artisan::call('cache:clear');
                    $message = 'Application cache store berhasil dibersihkan (cache:clear).';
                    break;
                case 'storage_link':
                    Artisan::call('storage:link');
                    $message = 'Symlink storage public berhasil diperiksa/dibuat (storage:link).';
                    break;
            }

            $this->logActivity(
                $request,
                'run_maintenance_' . $action,
                'system',
                null,
                $message
            );

            return back()->with('success', $message);
        } catch (\Throwable $e) {
            return back()->with('error', 'Gagal menjalankan pemeliharaan: ' . $e->getMessage());
        }
    }

    public function updateTheme(Request $request)
    {
        $validated = $request->validate([
            'active_theme' => ['required', 'in:tokuup,spring,autumn,winter,summer'],
            'custom_theme' => ['nullable', 'array'],
            'custom_theme.activeColor' => ['nullable', 'string', 'max:30'],
            'custom_theme.activeShadow' => ['nullable', 'string', 'max:30'],
            'custom_theme.doneColor' => ['nullable', 'string', 'max:30'],
            'custom_theme.doneShadow' => ['nullable', 'string', 'max:30'],
            'custom_theme.primaryColor' => ['nullable', 'hex_color'],
            'custom_theme.primaryHover' => ['nullable', 'hex_color'],
            'custom_theme.primarySoft' => ['nullable', 'hex_color'],
            'custom_theme.brandColor' => ['nullable', 'hex_color'],
            'custom_theme.inkColor' => ['nullable', 'hex_color'],
            'custom_theme.infoColor' => ['nullable', 'hex_color'],
            'custom_theme.achievementColor' => ['nullable', 'hex_color'],
            'custom_theme.surfaceColor' => ['nullable', 'hex_color'],
            'custom_theme.surfaceMuted' => ['nullable', 'hex_color'],
            'custom_theme.borderColor' => ['nullable', 'hex_color'],
            'custom_theme.heroBg' => ['nullable', 'string', 'max:255'],
            'custom_theme.ctaBg' => ['nullable', 'string', 'max:255'],
            'custom_theme.landingHeroBg' => ['nullable', 'string', 'max:255'],
        ]);

        DB::table('app_settings')->updateOrInsert(
            ['key' => self::FRONTEND_THEME_KEY],
            [
                'value' => json_encode([
                    'activeTheme' => $validated['active_theme'],
                    'customTheme' => array_filter($validated['custom_theme'] ?? [], fn ($value) => $value !== null && $value !== ''),
                ]),
                'updated_at' => now(),
                'created_at' => now(),
            ]
        );

        return redirect()->back()->with('success', 'Tema frontend berhasil diperbarui secara global.');
    }

    public function resetTheme()
    {
        DB::table('app_settings')->where('key', self::FRONTEND_THEME_KEY)->delete();

        return redirect()->back()->with('success', 'Tema frontend berhasil direset ke default.');
    }

    private function themeSettings(): array
    {
        $value = DB::table('app_settings')
            ->where('key', self::FRONTEND_THEME_KEY)
            ->value('value');

        $decoded = $value ? json_decode($value, true) : [];

        return array_merge([
            'activeTheme' => 'tokuup',
            'customTheme' => [],
        ], is_array($decoded) ? $decoded : []);
    }
}
