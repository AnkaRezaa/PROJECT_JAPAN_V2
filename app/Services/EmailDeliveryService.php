<?php

namespace App\Services;

use App\Exceptions\EmailDeliveryUnavailable;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Log;
use Symfony\Component\Mailer\Exception\TransportExceptionInterface;

class EmailDeliveryService
{
    public function send(callable $send): void
    {
        try {
            $send();
        } catch (TransportExceptionInterface|RequestException|ConnectionException $exception) {
            // Provider responses may contain credentials or message content; never log them here.
            Log::warning('Layanan pengiriman email tidak tersedia.', [
                'exception_class' => $exception::class,
                'http_status' => $exception instanceof RequestException ? $exception->response->status() : null,
            ]);

            throw new EmailDeliveryUnavailable(EmailDeliveryUnavailable::USER_MESSAGE);
        }
    }
}
