<?php

return [
    'prelaunch_enabled' => (bool) env('BETA_PRELAUNCH_ENABLED', false),
    'contextual_feedback_enabled' => (bool) env('BETA_CONTEXTUAL_FEEDBACK_ENABLED', false),
    'google_tag_manager' => [
        'enabled' => (bool) env('GTM_ENABLED', false),
        'id' => env('GTM_ID'),
    ],
    'links' => [
        'ga4' => env('GA4_PROPERTY_URL'),
        'monitoring' => env('MONITORING_DASHBOARD_URL'),
    ],
    'google_sheets' => [
        'webhook_url' => env('BETA_GOOGLE_SHEETS_WEBHOOK_URL'),
        'webhook_secret' => env('BETA_GOOGLE_SHEETS_WEBHOOK_SECRET'),
    ],
];
