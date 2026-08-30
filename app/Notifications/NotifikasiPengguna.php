<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class NotifikasiPengguna extends Notification
{
    use Queueable;

    public function __construct(
        private readonly string $jenis,
        private readonly string $judul,
        private readonly string $pesan,
        private readonly ?string $url = null,
        private readonly array $meta = [],
        private readonly string $category = 'system',
        private readonly string $severity = 'info',
        private readonly bool $sendMail = false,
    ) {
    }

    public function via(object $notifiable): array
    {
        $channels = ['database'];

        if ($this->sendMail && config('mail.notifications_enabled') && filled($notifiable->email ?? null)) {
            $channels[] = 'mail';
        }

        return $channels;
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => $this->jenis,
            'title' => $this->judul,
            'message' => $this->pesan,
            'url' => $this->url,
            'category' => $this->category,
            'severity' => $this->severity,
            'meta' => $this->meta,
        ];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $mail = (new MailMessage)
            ->subject($this->judul)
            ->greeting('Halo ' . ($notifiable->username ?? 'Pengguna TOKU-UP') . ',')
            ->line($this->pesan);

        if ($this->url) {
            $mail->action('Buka TOKU-UP', $this->url);
        }

        return $mail->line('Notifikasi ini dikirim otomatis oleh TOKU-UP.');
    }
}
