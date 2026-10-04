<?php

namespace App\Http\Controllers;

use App\Services\SupportChatService;
use App\Services\SupportQuickAnswers;
use App\Services\SupportWhatsAppSettings;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Illuminate\Validation\Rule;

class SupportChatController extends Controller
{
    public function state(Request $request, SupportChatService $service, SupportWhatsAppSettings $settings, SupportQuickAnswers $quickAnswers): JsonResponse
    {
        $chat = $service->visitorChat($request);

        return response()->json([
            'chat' => $chat ? $service->payload($chat) : null,
            'admin_online' => Cache::has('support_admin_online'),
            'topics' => SupportChatService::TOPICS,
            'quick_answers' => $quickAnswers->get(),
            'whatsapp_url' => $settings->publicUrl(),
        ]);
    }

    public function start(Request $request, SupportChatService $service): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:80'],
            'email' => ['required', 'email', 'max:254'],
            'body' => ['required', 'string', 'min:2', 'max:2000'],
            'topic' => ['required', Rule::in(SupportChatService::TOPICS)],
            'website' => ['nullable', 'string', 'max:0'],
        ]);

        $chat = $service->visitorChat($request) ?? $service->start(trim($validated['name']), strtolower(trim($validated['email'])));
        $service->addMessage($chat, 'visitor', $validated['body'], topic: $validated['topic']);

        return response()->json(['chat' => $service->payload($chat)], 201);
    }

    public function send(Request $request, SupportChatService $service): JsonResponse
    {
        $chat = $service->visitorChat($request);
        abort_unless($chat, 403);
        $validated = $request->validate([
            'body' => ['required', 'string', 'min:2', 'max:2000'],
            'topic' => ['required', Rule::in(SupportChatService::TOPICS)],
        ]);
        $service->addMessage($chat, 'visitor', $validated['body'], topic: $validated['topic']);

        return response()->json(['chat' => $service->payload($chat)], 201);
    }

    public function read(Request $request, SupportChatService $service): JsonResponse
    {
        $chat = $service->visitorChat($request);
        abort_unless($chat, 403);
        $chat->update(['unread_visitor' => 0]);

        return response()->json(['ok' => true]);
    }

    public function authorizeChannel(Request $request, SupportChatService $service): JsonResponse
    {
        $validated = $request->validate([
            'socket_id' => ['required', 'regex:/^\d+\.\d+$/'],
            'channel_name' => ['required', 'string', 'max:100'],
        ]);
        $channel = $validated['channel_name'];
        $user = $request->user();
        $isAdmin = $user?->role === 'superadmin' && $user->status !== 'suspended';

        if ($channel === 'private-support-admin') {
            abort_unless($isAdmin, 403);
        } elseif (preg_match('/^private-support-chat\.(\d+)$/', $channel, $matches)) {
            $chat = $service->visitorChat($request);
            abort_unless($isAdmin || ($chat && $chat->id === (int) $matches[1]), 403);
        } else {
            abort(403);
        }

        $key = config('broadcasting.connections.reverb.key');
        $secret = config('broadcasting.connections.reverb.secret');
        if (! $key || ! $secret) {
            Log::warning('Support chat Reverb is not configured');
            return response()->json(['message' => 'Realtime belum tersedia.'], 503);
        }

        return response()->json([
            'auth' => $key.':'.hash_hmac('sha256', $validated['socket_id'].':'.$channel, $secret),
        ]);
    }
}
