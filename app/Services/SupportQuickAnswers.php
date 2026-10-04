<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class SupportQuickAnswers
{
    private const KEY = 'support_quick_answers';

    public function get(): array
    {
        return Cache::remember(self::KEY, now()->addMinutes(5), function (): array {
            $stored = DB::table('app_settings')->where('key', self::KEY)->value('value');
            $answers = json_decode($stored ?? '[]', true);

            if (! is_array($answers) || ! array_is_list($answers)) {
                return [];
            }

            return array_values(array_filter($answers, fn ($answer) => is_array($answer)
                && is_string($answer['question'] ?? null)
                && is_string($answer['answer'] ?? null)));
        });
    }

    public function save(array $answers): void
    {
        $existing = DB::table('app_settings')->where('key', self::KEY)->exists();

        DB::table('app_settings')->updateOrInsert(['key' => self::KEY], [
            'value' => json_encode($answers, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
            'updated_at' => now(),
            ...($existing ? [] : ['created_at' => now()]),
        ]);

        Cache::forget(self::KEY);
    }
}
