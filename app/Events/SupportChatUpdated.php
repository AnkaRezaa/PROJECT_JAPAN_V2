<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;

class SupportChatUpdated implements ShouldBroadcastNow
{
    use InteractsWithSockets;

    public function __construct(public int $chatId, public int $messageId)
    {
    }

    public function broadcastOn(): array
    {
        return [new PrivateChannel('support-chat.'.$this->chatId), new PrivateChannel('support-admin')];
    }

    public function broadcastAs(): string
    {
        return 'support.updated';
    }
}
