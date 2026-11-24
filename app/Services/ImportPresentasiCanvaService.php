<?php

namespace App\Services;

use App\Models\DeckPresentasi;
use App\Models\SlidePresentasi;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ImportPresentasiCanvaService
{
    /**
     * Parse and extract information from a Canva share URL.
     */
    public function resolveCanvaUrl(string $url): array
    {
        $url = trim($url);
        if (! preg_match('#^https?://#i', $url)) {
            $url = 'https://' . $url;
        }

        if (! $this->isCanvaUrl($url)) {
            throw ValidationException::withMessages([
                'canva_url' => 'URL bukan merupakan link Canva yang valid (contoh: https://www.canva.com/design/.../view atau https://canva.link/...).',
            ]);
        }

        // Follow HTTP redirects for short links (such as canva.link/...)
        $resolvedUrl = $this->followRedirects($url);

        // Extract full design path (e.g. DAHUf6ZL8Vo/_4Zfft5019S-Pts-pDuTRg)
        $designId = $this->extractDesignId($resolvedUrl) ?: $this->extractDesignId($url);
        $designPath = $this->extractDesignPath($resolvedUrl) ?: ($this->extractDesignPath($url) ?: ($designId ?: ''));

        // Normalize URL to standard view URL for Canva oEmbed API
        $normalizedUrl = $this->normalizeViewUrl($resolvedUrl, $designPath);
        $cleanEmbedUrl = $designPath
            ? "https://www.canva.com/design/{$designPath}/view?embed"
            : $normalizedUrl;

        // Call Canva official oEmbed endpoint
        $oembedEndpoint = 'https://api.canva.com/_spi/presentation/_oembed';
        
        try {
            $response = Http::withHeaders([
                'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept' => 'application/json',
            ])->timeout(12)->get($oembedEndpoint, [
                'url' => $normalizedUrl,
                'format' => 'json',
            ]);
        } catch (\Throwable $e) {
            $response = null;
        }

        if ($response && $response->successful()) {
            $data = $response->json();

            // Extract embed URL from html iframe if present
            $iframeSrc = null;
            if (! empty($data['html']) && preg_match('/src=["\']([^"\']+)["\']/i', $data['html'], $m)) {
                $iframeSrc = html_entity_decode($m[1]);
            }

            // Remove Canva &meta parameter so the dark title badge overlay is not rendered
            $finalEmbedUrl = $iframeSrc ?: $cleanEmbedUrl;
            $finalEmbedUrl = preg_replace('/([?&])meta(=[^&]*)?(&|$)/', '$1', $finalEmbedUrl);
            $finalEmbedUrl = rtrim(rtrim($finalEmbedUrl, '&'), '?');
            if (! str_contains($finalEmbedUrl, 'embed')) {
                $finalEmbedUrl .= (str_contains($finalEmbedUrl, '?') ? '&' : '?') . 'embed';
            }

            return [
                'success' => true,
                'design_id' => $designId,
                'design_path' => $designPath,
                'title' => ! empty($data['title']) ? trim($data['title']) : 'Presentasi Canva',
                'author_name' => ! empty($data['author_name']) ? trim($data['author_name']) : null,
                'provider_name' => $data['provider_name'] ?? 'Canva',
                'thumbnail_url' => $data['thumbnail_url'] ?? null,
                'embed_url' => $finalEmbedUrl,
                'original_url' => $url,
                'resolved_url' => $resolvedUrl,
                'width' => (int) ($data['width'] ?? 1920),
                'height' => (int) ($data['height'] ?? 1080),
                'aspect_ratio' => round(((int) ($data['width'] ?? 16)) / max(1, (int) ($data['height'] ?? 9)), 4),
            ];
        }

        // Fallback if oEmbed does not return 200 (e.g. rate limit or specific private view token)
        return [
            'success' => true,
            'design_id' => $designId,
            'design_path' => $designPath,
            'title' => 'Presentasi Canva',
            'author_name' => null,
            'provider_name' => 'Canva',
            'thumbnail_url' => null,
            'embed_url' => $cleanEmbedUrl,
            'original_url' => $url,
            'resolved_url' => $resolvedUrl,
            'width' => 1920,
            'height' => 1080,
            'aspect_ratio' => 1.7778,
        ];
    }

    /**
     * Import a Canva share URL into a DeckPresentasi.
     */
    public function import(DeckPresentasi $deck, string $url, ?string $customTitle = null): SlidePresentasi
    {
        $resolved = $this->resolveCanvaUrl($url);
        $title = filled($customTitle) ? trim($customTitle) : $resolved['title'];

        $nextOrder = (int) $deck->slides()->max('order') + 1;

        $content = $resolved['author_name']
            ? "Desain Canva interaktif oleh {$resolved['author_name']}."
            : 'Desain Canva interaktif.';

        return $deck->slides()->create([
            'title' => Str::limit($title, 120, ''),
            'layout' => 'media',
            'content' => $content,
            'media_url' => $resolved['embed_url'],
            'background' => 'dark',
            'accent_color' => '#8B5CF6',
            'speaker_notes' => null,
            'order' => $nextOrder,
            'source_type' => 'canva',
            'canvas_json' => null,
            'snapshot_url' => null,
            'source_meta' => [
                'provider' => 'canva',
                'design_id' => $resolved['design_id'],
                'design_path' => $resolved['design_path'] ?? null,
                'author_name' => $resolved['author_name'],
                'original_url' => $resolved['original_url'],
                'resolved_url' => $resolved['resolved_url'] ?? null,
                'embed_url' => $resolved['embed_url'],
                'thumbnail_url' => $resolved['thumbnail_url'] ?? null,
                'width' => $resolved['width'],
                'height' => $resolved['height'],
                'aspect_ratio' => $resolved['aspect_ratio'],
            ],
        ]);
    }

    public function isCanvaUrl(string $url): bool
    {
        $host = parse_url($url, PHP_URL_HOST);
        if (! $host) {
            return false;
        }

        $host = strtolower($host);

        return str_contains($host, 'canva.com')
            || str_contains($host, 'canva.link')
            || str_contains($host, 'canva.me')
            || str_contains($host, 'canva.site');
    }

    private function followRedirects(string $url): string
    {
        if (function_exists('curl_init')) {
            $ch = curl_init($url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
            curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
            curl_setopt($ch, CURLOPT_NOBODY, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 12);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            curl_exec($ch);
            $effectiveUrl = curl_getinfo($ch, CURLINFO_EFFECTIVE_URL);
            curl_close($ch);

            if (! empty($effectiveUrl) && is_string($effectiveUrl)) {
                return $effectiveUrl;
            }
        }

        return $url;
    }

    private function extractDesignId(string $url): ?string
    {
        if (preg_match('#/design/([A-Za-z0-9_-]+)#i', $url, $matches)) {
            return $matches[1];
        }

        return null;
    }

    private function extractDesignPath(string $url): ?string
    {
        if (preg_match('#/design/([A-Za-z0-9_-]+)(?:/(?!view|edit|watch|present)([A-Za-z0-9_-]+))?#i', $url, $m)) {
            if (! empty($m[2])) {
                return $m[1] . '/' . $m[2];
            }
            return $m[1];
        }

        return null;
    }

    private function normalizeViewUrl(string $url, ?string $designPath = null): string
    {
        if ($designPath) {
            return "https://www.canva.com/design/{$designPath}/view";
        }

        $parsed = parse_url($url);
        $path = $parsed['path'] ?? '';
        
        // Convert /edit or /watch to /view
        if (str_ends_with($path, '/edit')) {
            $path = substr($path, 0, -5) . '/view';
        } elseif (str_ends_with($path, '/watch')) {
            $path = substr($path, 0, -6) . '/view';
        } elseif (! str_contains($path, '/view')) {
            $path = rtrim($path, '/') . '/view';
        }

        return 'https://www.canva.com' . $path;
    }
}
