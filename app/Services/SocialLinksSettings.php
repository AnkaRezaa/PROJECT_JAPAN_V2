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
    private const FEED_KEY = 'instagram_feed';
    private const FEED_CACHE_KEY = 'public_instagram_feed';

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

    /**
     * @return list<array{url: string, embed_url: string, type: string, code: string}>
     */
    public function feed(): array
    {
        return Cache::remember(self::FEED_CACHE_KEY, now()->addMinutes(5), function (): array {
            $raw = DB::table('app_settings')->where('key', self::FEED_KEY)->value('value');
            $stored = $raw ? json_decode($raw, true) : [];

            return is_array($stored) ? array_values($stored) : [];
        });
    }

    public function saveFeed(?string $rawInput): void
    {
        $items = $this->parseFeedUrls((string) $rawInput);
        $exists = DB::table('app_settings')->where('key', self::FEED_KEY)->exists();
        DB::table('app_settings')->updateOrInsert(['key' => self::FEED_KEY], [
            'value' => json_encode($items),
            'updated_at' => now(),
            ...($exists ? [] : ['created_at' => now()]),
        ]);
        DB::afterCommit(fn () => Cache::forget(self::FEED_CACHE_KEY));
    }

    /**
     * @return list<array{url: string, embed_url: string, type: string, code: string}>
     */
    public function parseFeedUrls(string $rawInput): array
    {
        $lines = preg_split('/[\r\n,\s]+/', trim($rawInput)) ?: [];
        $items = [];
        $seen = [];

        foreach ($lines as $line) {
            $url = trim($line);
            if ($url === '' || ! filter_var($url, FILTER_VALIDATE_URL)) {
                continue;
            }
            $parts = parse_url($url);
            $host = preg_replace('/^www\./', '', strtolower($parts['host'] ?? ''));
            if (($parts['scheme'] ?? '') !== 'https' || $host !== 'instagram.com') {
                continue;
            }
            if (! preg_match('#^/(p|reel|tv)/([A-Za-z0-9_-]+)(?:/|$)#', $parts['path'] ?? '', $matches)) {
                continue;
            }
            $type = $matches[1];
            $code = $matches[2];
            $key = "{$type}:{$code}";
            if (isset($seen[$key])) {
                continue;
            }
            $seen[$key] = true;
            $items[] = [
                'url' => "https://www.instagram.com/{$type}/{$code}/",
                'embed_url' => "https://www.instagram.com/{$type}/{$code}/embed/",
                'type' => $type,
                'code' => $code,
            ];
            if (count($items) >= 100) {
                break;
            }
        }

        return $items;
    }
}
