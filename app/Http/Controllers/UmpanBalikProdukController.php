<?php

namespace App\Http\Controllers;

use App\Models\UmpanBalikProduk;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

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
            'page_url' => $validated['page_url'] ?? null,
            'user_agent' => str((string) $request->userAgent())->limit(500)->toString() ?: null,
            'status' => 'new',
        ]);

        return back()->with('success', 'Terima kasih. Laporan Anda sudah kami terima.');
    }
}
