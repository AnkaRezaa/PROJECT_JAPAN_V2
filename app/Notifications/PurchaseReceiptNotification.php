<?php

namespace App\Notifications;

use App\Notifications\Channels\MailtrapTemplateChannel;
use App\Services\MailtrapTemplateService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class PurchaseReceiptNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private readonly string $transactionCode,
        private readonly string $planName,
        private readonly string $scopeLabel,
        private readonly int $amount,
        private readonly string $processedAt,
        private readonly bool $pendingApproval = false,
    ) {
        $this->afterCommit();
        $this->onQueue('mail');
    }

    public function via(object $notifiable): array
    {
        return app(MailtrapTemplateService::class)->shouldUse('purchase_receipt')
            ? [MailtrapTemplateChannel::class]
            : ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Bukti pembayaran TOKU-UP - '.$this->transactionCode)
            ->greeting('Halo '.($notifiable->username ?? 'Pengguna TOKU-UP').',')
            ->line($this->pendingApproval
                ? 'Pembayaran Anda berhasil diproses. Akses kelas sedang menunggu persetujuan mentor.'
                : 'Pembayaran Anda berhasil diproses dan akses belajar telah diaktifkan.')
            ->line('Paket: '.$this->planName)
            ->line('Akses: '.$this->scopeLabel)
            ->line('Nominal: Rp '.number_format($this->amount, 0, ',', '.'))
            ->line('Waktu pembayaran: '.$this->processedAt)
            ->line('Kode transaksi: '.$this->transactionCode)
            ->action('Lihat invoice', route('user.checkout', $this->transactionCode))
            ->line('Simpan email ini sebagai bukti pembayaran Anda.');
    }

    public function toMailtrapTemplate(object $notifiable): array
    {
        return [
            'template' => 'purchase_receipt',
            'variables' => [
                'user_name' => $notifiable->username ?? 'Pengguna TOKU-UP',
                'transaction_code' => $this->transactionCode,
                'plan_name' => $this->planName,
                'scope_label' => $this->scopeLabel,
                'amount' => 'Rp '.number_format($this->amount, 0, ',', '.'),
                'processed_at' => $this->processedAt,
                'invoice_url' => route('user.checkout', $this->transactionCode),
                'access_status' => $this->pendingApproval ? 'Menunggu persetujuan mentor' : 'Akses aktif',
            ],
        ];
    }
}
