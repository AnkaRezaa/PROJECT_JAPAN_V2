<?php

namespace App\Http\Controllers\SuperAdmin;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class SuperAdminSistemController extends SuperAdminDasarController
{
    private const FRONTEND_THEME_KEY = 'frontend_theme';

    public function __invoke()
    {
        return Inertia::render('SuperAdmin/Sistem/Sistem', [
            'stats' => [
                $this->stat('Status App', 'Stabil', 'OK'),
                $this->stat('Queue', number_format(DB::table('jobs')->count()) . ' job', 'Q', '0', 'down'),
                $this->stat('Tema Global', ucfirst($this->themeSettings()['activeTheme']), 'T'),
                $this->stat('Filesystem', config('filesystems.default'), 'FS'),
            ],
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
