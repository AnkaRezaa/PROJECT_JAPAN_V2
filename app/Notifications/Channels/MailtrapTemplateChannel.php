<?php

namespace App\Notifications\Channels;

use App\Models\Pengguna;
use App\Services\MailtrapTemplateService;
use Illuminate\Http\Client\RequestException;
use Illuminate\Notifications\Channels\MailChannel;
use Illuminate\Support\Facades\Log;

class MailtrapTemplateChannel
{
    public function __construct(
        private readonly MailtrapTemplateService $mailtrap,
        private readonly MailChannel $fallbackMail,
    ) {}

    public function send(Pengguna $notifiable, object $notification): void
    {
        $message = $notification->toMailtrapTemplate($notifiable);

        try {
            $this->mailtrap->send($notifiable, $message['template'], $message['variables']);
        } catch (RequestException $exception) {
            $response = $exception->response;
            $quotaError = preg_match('/(?:limit|quota|credits?).{0,80}(?:reach|exceed|exhaust)|(?:reach|exceed|exhaust).{0,80}(?:limit|quota|credits?)/i', $response->body());

            // Switching to SMTP cannot bypass account quotas; transient failures may already be accepted.
            if ($quotaError || ! in_array($response->status(), [400, 404, 422], true)) {
                throw $exception;
            }

            Log::warning('Template Mailtrap gagal; email dikirim melalui SMTP fallback.', [
                'template' => $message['template'],
                'user_id' => $notifiable->id,
                'status' => $exception->response?->status(),
            ]);

            $this->fallbackMail->send($notifiable, $notification);
        }
    }
}
