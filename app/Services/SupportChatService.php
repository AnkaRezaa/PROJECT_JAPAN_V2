<?php

namespace App\Services;

use App\Events\SupportChatUpdated;
use App\Models\SupportChat;
use App\Models\SupportChatMessage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cookie;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class SupportChatService
{
    public const COOKIE = 'support_chat_token';

    public const TOPICS = ['Kelas', 'Pembayaran', 'Kendala teknis', 'Lainnya'];

    public function visitorChat(Request $request): ?SupportChat
    {
        $token = $request->cookie(self::COOKIE);

        return is_string($token) && strlen($token) === 64
            ? SupportChat::query()->where('visitor_token_hash', hash('sha256', $token))->first()
            : null;
    }

    public function start(string $name, string $email): SupportChat
    {
        $token = Str::random(64);
        $chat = SupportChat::create([
            'visitor_token_hash' => hash('sha256', $token),
            'name' => $name,
            'email' => $email,
        ]);

        Cookie::queue(cookie(self::COOKIE, $token, 60 * 24 * 7, null, null, null, true, false, 'lax'));

        return $chat;
    }

    public function addMessage(SupportChat $chat, string $sender, string $body, ?int $adminId = null, ?string $topic = null): SupportChatMessage
    {
        $message = $chat->messages()->create([
            'admin_id' => $adminId,
            'sender' => $sender,
            'topic' => $topic,
            'body' => trim($body),
        ]);

        $chat->forceFill([
            'status' => 'open',
            'last_message_at' => $message->created_at,
            'unread_admin' => $sender === 'visitor' ? $chat->unread_admin + 1 : $chat->unread_admin,
            'unread_visitor' => $sender === 'admin' ? $chat->unread_visitor + 1 : $chat->unread_visitor,
        ])->save();

        try {
            event(new SupportChatUpdated($chat->id, $message->id));
        } catch (\Throwable $exception) {
            Log::warning('Support chat broadcast unavailable', ['chat_id' => $chat->id]);
        }

        return $message;
    }

    public function payload(SupportChat $chat, ?int $beforeId = null, int $limit = 50): array
    {
        $query = $chat->messages()->latest('id');
        if ($beforeId) {
            $query->where('id', '<', $beforeId);
        }
        $messages = $query->limit($limit)->get(['id', 'sender', 'topic', 'body', 'created_at'])->reverse()->values();
        $oldestId = $messages->first()?->id;

        return [
            'id' => $chat->id,
            'name' => $chat->name,
            'status' => $chat->status,
            'unread_visitor' => $chat->unread_visitor,
            'has_more' => $oldestId ? $chat->messages()->where('id', '<', $oldestId)->exists() : false,
            'messages' => $messages,
        ];
    }
}
