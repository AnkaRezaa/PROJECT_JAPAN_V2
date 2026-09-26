<?php

namespace App\Services;

use App\Models\PengaturanGamifikasi;
use Illuminate\Support\Arr;

class GamifikasiConfigService
{
    public const DEFAULTS = [
        'quiz_xp' => [
            'vocabulary' => [
                'perfect' => 50,
                'score_80' => 35,
                'score_60' => 20,
                'participation' => 10,
                'streak_bonus' => 5,
            ],
            'grammar' => [
                'perfect' => 60,
                'score_80' => 45,
                'score_60' => 25,
                'participation' => 10,
                'streak_bonus' => 10,
            ],
            'coming_soon' => [
                'perfect' => 70,
                'score_80' => 50,
                'score_60' => 30,
                'participation' => 15,
                'streak_bonus' => 15,
            ],
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
            ['name' => 'Bronze', 'min_xp' => 0, 'icon' => 'bronze_kabuto', 'logo_url' => null],
            ['name' => 'Silver', 'min_xp' => 500, 'icon' => 'silver_shuriken', 'logo_url' => null],
            ['name' => 'Gold', 'min_xp' => 2000, 'icon' => 'gold_sakura', 'logo_url' => null],
            ['name' => 'Diamond', 'min_xp' => 5000, 'icon' => 'diamond_torii', 'logo_url' => null],
            ['name' => 'Amethyst', 'min_xp' => 12000, 'icon' => 'amethyst_scroll', 'logo_url' => null],
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

    public function quizXp(?string $type = null): array
    {
        $allQuizXp = $this->all()['quiz_xp'];
        if ($type && isset($allQuizXp[$type])) {
            return $allQuizXp[$type];
        }

        return $allQuizXp;
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
                'logo_url' => ! empty($league['logo_url']) ? (string) $league['logo_url'] : null,
            ])
            ->sortBy('min_xp')
            ->values()
            ->all();
    }

    public function quizXpForScore(int|float $scoreOrCorrectCount, ?int $totalQuestions = null, ?string $type = null): int
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

        $config = $this->quizXp($type);

        return match (true) {
            $percentage >= 0.9999 => (int) ($config['perfect'] ?? Arr::get($config, 'perfect', self::DEFAULTS['quiz_xp']['perfect'])),
            $percentage >= 0.8 => (int) ($config['score_80'] ?? Arr::get($config, 'score_80', self::DEFAULTS['quiz_xp']['score_80'])),
            $percentage >= 0.6 => (int) ($config['score_60'] ?? Arr::get($config, 'score_60', self::DEFAULTS['quiz_xp']['score_60'])),
            default => (int) ($config['participation'] ?? Arr::get($config, 'participation', self::DEFAULTS['quiz_xp']['participation'])),
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
