<?php

return [
    'site_name' => env('SEO_SITE_NAME', 'TOKU-UP'),
    'default_description' => env(
        'SEO_DEFAULT_DESCRIPTION',
        'Belajar bahasa Jepang melalui roadmap terstruktur, kosakata, kanji, kuis, latihan menulis, kelas mandiri, dan pendampingan mentor.'
    ),
    'default_image' => env('SEO_DEFAULT_IMAGE'),
    'indexing_enabled' => (bool) env('SEO_INDEXING_ENABLED', false),
    'google_site_verification' => env('GOOGLE_SITE_VERIFICATION'),
    'indexable_routes' => [
        'home',
        'about',
        'pricing',
        'roadmap',
        'privacy-policy',
        'terms',
        'cookie-policy',
        'public.classes.show',
        'robots',
        'sitemap',
    ],
];
