<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class SocialLinksSettings
{
    public const HOSTS = [
        'instagram' => ['instagram.com'],
        'facebook' => ['facebook.com'],
        'youtube' => ['youtube.com'],
        'threads' => ['threads.net', 'threads.com'],
        'x' => ['x.com', 'twitter.com'],
    ];

    private const KEY = 'social_links';
    private const CACHE_KEY = 'public_social_links';

    public function all(): array
    {
        return Cache::remember(self::CACHE_KEY, now()->addMinutes(5), function () {
            $raw = DB::table('app_settings')->where('key', self::KEY)->value('value');
            $stored = $raw ? json_decode($raw, true) : [];
            $links = [];
            foreach (self::HOSTS as $channel => $hosts) {
                $url = is_array($stored) && is_string($stored[$channel] ?? null) ? trim($stored[$channel]) : '';
                if ($this->isAllowedUrl($channel, $url)) {
                    $links[$channel] = $url;
                }
            }

            return $links;
        });
    }

    public function isAllowedUrl(string $channel, string $url): bool
    {
        if (strlen($url) > 500 || ! filter_var($url, FILTER_VALIDATE_URL)) {
            return false;
        }
        $parts = parse_url($url);
        $host = preg_replace('/^www\./', '', strtolower($parts['host'] ?? ''));

        return ($parts['scheme'] ?? '') === 'https'
            && ! isset($parts['user']) && ! isset($parts['pass'])
            && (! isset($parts['port']) || $parts['port'] === 443)
            && in_array($host, self::HOSTS[$channel] ?? [], true);
    }

    public function save(array $links): void
    {
        $clean = [];
        foreach (self::HOSTS as $channel => $hosts) {
            $url = is_string($links[$channel] ?? null) ? trim($links[$channel]) : '';
            if ($this->isAllowedUrl($channel, $url)) {
                $clean[$channel] = $url;
            }
        }
        $exists = DB::table('app_settings')->where('key', self::KEY)->exists();
        DB::table('app_settings')->updateOrInsert(['key' => self::KEY], [
            'value' => json_encode($clean),
            'updated_at' => now(),
            ...($exists ? [] : ['created_at' => now()]),
        ]);
        DB::afterCommit(fn () => Cache::forget(self::CACHE_KEY));
    }
}
