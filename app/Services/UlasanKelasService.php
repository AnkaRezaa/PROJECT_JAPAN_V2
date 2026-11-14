<?php

namespace App\Services;

use App\Models\Pengguna;
use App\Models\ProgramPembelajaran;
use App\Models\ProgresHariModul;
use App\Models\UlasanKelas;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class UlasanKelasService
{
    public function __construct(private readonly AksesPremiumService $access) {}

    public function blockedReason(?Pengguna $user, ProgramPembelajaran $program): ?string
    {
        if (! $user) {
            return 'Masuk untuk menulis ulasan.';
        }
        if ($user->role !== 'user' || $user->status !== 'active') {
            return 'Hanya siswa aktif yang dapat menulis ulasan.';
        }
        if (! $this->access->punyaAksesKelas($user, $program->id)) {
            return 'Akses penuh kelas diperlukan untuk menulis ulasan.';
        }
        $hasLearned = ProgresHariModul::query()->where('user_id', $user->id)->whereNotNull('completed_at')
            ->whereHas('day.module', fn ($query) => $query->where('program_pembelajaran_id', $program->id))->exists();

        return $hasLearned ? null : 'Selesaikan satu Hari untuk menulis ulasan.';
    }

    public function pageData(Request $request, ProgramPembelajaran $program): array
    {
        $filters = $request->validate([
            'rating' => ['nullable', 'integer', 'between:1,5'],
            'sort' => ['nullable', 'in:newest,highest,lowest'],
        ]);
        $sort = $filters['sort'] ?? 'newest';
        $base = UlasanKelas::query()->where('program_pembelajaran_id', $program->id)->where('status', 'published');
        $distribution = (clone $base)->selectRaw('rating, COUNT(*) as total')->groupBy('rating')->pluck('total', 'rating');
        $count = (int) $distribution->sum();
        $sum = $distribution->sum(fn ($total, $rating) => (int) $rating * (int) $total);
        $reviews = (clone $base)->with('user:id,username')
            ->when($filters['rating'] ?? null, fn ($query, $rating) => $query->where('rating', $rating))
            ->when($sort !== 'newest', fn ($query) => $query->orderBy('rating', $sort === 'highest' ? 'desc' : 'asc'))
            ->orderByDesc('updated_at')->orderByDesc('id')
            ->paginate(10)->withQueryString()->through(fn (UlasanKelas $review) => [
                'id' => $review->id, 'username' => $review->user->username,
                'rating' => $review->rating, 'comment' => $review->comment,
                'updated_at' => $review->updated_at->toIso8601String(),
            ]);
        $own = $request->user() ? UlasanKelas::query()->where('program_pembelajaran_id', $program->id)
            ->where('user_id', $request->user()->id)->first() : null;
        $reason = $this->blockedReason($request->user(), $program);

        return [
            'program' => $program->only(['id', 'slug', 'title']),
            'reviews' => $reviews,
            'summary' => [
                'count' => $count, 'average' => $count ? round($sum / $count, 1) : null,
                'distribution' => collect(range(5, 1))->map(fn ($rating) => ['rating' => $rating, 'count' => (int) ($distribution[$rating] ?? 0)])->all(),
            ],
            'filters' => ['rating' => $filters['rating'] ?? '', 'sort' => $sort],
            'ownReview' => $own?->only(['id', 'rating', 'comment', 'status']),
            'canReview' => $reason === null,
            'reviewBlockedReason' => $reason,
        ];
    }

    public function save(Pengguna $user, ProgramPembelajaran $program, array $data): void
    {
        DB::transaction(function () use ($user, $program, $data) {
            // Serialize this author's writes without locking the class for all students.
            $lockedUser = Pengguna::whereKey($user->id)->lockForUpdate()->firstOrFail();
            abort_if($this->blockedReason($lockedUser, $program) !== null, 403);
            $review = UlasanKelas::withTrashed()->where('user_id', $user->id)->where('program_pembelajaran_id', $program->id)->first() ?? new UlasanKelas;
            if (! $review->exists) {
                $review->user_id = $user->id;
                $review->program_pembelajaran_id = $program->id;
                $review->status = 'published';
            }
            $review->fill(['rating' => $data['rating'], 'comment' => filled($data['comment'] ?? null) ? trim($data['comment']) : null]);
            if ($review->trashed()) {
                $review->restore();
            } else {
                $review->save();
            }
        });
    }

    public function remove(Pengguna $user, ProgramPembelajaran $program): void
    {
        DB::transaction(function () use ($user, $program) {
            Pengguna::whereKey($user->id)->lockForUpdate()->firstOrFail();
            $review = UlasanKelas::query()->where('user_id', $user->id)->where('program_pembelajaran_id', $program->id)->first();
            if ($review) {
                // Remove user content while retaining the pair's moderation decision.
                $review->forceFill(['rating' => null, 'comment' => null])->save();
                $review->delete();
            }
        });
    }
}
