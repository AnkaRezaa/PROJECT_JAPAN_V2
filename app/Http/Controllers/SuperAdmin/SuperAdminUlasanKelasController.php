<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Models\ProgramPembelajaran;
use App\Models\UlasanKelas;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class SuperAdminUlasanKelasController extends SuperAdminDasarController
{
    public function index(Request $request)
    {
        $filters = $request->validate([
            'program_id' => ['nullable', 'integer', 'exists:program_pembelajaran,id'],
            'status' => ['nullable', 'in:published,hidden'],
        ]);
        $reviews = UlasanKelas::query()->with(['user:id,username', 'program:id,title'])
            ->when($filters['program_id'] ?? null, fn ($query, $id) => $query->where('program_pembelajaran_id', $id))
            ->when($filters['status'] ?? null, fn ($query, $status) => $query->where('status', $status))
            ->latest('updated_at')->orderByDesc('id')->paginate(15)->withQueryString()
            ->through(fn (UlasanKelas $review) => [
                'id' => $review->id, 'username' => $review->user->username, 'program_title' => $review->program->title,
                'rating' => $review->rating, 'comment' => $review->comment, 'status' => $review->status,
                'moderation_reason' => $review->moderation_reason, 'updated_at' => $review->updated_at->toIso8601String(),
            ]);

        return Inertia::render('SuperAdmin/Konten/Ulasan', [
            'reviews' => $reviews, 'filters' => $filters,
            'programs' => ProgramPembelajaran::orderBy('title')->get(['id', 'title']),
        ]);
    }

    public function update(Request $request, UlasanKelas $review)
    {
        $data = $request->validate(['status' => ['required', 'in:published,hidden'], 'reason' => ['required', 'string', 'max:1000']]);
        DB::transaction(function () use ($request, $review, $data) {
            $locked = UlasanKelas::whereKey($review->id)->lockForUpdate()->firstOrFail();
            $locked->forceFill([
                'status' => $data['status'], 'moderation_reason' => $data['reason'],
                'moderated_by' => $request->user()->id, 'moderated_at' => now(),
            ])->save();
            $this->logActivity($request, 'moderate_course_review', 'course_review', $locked->id, $data['reason'], ['status' => $data['status']]);
        });

        return back()->with('success', 'Status ulasan diperbarui.');
    }
}
