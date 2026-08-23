<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Models\AnggotaKloter;
use App\Models\KloterBelajar;
use App\Models\KodeAkses;
use App\Models\Pengguna;
use App\Models\ProgramPembelajaran;
use App\Models\Progres;
use App\Services\AksesLanggananService;
use App\Services\KloterBelajarService;
use App\Services\NotifikasiPenggunaService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class SuperAdminKloterController extends SuperAdminDasarController
{
    public function __invoke(Request $request)
    {
        $filters = [
            'search' => (string) $request->string('search'),
            'status' => $request->string('status')->value() ?: 'active',
            'program' => $request->integer('program') ?: null,
        ];

        $kloters = KloterBelajar::query()
            ->with(['programPembelajaran:id,title', 'admin:id,username,email'])
            ->withCount(['anggota as anggota_aktif_count' => fn ($query) => $query->where('status', 'active')])
            ->when($filters['search'], function ($query, $search) {
                $query->where(function ($inner) use ($search) {
                    $inner->where('nama', 'like', "%{$search}%")
                        ->orWhere('kode', 'like', "%{$search}%")
                        ->orWhereHas('programPembelajaran', fn ($programQuery) => $programQuery->where('title', 'like', "%{$search}%"))
                        ->orWhereHas('admin', fn ($adminQuery) => $adminQuery
                            ->where('username', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%"));
                });
            })
            ->when($filters['status'] !== 'all', fn ($query) => $query->where('status', $filters['status']))
            ->when($filters['program'], fn ($query, $programId) => $query->where('program_pembelajaran_id', $programId))
            ->orderByDesc('is_default')
            ->orderByDesc('tanggal_mulai')
            ->paginate(8)
            ->withQueryString();

        $fallbackSelectedId = $kloters->getCollection()->first()?->id;
        $selectedKloter = KloterBelajar::query()
            ->with([
                'programPembelajaran:id,title',
                'admin:id,username,email',
                'anggota.user:id,username,email',
                'anggota.subscription:id,end_date,status',
                'accessKeys' => fn ($query) => $query->latest()->take(8),
            ])
            ->withCount(['anggota as anggota_aktif_count' => fn ($query) => $query->where('status', 'active')])
            ->find($request->integer('selected') ?: $fallbackSelectedId);

        return Inertia::render('SuperAdmin/Kloter/Kloter', [
            'stats' => [
                $this->stat('Kloter Aktif', number_format(KloterBelajar::where('status', 'active')->count()), 'K'),
                $this->stat('Siswa Dalam Kloter', number_format(AnggotaKloter::where('status', 'active')->distinct('user_id')->count('user_id')), 'U'),
                $this->stat('Key Aktif', number_format(KodeAkses::whereNotNull('kloter_belajar_id')->where('status', 'active')->count()), 'A'),
                $this->stat('Belum Kloter', number_format($this->userBelumKloterCount()), 'B', '0', 'down'),
            ],
            'kloterStatusDistribution' => KloterBelajar::query()
                ->selectRaw('status, COUNT(*) as total')
                ->groupBy('status')
                ->get()
                ->map(fn (KloterBelajar $kloter) => [
                    'label' => match ($kloter->status) {
                        'active' => 'Aktif',
                        'draft' => 'Draft',
                        'archived' => 'Arsip',
                        default => ucfirst($kloter->status),
                    },
                    'value' => (int) $kloter->total,
                    'fill' => match ($kloter->status) {
                        'active' => 'var(--color-active)',
                        'draft' => 'var(--color-draft)',
                        default => 'var(--color-archived)',
                    },
                ])
                ->values(),
            'enrollmentByKloter' => KloterBelajar::query()
                ->withCount(['anggota as active_members_count' => fn ($query) => $query->where('status', 'active')])
                ->orderByDesc('active_members_count')
                ->take(8)
                ->get(['id', 'nama'])
                ->map(fn (KloterBelajar $kloter) => [
                    'label' => $kloter->nama,
                    'value' => (int) $kloter->active_members_count,
                ])
                ->values(),
            'kloters' => $kloters->through(fn (KloterBelajar $kloter) => $this->kloterPayload($kloter)),
            'selectedKloter' => $selectedKloter ? $this->selectedKloterPayload($selectedKloter) : null,
            'programs' => ProgramPembelajaran::where('status', 'published')
                ->orderBy('sort_order')
                ->orderBy('title')
                ->get(['id', 'title'])
                ->map(fn (ProgramPembelajaran $program) => ['id' => $program->id, 'title' => $program->title]),
            'admins' => Pengguna::where('role', 'admin')
                ->where('status', 'active')
                ->orderBy('username')
                ->get(['id', 'username', 'email'])
                ->map(fn (Pengguna $admin) => ['id' => $admin->id, 'label' => "{$admin->username} ({$admin->email})"]),
            'users' => Pengguna::where('role', 'user')
                ->where('status', 'active')
                ->orderBy('username')
                ->get(['id', 'username', 'email'])
                ->map(fn (Pengguna $user) => ['id' => $user->id, 'label' => "{$user->username} ({$user->email})"]),
            'filters' => $filters,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $this->validateKloter($request);

        $kloter = DB::transaction(function () use ($request, $validated) {
            if ($validated['is_default'] ?? false) {
                $this->resetDefaultKloter((int) $validated['program_pembelajaran_id']);
            }

            $kloter = KloterBelajar::create([
                ...$validated,
                'kode' => $this->generateKloterCode(),
                'status' => $validated['status'] ?? 'active',
            ]);

            $this->logActivity($request, 'kloter.created', 'kloter_belajar', $kloter->id, "Membuat kloter {$kloter->nama}");

            return $kloter;
        });

        return redirect()->route('superadmin.kloters', ['selected' => $kloter->id])->with('success', 'Kloter berhasil dibuat.');
    }

    public function update(Request $request, KloterBelajar $kloter)
    {
        $validated = $this->validateKloter($request);

        DB::transaction(function () use ($request, $kloter, $validated) {
            if ($validated['is_default'] ?? false) {
                $this->resetDefaultKloter((int) $validated['program_pembelajaran_id'], $kloter->id);
            }

            $kloter->update($validated);

            $this->logActivity($request, 'kloter.updated', 'kloter_belajar', $kloter->id, "Mengubah kloter {$kloter->nama}");
        });

        return redirect()->route('superadmin.kloters', ['selected' => $kloter->id])->with('success', 'Kloter berhasil diperbarui.');
    }

    public function archive(Request $request, KloterBelajar $kloter)
    {
        $kloter->update(['status' => 'archived', 'is_default' => false]);

        $this->logActivity($request, 'kloter.archived', 'kloter_belajar', $kloter->id, "Mengarsipkan kloter {$kloter->nama}");

        return redirect()->route('superadmin.kloters')->with('success', 'Kloter berhasil diarsipkan.');
    }

    public function destroy(Request $request, KloterBelajar $kloter)
    {
        $kloterId = $kloter->id;
        $kloterName = $kloter->nama;

        DB::transaction(function () use ($request, $kloter, $kloterId, $kloterName) {
            $kloter->delete();

            $this->logActivity($request, 'kloter.deleted', 'kloter_belajar', $kloterId, "Menghapus kloter {$kloterName}");
        });

        return redirect()->route('superadmin.kloters')->with('success', 'Kloter berhasil dihapus.');
    }

    public function assignUser(Request $request, KloterBelajar $kloter, KloterBelajarService $kloterService)
    {
        $validated = $request->validate([
            'user_id' => ['required', 'exists:users,id'],
            'catatan' => ['nullable', 'string', 'max:1000'],
        ]);

        $user = Pengguna::where('role', 'user')->findOrFail($validated['user_id']);
        $subscription = $user->subscriptions()
            ->where('status', 'active')
            ->where(function ($query) use ($kloter) {
                $query->where('scope_type', AksesLanggananService::SCOPE_GLOBAL)
                    ->orWhere(function ($programQuery) use ($kloter) {
                        $programQuery->where('scope_type', AksesLanggananService::SCOPE_PROGRAM)
                            ->where('program_pembelajaran_id', $kloter->program_pembelajaran_id);
                    });
            })
            ->latest('end_date')
            ->first();

        $kloterService->assignUser(
            $user,
            $kloter,
            $subscription,
            null,
            null,
            $validated['catatan'] ?? 'Ditambahkan manual oleh superadmin.'
        );

        $this->notifyKloterAdmin(
            $request,
            $kloter,
            'kloter_member_assigned',
            'Peserta ditambahkan ke kloter',
            "{$user->username} ditambahkan ke {$kloter->nama} oleh superadmin.",
            ['kloter_id' => $kloter->id, 'user_id' => $user->id, 'source' => 'superadmin'],
        );

        if (! $kloterService->masihAdaKapasitas($kloter)) {
            $this->notifyKloterAdmin(
                $request,
                $kloter,
                'kloter_full',
                'Kloter sudah penuh',
                "Kapasitas {$kloter->nama} sudah penuh. Periksa peserta atau kapasitas sebelum menerima pendaftaran baru.",
                ['kloter_id' => $kloter->id, 'source' => 'superadmin'],
            );
        }

        $this->logActivity($request, 'kloter.user_assigned', 'kloter_belajar', $kloter->id, "Menambahkan {$user->username} ke kloter {$kloter->nama}");

        return redirect()->route('superadmin.kloters', ['selected' => $kloter->id])->with('success', 'User berhasil dimasukkan ke kloter.');
    }

    public function removeUser(Request $request, KloterBelajar $kloter, Pengguna $user)
    {
        AnggotaKloter::where('kloter_belajar_id', $kloter->id)
            ->where('user_id', $user->id)
            ->update(['status' => 'removed']);

        $this->notifyKloterAdmin(
            $request,
            $kloter,
            'kloter_member_removed',
            'Peserta dikeluarkan dari kloter',
            "{$user->username} dikeluarkan dari {$kloter->nama} oleh superadmin.",
            ['kloter_id' => $kloter->id, 'user_id' => $user->id, 'source' => 'superadmin'],
        );

        $this->logActivity($request, 'kloter.user_removed', 'kloter_belajar', $kloter->id, "Mengeluarkan {$user->username} dari kloter {$kloter->nama}");

        return redirect()->route('superadmin.kloters', ['selected' => $kloter->id])->with('success', 'User berhasil dikeluarkan dari kloter.');
    }

    public function generateAccessKey(Request $request, KloterBelajar $kloter)
    {
        $validated = $request->validate([
            'name' => ['nullable', 'string', 'max:255'],
            'duration_days' => ['required', 'integer', 'min:1', 'max:366'],
            'max_uses' => ['required', 'integer', 'min:1', 'max:500'],
            'expires_at' => ['nullable', 'date', 'after:now'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $kloter->loadMissing('programPembelajaran');
        $plan = app(AksesLanggananService::class)->accessKeyPlanForProgram($kloter->programPembelajaran);

        $accessKey = KodeAkses::create([
            'payment_plan_id' => $plan->id,
            'scope_type' => AksesLanggananService::SCOPE_PROGRAM,
            'program_pembelajaran_id' => $kloter->program_pembelajaran_id,
            'kloter_belajar_id' => $kloter->id,
            'created_by' => $request->user()->id,
            'code' => $this->generateAccessCode(),
            'name' => $validated['name'] ?: "Access {$kloter->nama}",
            'duration_days' => $validated['duration_days'],
            'max_uses' => $validated['max_uses'],
            'expires_at' => $validated['expires_at'] ?? null,
            'notes' => $validated['notes'] ?? null,
            'status' => 'active',
        ]);

        $this->logActivity($request, 'kloter.access_key_created', 'access_key', $accessKey->id, "Membuat access key {$accessKey->code} untuk {$kloter->nama}");

        return redirect()->route('superadmin.kloters', ['selected' => $kloter->id])->with('success', 'Access key kloter berhasil dibuat.');
    }

    private function validateKloter(Request $request): array
    {
        return $request->validate([
            'program_pembelajaran_id' => ['required', 'exists:program_pembelajaran,id'],
            'admin_id' => [
                'nullable',
                Rule::exists('users', 'id')->where(fn ($query) => $query
                    ->where('role', 'admin')
                    ->where('status', 'active')),
            ],
            'nama' => ['required', 'string', 'max:255'],
            'tanggal_mulai' => ['required', 'date'],
            'tanggal_selesai' => ['nullable', 'date', 'after_or_equal:tanggal_mulai'],
            'max_siswa' => ['nullable', 'integer', 'min:1', 'max:500'],
            'is_default' => ['boolean'],
            'status' => ['required', Rule::in(['active', 'draft', 'archived'])],
            'catatan' => ['nullable', 'string', 'max:1000'],
        ]);
    }

    private function kloterPayload(KloterBelajar $kloter): array
    {
        return [
            'id' => $kloter->id,
            'nama' => $kloter->nama,
            'kode' => $kloter->kode,
            'program_name' => $kloter->programPembelajaran?->title,
            'admin_name' => $kloter->admin?->username,
            'tanggal_mulai' => optional($kloter->tanggal_mulai)->format('Y-m-d'),
            'tanggal_mulai_label' => optional($kloter->tanggal_mulai)->format('d M Y'),
            'tanggal_selesai' => optional($kloter->tanggal_selesai)->format('Y-m-d'),
            'max_siswa' => $kloter->max_siswa,
            'anggota_aktif_count' => $kloter->anggota_aktif_count,
            'kapasitas_label' => $kloter->max_siswa ? "{$kloter->anggota_aktif_count}/{$kloter->max_siswa}" : "{$kloter->anggota_aktif_count}/-",
            'is_default' => (bool) $kloter->is_default,
            'status' => $kloter->status,
        ];
    }

    private function selectedKloterPayload(KloterBelajar $kloter): array
    {
        $moduleIds = $kloter->programPembelajaran?->modules()->where('status', 'published')->pluck('id') ?? collect();
        $totalModules = $moduleIds->count();
        $userIds = $kloter->anggota->pluck('user_id')->filter()->values();
        $progressByUser = Progres::query()
            ->whereIn('user_id', $userIds)
            ->whereIn('module_id', $moduleIds)
            ->selectRaw('user_id, COUNT(DISTINCT module_id) as total_done')
            ->groupBy('user_id')
            ->pluck('total_done', 'user_id');

        return $this->kloterPayload($kloter) + [
            'program_pembelajaran_id' => $kloter->program_pembelajaran_id,
            'admin_id' => $kloter->admin_id,
            'catatan' => $kloter->catatan,
            'anggota' => $kloter->anggota
                ->sortByDesc('joined_at')
                ->values()
                ->map(fn (AnggotaKloter $anggota) => [
                    'id' => $anggota->id,
                    'user_id' => $anggota->user_id,
                    'user_name' => $anggota->user?->username,
                    'user_email' => $anggota->user?->email,
                    'status' => $anggota->status,
                    'joined_at' => optional($anggota->joined_at)->format('d M Y H:i'),
                    'subscription_until' => optional($anggota->subscription?->end_date)->format('d M Y'),
                    'progress_done' => (int) ($progressByUser[$anggota->user_id] ?? 0),
                    'progress_total' => $totalModules,
                    'progress_percent' => $totalModules > 0
                        ? (int) round(((int) ($progressByUser[$anggota->user_id] ?? 0) / $totalModules) * 100)
                        : 0,
                ]),
            'access_keys' => $kloter->accessKeys->map(fn (KodeAkses $key) => [
                'id' => $key->id,
                'code' => $key->code,
                'name' => $key->name,
                'usage' => "{$key->used_count}/{$key->max_uses}",
                'duration_days' => $key->duration_days,
                'status' => $key->status,
                'expires_at' => optional($key->expires_at)->format('d M Y H:i'),
            ]),
        ];
    }

    private function resetDefaultKloter(int $programPembelajaranId, ?int $exceptId = null): void
    {
        KloterBelajar::where('program_pembelajaran_id', $programPembelajaranId)
            ->when($exceptId, fn ($query) => $query->where('id', '!=', $exceptId))
            ->update(['is_default' => false]);
    }

    private function notifyKloterAdmin(
        Request $request,
        KloterBelajar $kloter,
        string $type,
        string $title,
        string $message,
        array $meta,
    ): void {
        $kloter->loadMissing('admin:id,username,email,role,status');
        $mentor = $kloter->admin;

        if (! $mentor || $mentor->role !== 'admin' || $mentor->status !== 'active' || $mentor->is($request->user())) {
            return;
        }

        app(NotifikasiPenggunaService::class)->kirimKePengguna(
            $mentor,
            $type,
            $title,
            $message,
            route('admin.users', ['kloter' => $kloter->id]),
            $meta,
            'access',
            $type === 'kloter_full' ? 'warning' : 'info',
            false,
        );
    }

    private function userBelumKloterCount(): int
    {
        return Pengguna::where('role', 'user')
            ->whereHas('subscriptions', fn ($query) => $query->where('status', 'active'))
            ->whereDoesntHave('anggotaKloter', fn ($query) => $query->where('status', 'active'))
            ->count();
    }

    private function generateKloterCode(): string
    {
        do {
            $code = 'KLT-'.strtoupper(Str::random(6));
        } while (KloterBelajar::where('kode', $code)->exists());

        return $code;
    }

    private function generateAccessCode(): string
    {
        do {
            $code = 'JL-'.strtoupper(Str::random(4)).'-'.strtoupper(Str::random(4));
        } while (KodeAkses::where('code', $code)->exists());

        return $code;
    }
}
