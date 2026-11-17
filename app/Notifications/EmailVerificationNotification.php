<?php

namespace App\Notifications;

use App\Notifications\Channels\MailtrapTemplateChannel;
use App\Services\MailtrapTemplateService;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\Facades\URL;

class EmailVerificationNotification extends VerifyEmail
{
    protected function verificationUrl($notifiable)
    {
        if (! $notifiable->beta_registered_at) {
            return parent::verificationUrl($notifiable);
        }

        return URL::temporarySignedRoute('public.beta.verify', now()->addMinutes(config('auth.verification.expire', 60)), [
            'id' => $notifiable->getKey(),
            'hash' => sha1($notifiable->getEmailForVerification()),
        ]);
    }

    public function via($notifiable): array
    {
        return app(MailtrapTemplateService::class)->shouldUse('verify_email')
            ? [MailtrapTemplateChannel::class]
            : ['mail'];
    }

    public function toMail($notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Verifikasi alamat email TOKU-UP')
            ->greeting('Halo '.($notifiable->username ?? 'Pengguna TOKU-UP').',')
            ->line('Konfirmasikan alamat email Anda untuk menyelesaikan pendaftaran.')
            ->action('Verifikasi email', $this->verificationUrl($notifiable))
            ->line('Tautan ini akan kedaluwarsa dalam '.config('auth.verification.expire', 60).' menit.')
            ->line('Jika Anda tidak membuat akun, abaikan email ini.');
    }

    public function toMailtrapTemplate(object $notifiable): array
    {
        return [
            'template' => 'verify_email',
            'variables' => [
                'user_name' => $notifiable->username ?? 'Pengguna TOKU-UP',
                'verify_url' => $this->verificationUrl($notifiable),
                'expires_minutes' => (string) config('auth.verification.expire', 60),
            ],
        ];
    }
}
