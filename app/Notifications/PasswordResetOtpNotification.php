<?php

namespace App\Notifications;

use App\Notifications\Channels\MailtrapTemplateChannel;
use App\Services\MailtrapTemplateService;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class PasswordResetOtpNotification extends Notification
{
    use Queueable;

    public function __construct(
        private readonly string $code,
        private readonly int $expiresInMinutes,
    ) {
    }

    public function via(object $notifiable): array
    {
        return app(MailtrapTemplateService::class)->shouldUse('password_reset_otp')
            ? [MailtrapTemplateChannel::class]
            : ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Kode reset kata sandi TOKU-UP')
            ->greeting('Halo '.($notifiable->username ?? 'Pengguna TOKU-UP').',')
            ->line('Gunakan kode berikut untuk mengatur ulang kata sandi Anda:')
            ->line("**{$this->code}**")
            ->line("Kode berlaku selama {$this->expiresInMinutes} menit dan hanya dapat digunakan satu kali.")
            ->line('Jika Anda tidak meminta reset kata sandi, abaikan email ini.');
    }

    public function toMailtrapTemplate(object $notifiable): array
    {
        return [
            'template' => 'password_reset_otp',
            'variables' => [
                'user_name' => $notifiable->username ?? 'Pengguna TOKU-UP',
                'otp_code' => $this->code,
                'expires_minutes' => (string) $this->expiresInMinutes,
            ],
        ];
    }
}
