<?php

return [
    'contextual_feedback_enabled' => (bool) env('BETA_CONTEXTUAL_FEEDBACK_ENABLED', false),
    'google_tag_manager' => [
        'enabled' => (bool) env('GTM_ENABLED', false),
        'id' => env('GTM_ID'),
    ],
    'links' => [
        'ga4' => env('GA4_PROPERTY_URL'),
        'monitoring' => env('MONITORING_DASHBOARD_URL'),
    ],
];
