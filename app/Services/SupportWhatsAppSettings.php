<?php

namespace App\Services;

use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class SupportWhatsAppSettings
{
    private const KEY = 'support_whatsapp';

    public function get(): array
    {
        $stored = DB::table('app_settings')->where('key', self::KEY)->value('value');
        if (! $stored) {
            return [];
        }

        try {
            return json_decode(Crypt::decryptString(json_decode($stored, true)), true) ?: [];
        } catch (\Throwable) {
            return [];
        }
    }

    public function save(array $settings): void
    {
        $existing = DB::table('app_settings')->where('key', self::KEY)->exists();
        DB::table('app_settings')->updateOrInsert(['key' => self::KEY], [
            'value' => json_encode(Crypt::encryptString(json_encode([
                'enabled' => (bool) $settings['enabled'],
                'recipient' => $settings['recipient'],
            ]))),
            'updated_at' => now(),
            ...($existing ? [] : ['created_at' => now()]),
        ]);
        Cache::forget('support_whatsapp_public_url');
    }

    public function publicUrl(): ?string
    {
        $url = Cache::remember('support_whatsapp_public_url', now()->addMinutes(5), function () {
            $settings = $this->get();
            $recipient = $settings['recipient'] ?? '';

            return ($settings['enabled'] ?? false) && preg_match('/^[1-9]\d{7,14}$/', $recipient)
                ? 'https://wa.me/'.$recipient
                : '';
        });

        return $url ?: null;
    }

    public function publicStatus(): array
    {
        $settings = $this->get();

        return [
            'enabled' => (bool) ($settings['enabled'] ?? false),
            'recipient' => $settings['recipient'] ?? '',
        ];
    }
}
