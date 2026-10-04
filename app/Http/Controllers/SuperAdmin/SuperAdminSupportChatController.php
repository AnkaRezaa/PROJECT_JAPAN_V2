<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Events\SupportChatUpdated;
use App\Models\SupportChat;
use App\Services\SupportChatService;
use App\Services\SupportQuickAnswers;
use App\Services\SupportWhatsAppSettings;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class SuperAdminSupportChatController extends SuperAdminDasarController
{
    public function index(Request $request, SupportWhatsAppSettings $settings, SupportQuickAnswers $quickAnswers): Response
    {
        $status = $request->string('status')->value();
        $search = trim($request->string('search')->value());

        return Inertia::render('SuperAdmin/Support/Index', [
            'chats' => SupportChat::query()
                ->when(in_array($status, ['open', 'closed'], true), fn ($query) => $query->where('status', $status))
                ->when($search, fn ($query) => $query->where(fn ($inner) => $inner->where('name', 'like', '%'.$search.'%')->orWhere('email', 'like', '%'.$search.'%')))
                ->orderByDesc('last_message_at')->paginate(20)->withQueryString()
                ->through(fn (SupportChat $chat) => $this->summary($chat)),
            'filters' => ['status' => $status, 'search' => $search],
            'selectedChatId' => (int) $request->input('chat', 0),
            'whatsapp' => $settings->publicStatus(),
            'quickAnswers' => $quickAnswers->get(),
        ]);
    }

    public function show(Request $request, SupportChat $chat, SupportChatService $service): JsonResponse
    {
        $chat->update(['unread_admin' => 0]);
        $beforeId = $request->integer('before_id') ?: null;

        return response()->json(['chat' => $service->payload($chat, $beforeId), 'email' => $chat->email]);
    }

    public function presence(): JsonResponse
    {
        Cache::put('support_admin_online', true, now()->addSeconds(65));

        return response()->json(['ok' => true]);
    }

    public function reply(Request $request, SupportChat $chat, SupportChatService $service): JsonResponse
    {
        $validated = $request->validate(['body' => ['required', 'string', 'min:2', 'max:2000']]);
        $service->addMessage($chat, 'admin', $validated['body'], $request->user()->id);

        return response()->json(['chat' => $service->payload($chat)], 201);
    }

    public function status(Request $request, SupportChat $chat): JsonResponse|RedirectResponse
    {
        $validated = $request->validate(['status' => ['required', Rule::in(['open', 'closed'])]]);
        $chat->update(['status' => $validated['status']]);
        try {
            event(new SupportChatUpdated($chat->id, 0));
        } catch (\Throwable) {
            Log::warning('Support chat status broadcast unavailable', ['chat_id' => $chat->id]);
        }

        if ($request->wantsJson() || $request->ajax()) {
            return response()->json(['ok' => true, 'status' => $chat->status]);
        }

        return back();
    }

    public function saveWhatsApp(Request $request, SupportWhatsAppSettings $settings): RedirectResponse
    {
        $validated = $request->validate([
            'enabled' => ['required', 'boolean'],
            'recipient' => ['nullable', 'regex:/^[1-9]\d{7,14}$/'],
        ]);
        if ($validated['enabled'] && blank($validated['recipient'] ?? null)) {
            return back()->withErrors(['recipient' => 'Nomor WhatsApp diperlukan untuk mengaktifkan tombol.']);
        }

        $settings->save([
            'enabled' => $validated['enabled'],
            'recipient' => $validated['recipient'] ?? '',
        ]);

        return back()->with('success', 'Nomor WhatsApp bantuan tersimpan.');
    }

    public function saveQuickAnswers(Request $request, SupportQuickAnswers $quickAnswers): RedirectResponse
    {
        $validated = $request->validate([
            'quick_answers' => ['present', 'array', 'max:8'],
            'quick_answers.*.question' => ['required', 'string', 'min:3', 'max:120'],
            'quick_answers.*.answer' => ['required', 'string', 'min:3', 'max:500'],
        ]);

        $quickAnswers->save(array_map(fn (array $item) => [
            'question' => trim($item['question']),
            'answer' => trim($item['answer']),
        ], array_values($validated['quick_answers'])));

        return back()->with('success', 'Jawaban cepat tersimpan.');
    }

    private function summary(SupportChat $chat): array
    {
        return [
            'id' => $chat->id,
            'name' => $chat->name,
            'email' => $chat->email,
            'status' => $chat->status,
            'unread_admin' => $chat->unread_admin,
            'last_message_at' => $chat->last_message_at?->toIso8601String(),
        ];
    }
}
