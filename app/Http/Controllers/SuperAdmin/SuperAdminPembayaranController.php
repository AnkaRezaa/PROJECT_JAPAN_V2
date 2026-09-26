<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Models\KloterBelajar;
use App\Models\KodeAkses;
use App\Models\Langganan;
use App\Models\LogTransaksi;
use App\Models\PaketPembayaran;
use App\Models\Pengguna;
use App\Models\ProgramPembelajaran;
use App\Models\Transaksi;
use App\Services\AksesLanggananService;
use App\Services\ChartDataService;
use App\Services\KloterBelajarService;
use App\Services\NotifikasiPenggunaService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class SuperAdminPembayaranController extends SuperAdminDasarController
{
    public function __invoke(Request $request, ChartDataService $chartData)
    {
        $filters = [
            'search' => (string) $request->string('search'),
            'status' => $request->string('status')->value() ?: 'all',
            'payment_method' => $request->string('payment_method')->value() ?: 'all',
        ];
        $period = $chartData->resolvePeriod($request);
        $fromDate = $chartData->fromDate($period);

        $revenueByDay = Transaksi::query()
            ->where('status', 'success')
            ->whereRaw('COALESCE(processed_at, created_at) >= ?', [$fromDate])
            ->selectRaw('DATE(COALESCE(processed_at, created_at)) as day, SUM(amount) as revenue, COUNT(*) as transactions')
            ->groupBy('day')
            ->get()
            ->keyBy('day');

        $transactions = Transaksi::with([
            'user:id,username,email',
            'paymentPlan:id,name',
            'programPembelajaran:id,title',
            'kloterBelajar:id,nama',
            'anggotaKloter:id,transaction_id,status',
        ])
            ->when($filters['search'], function ($query, $search) {
                $query->where(function ($inner) use ($search) {
                    $inner->where('transaction_code', 'like', "%{$search}%")
                        ->orWhereHas('user', fn ($userQuery) => $userQuery
                            ->where('username', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%"));
                });
            })
            ->when($filters['status'] !== 'all', fn ($query) => $query->where('status', $filters['status']))
            ->when($filters['payment_method'] !== 'all', fn ($query) => $query->where('payment_method', $filters['payment_method']))
            ->latest()
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('SuperAdmin/Pemasukan/Pemasukan', [
            'stats' => [
                $this->stat('Pending Payments', number_format(Transaksi::where('status', 'pending')->count()), 'P'),
                $this->stat('Success Transactions', number_format(Transaksi::where('status', 'success')->count()), 'S'),
                $this->stat('Active Premium Users', number_format(Langganan::where('status', 'active')->distinct('user_id')->count('user_id')), 'U'),
                $this->stat('Revenue', 'Rp '.number_format((int) Transaksi::where('status', 'success')->sum('amount')), '$'),
            ],
            'revenueSeries' => $chartData->dailySeries($period, [
                'revenue' => $revenueByDay->mapWithKeys(fn (Transaksi $transaction) => [$transaction->day => (int) $transaction->revenue]),
                'transactions' => $revenueByDay->mapWithKeys(fn (Transaksi $transaction) => [$transaction->day => (int) $transaction->transactions]),
            ]),
            'transactionStatusDistribution' => Transaksi::query()
                ->selectRaw('status, COUNT(*) as total')
                ->groupBy('status')
                ->get()
                ->map(fn (Transaksi $transaction) => [
                    'label' => ucfirst($transaction->status),
                    'value' => (int) $transaction->total,
                    'fill' => match ($transaction->status) {
                        'success' => 'var(--color-success)',
                        'pending' => 'var(--color-pending)',
                        default => 'var(--color-failed)',
                    },
                ])
                ->values(),
            'paymentMethodDistribution' => Transaksi::query()
                ->selectRaw("COALESCE(NULLIF(payment_method, ''), 'unknown') as method, COUNT(*) as total")
                ->groupBy('method')
                ->orderByDesc('total')
                ->take(6)
                ->get()
                ->map(fn (Transaksi $transaction, int $index) => [
                    'label' => str($transaction->method)->replace('_', ' ')->title()->toString(),
                    'value' => (int) $transaction->total,
                    'chart_key' => "method-{$index}",
                    'color' => ['#dc2626', '#f97316', '#0ea5e9', '#10b981', '#8b5cf6', '#64748b'][$index % 6],
                    'fill' => "var(--color-method-{$index})",
                ])
                ->values(),
            'transactions' => $transactions->through(fn (Transaksi $transaction) => [
                'id' => $transaction->id,
                'transaction_code' => $transaction->transaction_code,
                'user_name' => $transaction->user?->username ?? '-',
                'user_email' => $transaction->user?->email ?? '-',
                'payment_plan_id' => $transaction->payment_plan_id,
                'plan_name' => $transaction->paymentPlan?->name ?? '-',
                'scope_type' => $transaction->scope_type ?? AksesLanggananService::SCOPE_GLOBAL,
                'scope_label' => app(AksesLanggananService::class)->labelScope($transaction->scope_type, $transaction->programPembelajaran?->title),
                'program_name' => $transaction->programPembelajaran?->title,
                'kloter_name' => $transaction->kloterBelajar?->nama,
                'amount' => $transaction->amount,
                'amount_formatted' => 'Rp '.number_format($transaction->amount),
                'payment_method' => $transaction->payment_method,
                'status' => $transaction->status,
                'access_state' => $this->transactionAccessState($transaction),
                'notes' => $transaction->notes,
                'processed_at' => optional($transaction->processed_at)->diffForHumans(),
                'created_at' => optional($transaction->created_at)->format('d M Y H:i'),
                'proof_url' => $transaction->proof_of_payment_path ? asset("storage/{$transaction->proof_of_payment_path}") : null,
            ]),
            'plans' => PaketPembayaran::query()
                ->with('programPembelajaran:id,title')
                ->orderBy('price')
                ->get(['id', 'name', 'slug', 'scope_type', 'program_pembelajaran_id', 'description', 'price', 'duration_days', 'features', 'is_active'])
                ->map(fn (PaketPembayaran $plan) => [
                    'id' => $plan->id,
                    'name' => $plan->name,
                    'slug' => $plan->slug,
                    'scope_type' => $plan->scope_type ?? AksesLanggananService::SCOPE_GLOBAL,
                    'program_pembelajaran_id' => $plan->program_pembelajaran_id,
                    'scope_label' => app(AksesLanggananService::class)->labelScope($plan->scope_type, $plan->programPembelajaran?->title),
                    'program_name' => $plan->programPembelajaran?->title,
                    'description' => $plan->description,
                    'price' => $plan->price,
                    'price_formatted' => 'Rp '.number_format($plan->price),
                    'duration_days' => $plan->duration_days,
                    'features' => collect($plan->features ?? [])->implode("\n"),
                    'is_active' => $plan->is_active,
                    'is_legacy' => ($plan->scope_type ?? AksesLanggananService::SCOPE_GLOBAL) === AksesLanggananService::SCOPE_GLOBAL,
                ]),
            'users' => Pengguna::where('role', 'user')->orderBy('username')->get(['id', 'username', 'email'])->map(fn (Pengguna $user) => [
                'id' => $user->id,
                'label' => "{$user->username} ({$user->email})",
            ]),
            'programs' => ProgramPembelajaran::query()
                ->where('status', 'published')
                ->orderBy('sort_order')
                ->orderBy('title')
                ->get(['id', 'title'])
                ->map(fn (ProgramPembelajaran $program) => [
                    'id' => $program->id,
                    'title' => $program->title,
                ]),
            'kloters' => KloterBelajar::query()
                ->with(['programPembelajaran:id,title', 'admin:id,username'])
                ->where('status', 'active')
                ->whereNotNull('admin_id')
                ->orderBy('tanggal_mulai')
                ->get()
                ->map(fn (KloterBelajar $kloter) => [
                    'id' => $kloter->id,
                    'program_id' => $kloter->program_pembelajaran_id,
                    'name' => $kloter->nama,
                    'mentor_name' => $kloter->admin?->username,
                ]),
            'accessKeys' => KodeAkses::with(['paymentPlan:id,name', 'programPembelajaran:id,title', 'kloterBelajar:id,nama,kode'])
                ->latest()
                ->take(12)
                ->get()
                ->map(fn (KodeAkses $key) => [
                    'id' => $key->id,
                    'code' => $key->code,
                    'name' => $key->name,
                    'plan_name' => $key->paymentPlan?->name ?? 'Access Key Premium',
                    'scope_type' => $key->scope_type ?? AksesLanggananService::SCOPE_GLOBAL,
                    'scope_label' => app(AksesLanggananService::class)->labelScope($key->scope_type, $key->programPembelajaran?->title),
                    'program_name' => $key->programPembelajaran?->title,
                    'kloter_name' => $key->kloterBelajar?->nama,
                    'duration_days' => $key->duration_days,
                    'usage' => "{$key->used_count}/{$key->max_uses}",
                    'status' => $key->status,
                    'expires_at' => optional($key->expires_at)->format('d M Y H:i'),
                    'created_at' => optional($key->created_at)->format('d M Y H:i'),
                ]),
            'filters' => [...$filters, 'period' => $period],
        ]);
    }

    public function storePlan(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['required', 'string', 'max:255', 'unique:payment_plans,slug'],
            'description' => ['nullable', 'string', 'max:500'],
            'price' => ['required', 'integer', 'min:0'],
            'duration_days' => ['required', 'integer', 'min:1'],
            'scope_type' => ['required', Rule::in([AksesLanggananService::SCOPE_PROGRAM, AksesLanggananService::SCOPE_KLOTER])],
            'program_pembelajaran_id' => [
                'required',
                'exists:program_pembelajaran,id',
            ],
            'features' => ['nullable', 'string'],
            'is_active' => ['required', 'boolean'],
        ]);

        $scope = app(AksesLanggananService::class)->normalizeScope(
            $validated['scope_type'],
            $validated['program_pembelajaran_id'] ?? null
        );
        $this->assertSingleActiveMode($scope, (bool) ($validated['is_active'] ?? false));

        $plan = PaketPembayaran::create([
            ...$validated,
            ...$scope,
            'features' => $validated['features']
                ? collect(explode("\n", $validated['features']))->map(fn ($item) => trim($item))->filter()->values()->all()
                : [],
        ]);

        $this->logActivity($request, 'payment.plan_created', 'payment_plan', $plan->id, "Membuat payment plan {$plan->name}");

        return redirect()->back()->with('success', 'Payment plan berhasil dibuat');
    }

    public function updatePlan(Request $request, PaketPembayaran $plan)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['required', 'string', 'max:255', Rule::unique('payment_plans', 'slug')->ignore($plan->id)],
            'description' => ['nullable', 'string', 'max:500'],
            'price' => ['required', 'integer', 'min:0'],
            'duration_days' => ['required', 'integer', 'min:1'],
            'scope_type' => ['required', Rule::in([AksesLanggananService::SCOPE_PROGRAM, AksesLanggananService::SCOPE_KLOTER])],
            'program_pembelajaran_id' => [
                'required',
                'exists:program_pembelajaran,id',
            ],
            'features' => ['nullable', 'string'],
            'is_active' => ['required', 'boolean'],
        ]);

        $scope = app(AksesLanggananService::class)->normalizeScope(
            $validated['scope_type'],
            $validated['program_pembelajaran_id'] ?? null
        );
        $this->assertSingleActiveMode($scope, (bool) ($validated['is_active'] ?? false), $plan->id);

        $plan->update([
            ...$validated,
            ...$scope,
            'features' => $validated['features']
                ? collect(explode("\n", $validated['features']))->map(fn ($item) => trim($item))->filter()->values()->all()
                : [],
        ]);

        $this->logActivity($request, 'payment.plan_updated', 'payment_plan', $plan->id, "Mengubah payment plan {$plan->name}");

        return redirect()->back()->with('success', 'Payment plan berhasil diperbarui');
    }

    public function storeTransaction(Request $request)
    {
        $validated = $request->validate([
            'user_id' => ['required', 'exists:users,id'],
            'payment_plan_id' => ['required', 'exists:payment_plans,id'],
            'amount' => ['required', 'integer', 'min:0'],
            'payment_method' => ['required', 'in:manual,bank_transfer,e-wallet,credit_card,midtrans'],
            'status' => ['required', 'in:pending,success,failed,expired'],
            'kloter_belajar_id' => ['nullable', 'integer', 'exists:kloter_belajar,id'],
            'notes' => ['nullable', 'string'],
            'proof_of_payment' => ['nullable', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:2048'],
        ]);

        $proofPath = $request->hasFile('proof_of_payment')
            ? $request->file('proof_of_payment')->store('uploads/payments/proofs', 'public')
            : null;
        $plan = PaketPembayaran::findOrFail($validated['payment_plan_id']);
        $scope = app(AksesLanggananService::class)->scopeFromPlan($plan);
        abort_if($scope['scope_type'] === AksesLanggananService::SCOPE_GLOBAL, 422, 'Transaksi global baru sudah tidak diperbolehkan.');
        $kloter = null;

        if ($scope['scope_type'] === AksesLanggananService::SCOPE_KLOTER) {
            abort_unless($validated['kloter_belajar_id'] ?? null, 422, 'Pilih kloter untuk transaksi kelas mentor.');
            $kloter = KloterBelajar::findOrFail($validated['kloter_belajar_id']);
        }

        $transaction = DB::transaction(function () use ($request, $validated, $proofPath, $scope, $kloter) {
            if ($kloter) {
                $kloter = KloterBelajar::query()->lockForUpdate()->findOrFail($kloter->id);
                app(KloterBelajarService::class)->validasiKloterCheckout(
                    $kloter,
                    (int) $scope['program_pembelajaran_id']
                );
            }

            $transaction = Transaksi::create([
                'transaction_code' => 'TRX-'.strtoupper(Str::random(10)),
                'user_id' => $validated['user_id'],
                'payment_plan_id' => $validated['payment_plan_id'],
                ...$scope,
                'kloter_belajar_id' => $kloter?->id,
                'amount' => $validated['amount'],
                'payment_method' => $validated['payment_method'],
                'status' => $validated['status'],
                'notes' => $validated['notes'] ?? null,
                'proof_of_payment_path' => $proofPath,
                'processed_at' => $validated['status'] === 'pending' ? null : now(),
            ]);

            if ($kloter) {
                app(KloterBelajarService::class)->reservePaymentSeat(
                    Pengguna::findOrFail($validated['user_id']),
                    $kloter,
                    $transaction
                );
            }

            if ($validated['status'] === 'success') {
                $activatedTransaction = $transaction->fresh(['paymentPlan.programPembelajaran', 'programPembelajaran', 'user']);
                app(AksesLanggananService::class)->activateFromTransaction($activatedTransaction);
                $this->notifyAccessActivated($activatedTransaction, 'Pembayaran disetujui', 'manual_transaction');
            }

            LogTransaksi::create([
                'transaction_id' => $transaction->id,
                'changed_by' => $request->user()->id,
                'new_status' => $transaction->status,
                'notes' => $transaction->notes,
            ]);

            return $transaction;
        });

        if ($transaction->status === 'pending' && $transaction->user) {
            app(NotifikasiPenggunaService::class)->kirimKePengguna(
                $transaction->user,
                'payment_pending',
                'Transaksi menunggu pembayaran',
                'Transaksi premium kamu sudah dibuat dan sedang menunggu pembayaran.',
                route('user.kelas.index'),
                ['transaction_id' => $transaction->id, 'source' => 'manual_transaction']
            );
        }

        $this->logActivity($request, 'payment.transaction_created', 'transaction', $transaction->id, "Membuat transaksi {$transaction->transaction_code}");

        return redirect()->back()->with('success', 'Transaksi berhasil dibuat');
    }

    public function approve(Request $request, Transaksi $transaction)
    {
        $request->validate([
            'notes' => ['nullable', 'string'],
        ]);

        DB::transaction(function () use ($request, $transaction) {
            $transaction = Transaksi::query()->lockForUpdate()->findOrFail($transaction->id);
            abort_unless($transaction->status === 'pending', 422, 'Hanya transaksi pending yang dapat disetujui.');

            $oldStatus = $transaction->status;

            $transaction->update([
                'status' => 'success',
                'processed_at' => now(),
                'notes' => $request->input('notes') ?: $transaction->notes,
            ]);

            $activatedTransaction = $transaction->fresh(['paymentPlan.programPembelajaran', 'programPembelajaran', 'user']);
            app(AksesLanggananService::class)->activateFromTransaction($activatedTransaction);
            $this->notifyAccessActivated($activatedTransaction, 'Pembayaran disetujui', 'manual_approval');

            LogTransaksi::create([
                'transaction_id' => $transaction->id,
                'changed_by' => $request->user()->id,
                'old_status' => $oldStatus,
                'new_status' => 'success',
                'notes' => $request->input('notes'),
            ]);
        });

        $this->logActivity($request, 'payment.transaction_approved', 'transaction', $transaction->id, "Approve transaksi {$transaction->transaction_code}");

        return redirect()->back()->with('success', 'Transaksi berhasil di-approve');
    }

    public function reject(Request $request, Transaksi $transaction)
    {
        $validated = $request->validate([
            'notes' => ['required', 'string'],
        ]);

        DB::transaction(function () use ($request, $transaction, $validated) {
            $transaction = Transaksi::query()->lockForUpdate()->findOrFail($transaction->id);
            abort_unless($transaction->status === 'pending', 422, 'Hanya transaksi pending yang dapat ditolak.');

            $oldStatus = $transaction->status;

            $transaction->update([
                'status' => 'failed',
                'processed_at' => now(),
                'notes' => $validated['notes'],
            ]);

            app(KloterBelajarService::class)->releasePaymentReservation($transaction);

            LogTransaksi::create([
                'transaction_id' => $transaction->id,
                'changed_by' => $request->user()->id,
                'old_status' => $oldStatus,
                'new_status' => 'failed',
                'notes' => $validated['notes'],
            ]);
        });

        $this->logActivity($request, 'payment.transaction_rejected', 'transaction', $transaction->id, "Reject transaksi {$transaction->transaction_code}");

        return redirect()->back()->with('success', 'Transaksi berhasil ditolak');
    }

    public function storeAccessKey(Request $request)
    {
        $validated = $request->validate([
            'name' => ['nullable', 'string', 'max:255'],
            'payment_plan_id' => ['nullable', 'exists:payment_plans,id'],
            'duration_days' => ['required', 'integer', 'min:1', 'max:366'],
            'max_uses' => ['required', 'integer', 'min:1', 'max:500'],
            'scope_type' => ['nullable', Rule::in([AksesLanggananService::SCOPE_PROGRAM])],
            'program_pembelajaran_id' => ['nullable', 'exists:program_pembelajaran,id'],
            'expires_at' => ['nullable', 'date', 'after:now'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        if (! empty($validated['payment_plan_id'])) {
            $plan = PaketPembayaran::with('programPembelajaran')->findOrFail($validated['payment_plan_id']);
            $program = $plan->programPembelajaran ?: ProgramPembelajaran::findOrFail($plan->program_pembelajaran_id);
            $scope = app(AksesLanggananService::class)->scopeFromPlan($plan);
        } else {
            abort_unless(! empty($validated['program_pembelajaran_id']), 422, 'Pilih kelas atau paket langganan.');
            $program = ProgramPembelajaran::findOrFail($validated['program_pembelajaran_id']);
            $plan = app(AksesLanggananService::class)->accessKeyPlanForProgram($program);
            $scope = app(AksesLanggananService::class)->scopeFromPlan($plan);
        }

        abort_unless(
            $scope['scope_type'] === AksesLanggananService::SCOPE_PROGRAM
                && (int) $scope['program_pembelajaran_id'] === (int) $program->id,
            422,
            'Access key hanya dapat memakai plan kelas mandiri yang sesuai.'
        );

        $accessKey = KodeAkses::create([
            'payment_plan_id' => $plan->id,
            ...$scope,
            'kloter_belajar_id' => null,
            'created_by' => $request->user()->id,
            'code' => $this->generateAccessCode(),
            'name' => $validated['name'] ?? null,
            'duration_days' => $validated['duration_days'],
            'max_uses' => $validated['max_uses'],
            'expires_at' => $validated['expires_at'] ?? null,
            'notes' => $validated['notes'] ?? null,
            'status' => 'active',
        ]);

        $this->logActivity($request, 'access_key.created', 'access_key', $accessKey->id, "Membuat access key {$accessKey->code}");

        return redirect()->back()
            ->with('created_access_key', [
                'id' => $accessKey->id,
                'code' => $accessKey->code,
                'name' => $accessKey->name ?: $plan->name,
                'program' => $program->title,
                'duration_days' => $accessKey->duration_days,
                'max_uses' => $accessKey->max_uses,
            ])
            ->with('success', "Access key {$accessKey->code} berhasil dibuat.");
    }

    public function revokeAccessKey(Request $request, KodeAkses $accessKey)
    {
        $accessKey->update(['status' => 'revoked']);

        $this->logActivity($request, 'access_key.revoked', 'access_key', $accessKey->id, "Revoke access key {$accessKey->code}");

        return redirect()->back()->with('success', 'Access key berhasil dinonaktifkan');
    }

    private function notifyAccessActivated(Transaksi $transaction, string $title, string $source): void
    {
        if (! $transaction->user) {
            return;
        }

        $scopeLabel = app(AksesLanggananService::class)->labelScope(
            $transaction->scope_type,
            $transaction->programPembelajaran?->title ?? $transaction->paymentPlan?->programPembelajaran?->title
        );

        $pendingApproval = $transaction->scope_type === AksesLanggananService::SCOPE_KLOTER
            && ! $transaction->subscription_id;

        app(NotifikasiPenggunaService::class)->kirimKePengguna(
            $transaction->user,
            $pendingApproval ? 'payment_success_pending_approval' : 'payment_success',
            $title,
            $pendingApproval
                ? "Pembayaran {$scopeLabel} berhasil. Akses menunggu persetujuan mentor."
                : "Akses {$scopeLabel} sudah aktif.",
            route('user.kelas.index'),
            ['transaction_id' => $transaction->id, 'source' => $source]
        );
    }

    private function assertSingleActiveMode(array $scope, bool $isActive, ?int $exceptPlanId = null): void
    {
        if (! $isActive) {
            return;
        }

        $hasDifferentMode = PaketPembayaran::query()
            ->where('is_active', true)
            ->where('program_pembelajaran_id', $scope['program_pembelajaran_id'])
            ->whereIn('scope_type', [AksesLanggananService::SCOPE_PROGRAM, AksesLanggananService::SCOPE_KLOTER])
            ->where('scope_type', '!=', $scope['scope_type'])
            ->when($exceptPlanId, fn ($query) => $query->where('id', '!=', $exceptPlanId))
            ->exists();

        abort_if($hasDifferentMode, 422, 'Satu kelas hanya boleh memiliki satu mode paket aktif: Mandiri atau Mentor.');
    }

    private function transactionAccessState(Transaksi $transaction): string
    {
        if ($transaction->status !== 'success') {
            return $transaction->status === 'pending' ? 'payment_pending' : 'inactive';
        }

        if (($transaction->scope_type ?? AksesLanggananService::SCOPE_GLOBAL) !== AksesLanggananService::SCOPE_KLOTER) {
            return $transaction->subscription_id ? 'active' : 'inactive';
        }

        return match ($transaction->anggotaKloter?->status) {
            'active' => 'active',
            'paid_pending_approval' => 'pending_approval',
            'rejected' => 'refund_required',
            default => 'inactive',
        };
    }

    private function generateAccessCode(): string
    {
        do {
            $code = 'JL-'.strtoupper(Str::random(4)).'-'.strtoupper(Str::random(4));
        } while (KodeAkses::where('code', $code)->exists());

        return $code;
    }
}
