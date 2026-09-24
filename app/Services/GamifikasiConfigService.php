<?php

namespace App\Services;

use App\Models\PengaturanGamifikasi;
use Illuminate\Support\Arr;

class GamifikasiConfigService
{
    public const DEFAULTS = [
        'quiz_xp' => [
            'perfect' => 50,
            'score_80' => 35,
            'score_60' => 20,
            'participation' => 10,
        ],
        'streak' => [
            'enabled' => true,
            'milestones' => [
                ['days' => 7, 'xp' => 50],
                ['days' => 30, 'xp' => 200],
                ['days' => 100, 'xp' => 1000],
            ],
        ],
        'leagues' => [
            ['name' => 'Bronze', 'min_xp' => 0, 'icon' => 'bronze_kabuto'],
            ['name' => 'Silver', 'min_xp' => 500, 'icon' => 'silver_shuriken'],
            ['name' => 'Gold', 'min_xp' => 2000, 'icon' => 'gold_sakura'],
            ['name' => 'Diamond', 'min_xp' => 5000, 'icon' => 'diamond_torii'],
            ['name' => 'Amethyst', 'min_xp' => 12000, 'icon' => 'amethyst_scroll'],
        ],
    ];

    public function all(): array
    {
        $stored = PengaturanGamifikasi::query()
            ->whereIn('key', array_keys(self::DEFAULTS))
            ->get()
            ->mapWithKeys(fn (PengaturanGamifikasi $setting) => [$setting->key => $setting->value ?? []])
            ->all();

        return array_replace_recursive(self::DEFAULTS, $stored);
    }

    public function quizXp(): array
    {
        return $this->all()['quiz_xp'];
    }

    public function streak(): array
    {
        return $this->all()['streak'];
    }

    public function leagues(): array
    {
        return collect($this->all()['leagues'] ?? self::DEFAULTS['leagues'])
            ->map(fn (array $league) => [
                'name' => (string) ($league['name'] ?? 'Liga'),
                'min_xp' => (int) ($league['min_xp'] ?? 0),
                'icon' => (string) ($league['icon'] ?? 'bronze_kabuto'),
            ])
            ->sortBy('min_xp')
            ->values()
            ->all();
    }

    public function quizXpForScore(int|float $scoreOrCorrectCount, ?int $totalQuestions = null): int
    {
        if ($totalQuestions !== null) {
            if ($scoreOrCorrectCount <= 0 || $totalQuestions <= 0) {
                return 0;
            }
            $percentage = (float) ($scoreOrCorrectCount / $totalQuestions);
        } else {
            if ($scoreOrCorrectCount <= 0) {
                return 0;
            }
            $percentage = $scoreOrCorrectCount > 1.0
                ? ((float) $scoreOrCorrectCount / 100.0)
                : (float) $scoreOrCorrectCount;
        }

        $config = $this->quizXp();

        return match (true) {
            $percentage >= 0.9999 => (int) Arr::get($config, 'perfect', self::DEFAULTS['quiz_xp']['perfect']),
            $percentage >= 0.8 => (int) Arr::get($config, 'score_80', self::DEFAULTS['quiz_xp']['score_80']),
            $percentage >= 0.6 => (int) Arr::get($config, 'score_60', self::DEFAULTS['quiz_xp']['score_60']),
            default => (int) Arr::get($config, 'participation', self::DEFAULTS['quiz_xp']['participation']),
        };
    }

    public function streakBonusFor(int $streakCount): int
    {
        $config = $this->streak();

        if (! ($config['enabled'] ?? true)) {
            return 0;
        }

        foreach (($config['milestones'] ?? []) as $milestone) {
            if ((int) ($milestone['days'] ?? 0) === $streakCount) {
                return (int) ($milestone['xp'] ?? 0);
            }
        }

        return 0;
    }

    public function update(array $settings): array
    {
        $merged = array_replace_recursive(self::DEFAULTS, $settings);

        foreach ($merged as $key => $value) {
            PengaturanGamifikasi::query()->updateOrCreate(
                ['key' => $key],
                [
                    'value' => $value,
                    'description' => $this->descriptionFor($key),
                ]
            );
        }

        return $this->all();
    }

    private function descriptionFor(string $key): string
    {
        return match ($key) {
            'quiz_xp' => 'Konfigurasi XP berdasarkan hasil pengerjaan kuis.',
            'streak' => 'Konfigurasi bonus XP untuk streak belajar.',
            'leagues' => 'Konfigurasi perjalanan liga berdasarkan total XP user.',
            default => 'Konfigurasi gamifikasi.',
        };
    }
}
