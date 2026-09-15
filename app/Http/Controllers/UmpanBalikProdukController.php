<?php

namespace App\Http\Controllers;

use App\Models\UmpanBalikProduk;
use App\Services\ContextualFeedbackService;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class UmpanBalikProdukController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'category' => ['required', Rule::in(['bug', 'suggestion', 'content', 'payment', 'other'])],
            'message' => ['required', 'string', 'min:10', 'max:3000'],
            'page_url' => ['nullable', 'string', 'max:2048'],
        ]);

        UmpanBalikProduk::create([
            'user_id' => $request->user()->id,
            'role_snapshot' => $request->user()->role,
            'category' => $validated['category'],
            'message' => trim($validated['message']),
            'page_url' => $this->normalizePageUrl($validated['page_url'] ?? null),
            'user_agent' => str((string) $request->userAgent())->limit(500)->toString() ?: null,
            'status' => 'new',
        ]);

        return back()->with('success', 'Terima kasih. Laporan Anda sudah kami terima.');
    }

    public function storeContextual(Request $request, ContextualFeedbackService $contexts): JsonResponse
    {
        abort_unless(config('beta.contextual_feedback_enabled'), 404);

        $validated = $request->validate([
            'feature' => ['required', Rule::in(array_keys(ContextualFeedbackService::REASONS))],
            'context_id' => ['required', 'integer', 'min:1'],
            'response_type' => ['required', Rule::in(['submitted', 'skipped'])],
            'rating' => ['nullable', 'required_if:response_type,submitted', 'integer', 'between:1,5'],
            'reason' => ['nullable', 'string', 'max:40'],
            'message' => ['nullable', 'string', 'max:1000'],
            'page_url' => ['nullable', 'string', 'max:2048'],
        ]);

        $allowedReasons = ContextualFeedbackService::REASONS[$validated['feature']];
        if (filled($validated['reason'] ?? null) && ! in_array($validated['reason'], $allowedReasons, true)) {
            throw ValidationException::withMessages(['reason' => 'Alasan feedback tidak valid.']);
        }

        $context = $contexts->resolve($request->user(), $validated['feature'], (int) $validated['context_id']);

        try {
            $feedback = UmpanBalikProduk::query()->firstOrCreate(
                [
                    'user_id' => $request->user()->id,
                    'context_key' => $context['context_key'],
                ],
                [
                    'role_snapshot' => $request->user()->role,
                    'source' => 'contextual',
                    'feature' => $validated['feature'],
                    'context_type' => $context['context_type'],
                    'context_id' => $context['context_id'],
                    'trigger' => $context['trigger'],
                    'rating' => $validated['response_type'] === 'submitted' ? ($validated['rating'] ?? null) : null,
                    'reason' => $validated['response_type'] === 'submitted' ? ($validated['reason'] ?? null) : null,
                    'response_type' => $validated['response_type'],
                    'category' => 'experience',
                    'message' => $validated['response_type'] === 'submitted'
                        ? (trim((string) ($validated['message'] ?? '')) ?: null)
                        : null,
                    'page_url' => $this->normalizePageUrl($validated['page_url'] ?? null),
                    'user_agent' => str((string) $request->userAgent())->limit(500)->toString() ?: null,
                    'status' => $validated['response_type'] === 'skipped' ? 'dismissed' : 'new',
                ]
            );
        } catch (QueryException $exception) {
            if ((int) ($exception->errorInfo[1] ?? 0) !== 1062) {
                throw $exception;
            }

            $feedback = UmpanBalikProduk::query()
                ->where('user_id', $request->user()->id)
                ->where('context_key', $context['context_key'])
                ->firstOrFail();
        }

        return response()->json([
            'feedback' => [
                'id' => $feedback->id,
                'response_type' => $feedback->response_type,
            ],
            'idempotent' => ! $feedback->wasRecentlyCreated,
        ], $feedback->wasRecentlyCreated ? 201 : 200);
    }

    public function contextualStatus(Request $request, ContextualFeedbackService $contexts): JsonResponse
    {
        abort_unless(config('beta.contextual_feedback_enabled'), 404);

        $validated = $request->validate([
            'feature' => ['required', Rule::in(array_keys(ContextualFeedbackService::REASONS))],
            'context_id' => ['required', 'integer', 'min:1'],
        ]);
        $context = $contexts->resolve($request->user(), $validated['feature'], (int) $validated['context_id']);

        return response()->json([
            'recorded' => UmpanBalikProduk::query()
                ->where('user_id', $request->user()->id)
                ->where('context_key', $context['context_key'])
                ->exists(),
        ]);
    }

    private function normalizePageUrl(?string $pageUrl): ?string
    {
        $pageUrl = trim((string) $pageUrl);
        if ($pageUrl === '') {
            return null;
        }

        $path = parse_url($pageUrl, PHP_URL_PATH);
        if (! is_string($path) || ! str_starts_with($path, '/')) {
            return null;
        }

        return str($path)->limit(2048)->toString();
    }
}
