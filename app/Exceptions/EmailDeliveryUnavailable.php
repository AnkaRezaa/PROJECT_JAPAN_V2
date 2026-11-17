<?php

namespace App\Exceptions;

use RuntimeException;

class EmailDeliveryUnavailable extends RuntimeException
{
    public const USER_MESSAGE = 'Maaf, layanan email sedang mengalami gangguan. Silakan coba lagi nanti atau hubungi admin melalui chat.';
}
