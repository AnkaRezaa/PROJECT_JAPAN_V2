<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
        'redirect' => env('GOOGLE_REDIRECT_URI'),
    ],

    'livekit' => [
        'api_url' => env('LIVEKIT_API_URL', 'http://127.0.0.1:7880'),
        'ws_url' => env('LIVEKIT_WS_URL', 'ws://127.0.0.1:7880'),
        'api_key' => env('LIVEKIT_API_KEY'),
        'api_secret' => env('LIVEKIT_API_SECRET'),
        'token_ttl' => (int) env('LIVEKIT_TOKEN_TTL', 900),
    ],

    'midtrans' => [
        'server_key' => env('MIDTRANS_SERVER_KEY'),
        'client_key' => env('MIDTRANS_CLIENT_KEY'),
        'is_production' => env('MIDTRANS_IS_PRODUCTION', false),
        'is_sanitized' => env('MIDTRANS_IS_SANITIZED', true),
        'is_3ds' => env('MIDTRANS_IS_3DS', true),
        'snap_expiry_hours' => (int) env('MIDTRANS_SNAP_EXPIRY_HOURS', 24),
    ],

    'sentry' => [
        'enabled' => (bool) env('SENTRY_ENABLED', false),
    ],

    'mailtrap' => [
        'templates_enabled' => env('MAILTRAP_TEMPLATES_ENABLED', false),
        'api_token' => env('MAILTRAP_API_TOKEN'),
        'api_endpoint' => env('MAILTRAP_API_ENDPOINT', 'https://send.api.mailtrap.io/api/send'),
        'sandbox_inbox_id' => env('MAILTRAP_SANDBOX_INBOX_ID'),
        'templates' => [
            'password_reset_otp' => env('MAILTRAP_TEMPLATE_PASSWORD_RESET_OTP_UUID'),
            'verify_email' => env('MAILTRAP_TEMPLATE_VERIFY_EMAIL_UUID'),
            'purchase_receipt' => env('MAILTRAP_TEMPLATE_PURCHASE_RECEIPT_UUID'),
        ],
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

];
