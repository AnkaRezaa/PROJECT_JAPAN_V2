<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        @php
            $seo = data_get($page, 'props.seo', []);
            $seoTitle = data_get($seo, 'full_title', config('seo.site_name'));
            $seoDescription = data_get($seo, 'description', config('seo.default_description'));
            $seoCanonical = data_get($seo, 'canonical', url()->current());
            $seoRobots = data_get($seo, 'robots', 'noindex, nofollow');
            $seoType = data_get($seo, 'type', 'website');
            $seoImage = data_get($seo, 'image');
            $seoStructuredData = data_get($seo, 'structured_data', []);
            $seoVerification = data_get($seo, 'google_site_verification');
        @endphp

        <title inertia>{{ $seoTitle }}</title>
        <meta inertia="description" name="description" content="{{ $seoDescription }}">
        <meta inertia="robots" name="robots" content="{{ $seoRobots }}">
        <link inertia="canonical" rel="canonical" href="{{ $seoCanonical }}">

        <meta inertia="og:type" property="og:type" content="{{ $seoType }}">
        <meta inertia="og:title" property="og:title" content="{{ $seoTitle }}">
        <meta inertia="og:description" property="og:description" content="{{ $seoDescription }}">
        <meta inertia="og:url" property="og:url" content="{{ $seoCanonical }}">
        <meta inertia="og:site_name" property="og:site_name" content="{{ config('seo.site_name') }}">
        @if ($seoImage)
            <meta inertia="og:image" property="og:image" content="{{ $seoImage }}">
        @endif

        <meta inertia="twitter:card" name="twitter:card" content="{{ $seoImage ? 'summary_large_image' : 'summary' }}">
        <meta inertia="twitter:title" name="twitter:title" content="{{ $seoTitle }}">
        <meta inertia="twitter:description" name="twitter:description" content="{{ $seoDescription }}">
        @if ($seoImage)
            <meta inertia="twitter:image" name="twitter:image" content="{{ $seoImage }}">
        @endif
        @if ($seoVerification)
            <meta inertia="google-site-verification" name="google-site-verification" content="{{ $seoVerification }}">
        @endif
        @foreach ($seoStructuredData as $index => $schema)
            <script inertia="structured-data-{{ $index }}" type="application/ld+json">{!! json_encode($schema, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) !!}</script>
        @endforeach
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700;900&family=Yuji+Syuku&display=swap" rel="stylesheet">

        <!-- Kustom Favicon Nano Banana -->
        <link rel="icon" type="image/png" href="{{ asset('logo.png') }}?v=1" />
        <link rel="shortcut icon" href="{{ asset('logo.png') }}?v=1" />

        <!-- Fonts -->
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&display=swap" rel="stylesheet">

        <!-- Scripts -->
        @routes
        @php
            $tokuUpTheme = ['activeTheme' => 'tokuup', 'customTheme' => []];

            try {
                if (\Illuminate\Support\Facades\Schema::hasTable('app_settings')) {
                    $themeSetting = \Illuminate\Support\Facades\DB::table('app_settings')
                        ->where('key', 'frontend_theme')
                        ->value('value');

                    if ($themeSetting) {
                        $decodedTheme = json_decode($themeSetting, true);

                        if (is_array($decodedTheme)) {
                            $tokuUpTheme = array_merge($tokuUpTheme, $decodedTheme);
                        }
                    }
                }
            } catch (\Throwable $e) {
                $tokuUpTheme = ['activeTheme' => 'tokuup', 'customTheme' => []];
            }
        @endphp
        <script>
            window.__TOKU_UP_THEME__ = @json($tokuUpTheme);
            (() => {
                const mode = localStorage.getItem('theme') || 'system';
                const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

                if (mode === 'dark' || (mode === 'system' && prefersDark)) {
                    document.documentElement.classList.add('dark');
                }
            })();
        </script>
        @viteReactRefresh
        @vite(['resources/js/app.jsx', "resources/js/Pages/{$page['component']}.jsx"])
        @inertiaHead
    </head>
    <body class="font-sans antialiased">
        @inertia
    </body>
</html>
