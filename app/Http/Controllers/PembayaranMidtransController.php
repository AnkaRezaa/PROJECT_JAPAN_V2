<?php

namespace App\Http\Controllers;

use App\Models\KloterBelajar;
use App\Models\LogTransaksi;
use App\Models\PaketPembayaran;
use App\Models\Pengguna;
use App\Models\Transaksi;
use App\Notifications\PurchaseReceiptNotification;
use App\Services\AksesLanggananService;
use App\Services\AksesPremiumService;
use App\Services\KloterBelajarService;
use App\Services\NotifikasiPenggunaService;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class PembayaranMidtransController extends Controller
{
    public function checkout(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'payment_plan_id' => ['required', 'exists:payment_plans,id'],
            'checkout_request_key' => ['required', 'uuid'],
            'kloter_belajar_id' => ['nullable', 'integer', 'exists:kloter_belajar,id'],
        ]);

        abort_unless($request->user()?->role === 'user', 403);

        $serverKey = config('services.midtrans.server_key');
        abort_if(blank($serverKey), 422, 'Midtrans server key belum dikonfigurasi.');

        $plan = PaketPembayaran::query()
            ->with('programPembelajaran:id,title')
            ->where('is_active', true)
            ->where('price', '>', 0)
            ->findOrFail($validated['payment_plan_id']);
        $scope = app(AksesLanggananService::class)->scopeFromPlan($plan);
        abort_if($scope['scope_type'] === AksesLanggananService::SCOPE_GLOBAL, 422, 'Paket global sudah tidak tersedia untuk checkout baru.');

        if ($scope['scope_type'] === AksesLanggananService::SCOPE_KLOTER) {
            abort_unless($validated['kloter_belajar_id'] ?? null, 422, 'Pilih kloter untuk kelas mentor.');
        } else {
            $validated['kloter_belajar_id'] = null;
        }

        $this->refreshReusableCheckoutStatus(
            $request,
            $plan,
            $validated['kloter_belajar_id'] ?? null
        );

        [$transaction, $wasCreated] = $this->createOrReuseCheckout(
            $request,
            $plan,
            $scope,
            $validated['checkout_request_key'],
            $validated['kloter_belajar_id'] ?? null
        );
        $snap = $this->prepareSnapPayment($transaction, $request);

        if ($wasCreated) {
            app(NotifikasiPenggunaService::class)->kirimKePengguna(
                $request->user(),
                'payment_pending',
                'Pembayaran dibuat',
                $scope['scope_type'] === AksesLanggananService::SCOPE_KLOTER
                    ? 'Selesaikan pembayaran. Setelah berhasil, akses kelas menunggu persetujuan mentor.'
                    : 'Selesaikan pembayaran agar akses belajar kamu aktif.',
                route('user.checkout', $transaction->transaction_code),
                ['transaction_id' => $transaction->id, 'source' => 'midtrans']
            );
        }

        return response()->json([
            'transaction_code' => $transaction->transaction_code,
            ...$snap,
        ]);
    }

    public function snap(Request $request, string $transactionCode): JsonResponse
    {
        abort_unless($request->user()?->role === 'user', 403);

        $transaction = Transaksi::query()
            ->with('paymentPlan', 'user')
            ->where('transaction_code', $transactionCode)
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        $this->refreshPendingCheckoutStatus($transaction, $request->user()->id);
        $transaction->refresh();

        abort_unless($transaction->status === 'pending', 410, 'Pesanan ini sudah berakhir. Buat pesanan baru untuk melanjutkan.');

        return response()->json($this->prepareSnapPayment($transaction, $request));
    }

    public function charge(Request $request, string $transactionCode): JsonResponse
    {
        abort_unless($request->user()?->role === 'user', 403);

        $validated = $request->validate([
            'payment_channel' => [
                'required',
                'string',
                'in:bca_va,mandiri_bill,bni_va,bri_va,cimb_va,permata_va,qris,gopay,shopeepay,credit_card,indomaret,alfamart,akulaku,kredivo',
            ],
            'card_token' => ['nullable', 'string', 'required_if:payment_channel,credit_card'],
        ]);

        $transaction = Transaksi::query()
            ->with('paymentPlan', 'user')
            ->where('transaction_code', $transactionCode)
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        $this->refreshPendingCheckoutStatus($transaction, $request->user()->id);
        $transaction->refresh();

        abort_unless($transaction->status === 'pending', 410, 'Pesanan ini sudah berakhir. Buat pesanan baru untuk melanjutkan.');

        $channel = $validated['payment_channel'];

        $existingPayload = $transaction->payment_payload;
        $hasActiveInstruction = filled($existingPayload)
            && (
                filled($existingPayload['va_number'] ?? null)
                || filled($existingPayload['bill_key'] ?? null)
                || filled($existingPayload['qr_url'] ?? null)
                || filled($existingPayload['deeplink_url'] ?? null)
                || filled($existingPayload['redirect_url'] ?? null)
                || filled($existingPayload['payment_code'] ?? null)
            );

        if ($transaction->payment_channel === $channel && $hasActiveInstruction) {
            return response()->json([
                'payment_channel' => $transaction->payment_channel,
                'payment_payload' => $transaction->payment_payload,
                'status' => $transaction->status,
            ]);
        }

        $serverKey = config('services.midtrans.server_key');
        abort_if(blank($serverKey), 422, 'Midtrans server key belum dikonfigurasi.');

        $midtransOrderId = $transaction->transaction_code.'-'.time();
        $chargePayload = $this->buildChargePayload($transaction, $request, $channel, $validated['card_token'] ?? null, $midtransOrderId);

        $response = Http::withBasicAuth($serverKey, '')
            ->acceptJson()
            ->timeout(15)
            ->withHeaders([
                'Idempotency-Key' => 'charge-'.$midtransOrderId,
            ])
            ->post($this->apiBaseUrl().'/v2/charge', $chargePayload);

        $responseData = $response->json() ?? [];
        $midtransStatusCode = (int) ($responseData['status_code'] ?? $response->status());

        if ($response->failed() || $midtransStatusCode >= 400) {
            Log::error('Midtrans Core API charge gagal', [
                'transaction_code' => $transaction->transaction_code,
                'midtrans_order_id' => $midtransOrderId,
                'channel' => $channel,
                'http_status' => $response->status(),
                'midtrans_status' => $midtransStatusCode,
                'response' => $responseData,
            ]);

            $message = $responseData['status_message'] ?? 'Gagal memproses pembayaran dengan metode yang dipilih.';
            abort(422, $message);
        }

        $formattedPayload = $this->formatChargeResponse($channel, $responseData, $midtransOrderId);

        $transaction->update([
            'payment_channel' => $channel,
            'payment_payload' => $formattedPayload,
        ]);

        if (isset($responseData['transaction_status'])) {
            $this->applyMidtransStatus($transaction, $responseData, $request->user()->id, 'Midtrans charge diproses via Custom UI.');
        }

        return response()->json([
            'payment_channel' => $channel,
            'payment_payload' => $formattedPayload,
            'status' => $transaction->fresh()->status,
        ]);
    }

    public function sync(Request $request, string $transactionCode): JsonResponse
    {
        abort_unless($request->user()?->role === 'user', 403);

        $transaction = Transaksi::where('transaction_code', $transactionCode)
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        $serverKey = config('services.midtrans.server_key');
        abort_if(blank($serverKey), 422, 'Midtrans server key belum dikonfigurasi.');

        $midtransOrderId = $transaction->payment_payload['midtrans_order_id'] ?? $transaction->transaction_code;

        $response = Http::withBasicAuth($serverKey, '')
            ->acceptJson()
            ->get($this->apiBaseUrl().'/v2/'.$midtransOrderId.'/status');

        $transactionNotFound = $this->midtransTransactionNotFound($response);

        if ($transactionNotFound && $midtransOrderId !== $transaction->transaction_code) {
            $response = Http::withBasicAuth($serverKey, '')
                ->acceptJson()
                ->get($this->apiBaseUrl().'/v2/'.$transaction->transaction_code.'/status');
            $transactionNotFound = $this->midtransTransactionNotFound($response);
        }

        if ($response->failed() && ! $transactionNotFound) {
            abort(422, 'Gagal mengambil status transaksi dari Midtrans.');
        }

        if ($transactionNotFound) {
            $this->expirePendingCheckoutLocallyIfStale($transaction, $request->user()->id);
        } else {
            abort_unless($this->payloadMatchesTransaction($transaction, $response->json()), 422, 'Respons Midtrans tidak sesuai transaksi.');
            $this->applyMidtransStatus($transaction, $response->json(), $request->user()->id, 'Sync status Midtrans dari frontend.');
        }

        $freshTransaction = $transaction->fresh(['kloterBelajar.admin']);
        $accessState = $this->accessState($freshTransaction);

        return response()->json([
            'status' => $transaction->fresh()->status,
            'payment_channel' => $freshTransaction->payment_channel,
            'payment_payload' => $freshTransaction->payment_payload,
            'message' => $transactionNotFound
                ? 'Pembayaran belum dimulai di Midtrans. Kamu masih dapat melanjutkan atau membatalkan pesanan ini.'
                : null,
            'subscription_status' => $request->user()->fresh()->subscription_status,
            'is_premium' => app(AksesPremiumService::class)->isPremium($request->user()->fresh()),
            'access_status' => app(AksesPremiumService::class)->statusAkses($request->user()->fresh()),
            'access_state' => $accessState,
            'kloter' => $freshTransaction?->kloterBelajar ? [
                'id' => $freshTransaction->kloterBelajar->id,
                'nama' => $freshTransaction->kloterBelajar->nama,
                'kode' => $freshTransaction->kloterBelajar->kode,
                'admin_name' => $freshTransaction->kloterBelajar->admin?->username,
                'tanggal_mulai_label' => optional($freshTransaction->kloterBelajar->tanggal_mulai)->format('d M Y'),
            ] : null,
        ]);
    }

    public function cancel(Request $request, string $transactionCode): JsonResponse
    {
        abort_unless($request->user()?->role === 'user', 403);

        $transaction = Transaksi::query()
            ->where('transaction_code', $transactionCode)
            ->where('user_id', $request->user()->id)
            ->where('payment_method', 'midtrans')
            ->firstOrFail();

        abort_unless($transaction->status === 'pending', 422, 'Hanya transaksi yang menunggu pembayaran yang dapat dibatalkan.');

        $serverKey = config('services.midtrans.server_key');
        abort_if(blank($serverKey), 422, 'Midtrans server key belum dikonfigurasi.');

        $midtransOrderId = $transaction->payment_payload['midtrans_order_id'] ?? $transaction->transaction_code;

        $statusResponse = Http::withBasicAuth($serverKey, '')
            ->acceptJson()
            ->timeout(10)
            ->get($this->apiBaseUrl().'/v2/'.$midtransOrderId.'/status');

        if ($this->midtransTransactionNotFound($statusResponse)) {
            return $this->cancelSnapCheckout($transaction, $serverKey, $request->user()->id);
        }

        if ($statusResponse->failed()) {
            abort(422, 'Gagal mengambil status transaksi dari Midtrans. Coba lagi beberapa saat lagi.');
        }

        abort_unless($this->payloadMatchesTransaction($transaction, $statusResponse->json()), 422, 'Respons Midtrans tidak sesuai transaksi.');
        $this->applyMidtransStatus($transaction, $statusResponse->json(), $request->user()->id, 'Status Midtrans diperiksa sebelum pembatalan user.');

        $transaction = $transaction->fresh();

        if ($transaction->status !== 'pending') {
            return response()->json([
                'status' => $transaction->status,
                'canceled' => false,
                'message' => $transaction->status === 'expired'
                    ? 'Waktu pembayaran sudah berakhir. Kamu dapat membuat pesanan baru.'
                    : 'Status pembayaran sudah berubah. Pesanan tidak dibatalkan.',
            ]);
        }

        $cancelResponse = Http::withBasicAuth($serverKey, '')
            ->acceptJson()
            ->timeout(10)
            ->post($this->apiBaseUrl().'/v2/'.$midtransOrderId.'/cancel');

        if ($cancelResponse->failed()) {
            $this->refreshStatusAfterCancelFailure($transaction, $request->user()->id);
            $transaction = $transaction->fresh();

            if ($transaction->status !== 'pending') {
                return response()->json([
                    'status' => $transaction->status,
                    'canceled' => false,
                    'message' => 'Status pembayaran sudah berubah. Pesanan tidak dibatalkan.',
                ]);
            }

            // Jika Midtrans API gagal membatalkan secara remote (misal server sandbox 500 atau channel e-wallet tidak mendukung cancel API),
            // batalkan transaksi secara aman di sistem lokal karena pesanan terbukti masih pending dan belum dibayar.
            $this->applyMidtransStatus($transaction, [
                'order_id' => $midtransOrderId,
                'gross_amount' => (string) $transaction->amount,
                'transaction_status' => 'cancel',
            ], $request->user()->id, 'Pesanan pending dibatalkan oleh pengguna (Midtrans remote cancel fallback).');

            return response()->json([
                'status' => 'canceled',
                'canceled' => true,
                'message' => 'Pesanan berhasil dibatalkan.',
            ]);
        }

        abort_unless(
            $this->cancelPayloadMatchesTransaction($transaction, $cancelResponse->json()),
            422,
            'Respons pembatalan Midtrans tidak sesuai transaksi.'
        );
        $this->applyMidtransStatus($transaction, $cancelResponse->json(), $request->user()->id, 'Pesanan dibatalkan oleh user melalui Midtrans.');

        return response()->json([
            'status' => $transaction->fresh()->status,
            'canceled' => true,
            'message' => 'Pesanan berhasil dibatalkan.',
        ]);
    }

    private function cancelSnapCheckout(Transaksi $transaction, string $serverKey, int $changedBy): JsonResponse
    {
        if (filled($transaction->midtrans_snap_token)) {
            $response = Http::withBasicAuth($serverKey, '')
                ->acceptJson()
                ->timeout(10)
                ->post($this->snapBaseUrl().'/snap/v1/transactions/'.$transaction->midtrans_snap_token.'/cancel');
            $errors = collect($response->json('error_messages', []))->map(fn ($message) => strtolower((string) $message));
            $isAlreadyClosed = $errors->contains(fn ($message) => str_contains($message, 'already canceled')
                || str_contains($message, 'token not found'));

            if ($response->failed() && ! $isAlreadyClosed) {
                if (in_array($response->status(), [401, 403], true)) {
                    abort(502, 'Konfigurasi pembayaran belum dapat memproses pembatalan. Hubungi pengelola TOKU-UP.');
                }

                $isInProgress = $errors->contains(fn ($message) => str_contains($message, 'transaction is on progress'));

                abort(
                    422,
                    $isInProgress
                        ? 'Halaman pembayaran masih aktif. Tutup halaman Midtrans, tunggu 1-2 menit, lalu coba batalkan kembali.'
                        : 'Midtrans belum dapat membatalkan pesanan. Coba lagi beberapa saat lagi.'
                );
            }
        }

        $this->applyMidtransStatus($transaction, [
            'order_id' => $transaction->transaction_code,
            'gross_amount' => (string) $transaction->amount,
            'transaction_status' => 'cancel',
        ], $changedBy, 'Sesi Snap yang belum memiliki transaksi pembayaran dibatalkan oleh user.');

        return response()->json([
            'status' => 'canceled',
            'canceled' => true,
            'message' => 'Pesanan berhasil dibatalkan.',
        ]);
    }

    public function notification(Request $request): JsonResponse
    {
        $serverKey = config('services.midtrans.server_key');
        abort_if(blank($serverKey), 422, 'Midtrans server key belum dikonfigurasi.');

        $payload = $request->all();
        $orderId = (string) ($payload['order_id'] ?? '');
        $statusCode = (string) ($payload['status_code'] ?? '');
        $grossAmount = (string) ($payload['gross_amount'] ?? '');
        $signature = (string) ($payload['signature_key'] ?? '');

        $expectedSignature = hash('sha512', $orderId.$statusCode.$grossAmount.$serverKey);
        abort_unless(hash_equals($expectedSignature, $signature), 403, 'Invalid Midtrans signature.');

        $baseCode = preg_match('/^(MID-[A-Z0-9]+)-\d+$/', $orderId, $matches)
            ? $matches[1]
            : $orderId;

        $transaction = Transaksi::where('transaction_code', $baseCode)->firstOrFail();
        abort_unless($this->payloadMatchesTransaction($transaction, $payload), 422, 'Respons Midtrans tidak sesuai transaksi.');
        $this->applyMidtransStatus($transaction, $payload, null, 'Callback Midtrans diterima.');

        return response()->json(['message' => 'OK']);
    }

    public function reconcilePendingTransaction(Transaksi $transaction): bool
    {
        $serverKey = config('services.midtrans.server_key');

        if (blank($serverKey)) {
            Log::warning('Rekonsiliasi Midtrans dilewati karena server key belum dikonfigurasi.');

            return false;
        }

        $midtransOrderId = $transaction->payment_payload['midtrans_order_id'] ?? $transaction->transaction_code;

        $response = Http::withBasicAuth($serverKey, '')
            ->acceptJson()
            ->timeout(10)
            ->retry(2, 500)
            ->get($this->apiBaseUrl().'/v2/'.$midtransOrderId.'/status');

        if ($response->failed()) {
            Log::warning('Rekonsiliasi Midtrans gagal mengambil status.', [
                'transaction_id' => $transaction->id,
                'http_status' => $response->status(),
            ]);

            return false;
        }

        if (! $this->payloadMatchesTransaction($transaction, $response->json())) {
            Log::warning('Rekonsiliasi Midtrans menerima respons yang tidak sesuai transaksi.', [
                'transaction_id' => $transaction->id,
                'transaction_code' => $transaction->transaction_code,
            ]);

            return false;
        }

        $this->applyMidtransStatus($transaction, $response->json(), null, 'Rekonsiliasi transaksi pending Midtrans.');

        return true;
    }

    private function refreshStatusAfterCancelFailure(Transaksi $transaction, ?int $changedBy): void
    {
        $serverKey = config('services.midtrans.server_key');

        if (blank($serverKey)) {
            return;
        }

        $response = Http::withBasicAuth($serverKey, '')
            ->acceptJson()
            ->timeout(10)
            ->get($this->apiBaseUrl().'/v2/'.$transaction->transaction_code.'/status');

        if ($response->successful() && $this->payloadMatchesTransaction($transaction, $response->json())) {
            $this->applyMidtransStatus($transaction, $response->json(), $changedBy, 'Status Midtrans diperiksa setelah pembatalan gagal.');
        }
    }

    private function applyMidtransStatus(Transaksi $transaction, array $payload, ?int $changedBy, string $notes): void
    {
        $newStatus = $this->mapStatus($payload['transaction_status'] ?? null, $payload['fraud_status'] ?? null);

        DB::transaction(function () use ($transaction, $newStatus, $payload, $changedBy, $notes) {
            $transaction = Transaksi::query()->lockForUpdate()->findOrFail($transaction->id);
            $oldStatus = $transaction->status;

            if (! $this->canTransitionStatus($oldStatus, $newStatus)) {
                Log::warning('Status Midtrans yang terlambat atau tidak valid diabaikan.', [
                    'transaction_id' => $transaction->id,
                    'old_status' => $oldStatus,
                    'new_status' => $newStatus,
                ]);

                return;
            }

            $transaction->update([
                'status' => $newStatus,
                'processed_at' => $newStatus === 'pending' ? null : now(),
                'notes' => 'Midtrans status: '.($payload['transaction_status'] ?? '-').'; fraud: '.($payload['fraud_status'] ?? '-'),
            ]);

            if ($newStatus === 'success' && $oldStatus !== 'success') {
                $activatedTransaction = $transaction->fresh(['paymentPlan.programPembelajaran', 'programPembelajaran', 'user']);
                $subscription = app(AksesLanggananService::class)->activateFromTransaction($activatedTransaction);
                $isPendingApproval = $activatedTransaction->scope_type === AksesLanggananService::SCOPE_KLOTER
                    && ! $subscription;

                if ($activatedTransaction->user) {
                    $scopeLabel = app(AksesLanggananService::class)->labelScope(
                        $activatedTransaction->scope_type,
                        $activatedTransaction->programPembelajaran?->title ?? $activatedTransaction->paymentPlan?->programPembelajaran?->title
                    );

                    app(NotifikasiPenggunaService::class)->kirimKePengguna(
                        $activatedTransaction->user,
                        $isPendingApproval ? 'payment_success_pending_approval' : 'payment_success',
                        'Pembayaran berhasil',
                        $isPendingApproval
                            ? "Pembayaran {$scopeLabel} berhasil. Akses menunggu persetujuan mentor."
                            : "Akses {$scopeLabel} sudah aktif.",
                        route('user.kelas.index'),
                        ['transaction_id' => $activatedTransaction->id, 'source' => 'midtrans'],
                        'payment',
                        'success',
                        false,
                    );

                    DB::afterCommit(function () use ($activatedTransaction, $scopeLabel, $isPendingApproval): void {
                        try {
                            $activatedTransaction->user->notify(new PurchaseReceiptNotification(
                                $activatedTransaction->transaction_code,
                                $activatedTransaction->paymentPlan?->name ?? 'Akses belajar',
                                $scopeLabel,
                                (int) $activatedTransaction->amount,
                                optional($activatedTransaction->processed_at)->format('d M Y H:i') ?? now()->format('d M Y H:i'),
                                $isPendingApproval,
                            ));
                        } catch (\Throwable $exception) {
                            Log::error('Invoice pembayaran tidak dapat dimasukkan ke antrean.', [
                                'transaction_id' => $activatedTransaction->id,
                                'exception' => $exception->getMessage(),
                            ]);
                        }
                    });
                }

                $this->notifySuperadminTransaction($activatedTransaction, 'payment_success', 'Pembayaran Midtrans berhasil', 'success');

                if ($isPendingApproval) {
                    DB::afterCommit(fn () => $this->notifyMentorPendingEnrollment($activatedTransaction));
                }
            }

            if (in_array($newStatus, ['failed', 'expired', 'canceled'], true) && $oldStatus !== $newStatus) {
                $failedTransaction = $transaction->fresh(['user']);
                app(KloterBelajarService::class)->releasePaymentReservation($failedTransaction);
                if ($failedTransaction->user) {
                    app(NotifikasiPenggunaService::class)->kirimKePengguna(
                        $failedTransaction->user,
                        $newStatus === 'expired' ? 'payment_expired' : 'payment_failed',
                        $newStatus === 'expired' ? 'Pembayaran kedaluwarsa' : 'Pembayaran gagal',
                        $newStatus === 'expired'
                            ? 'Waktu pembayaran habis. Silakan buat checkout baru jika masih ingin membuka akses.'
                            : 'Pembayaran belum berhasil. Silakan coba lagi atau pilih metode lain.',
                        route('pricing'),
                        ['transaction_id' => $failedTransaction->id, 'source' => 'midtrans'],
                        'payment',
                        'danger',
                        false
                    );
                }

                $this->notifySuperadminTransaction(
                    $failedTransaction,
                    $newStatus === 'expired' ? 'payment_expired' : 'payment_failed',
                    $newStatus === 'expired' ? 'Pembayaran Midtrans kedaluwarsa' : 'Pembayaran Midtrans gagal',
                    'danger'
                );
            }

            if ($newStatus === 'refunded' && $oldStatus !== 'refunded') {
                $refundedTransaction = $transaction->fresh(['subscription.user', 'user']);
                app(AksesLanggananService::class)->cancelFromTransaction($refundedTransaction);

                if ($refundedTransaction->user) {
                    app(NotifikasiPenggunaService::class)->kirimKePengguna(
                        $refundedTransaction->user,
                        'payment_refunded',
                        'Pembayaran dibatalkan',
                        'Pembayaran dibatalkan atau dikembalikan. Akses dari transaksi ini telah dinonaktifkan.',
                        route('pricing'),
                        ['transaction_id' => $refundedTransaction->id, 'source' => 'midtrans'],
                        'payment',
                        'warning',
                        false
                    );
                }

                $this->notifySuperadminTransaction(
                    $refundedTransaction,
                    'payment_refunded',
                    'Pembayaran Midtrans dibatalkan atau direfund',
                    'warning'
                );
            }

            if ($oldStatus !== $newStatus || $notes !== 'Sync status Midtrans dari frontend.') {
                LogTransaksi::create([
                    'transaction_id' => $transaction->id,
                    'changed_by' => $changedBy,
                    'old_status' => $oldStatus,
                    'new_status' => $newStatus,
                    'notes' => $notes,
                ]);
            }
        });
    }

    private function createOrReuseCheckout(
        Request $request,
        PaketPembayaran $plan,
        array $scope,
        string $checkoutRequestKey,
        ?int $kloterId
    ): array {
        try {
            return DB::transaction(function () use ($request, $plan, $scope, $checkoutRequestKey, $kloterId) {
                Pengguna::query()
                    ->whereKey($request->user()->id)
                    ->lockForUpdate()
                    ->firstOrFail();

                $existing = Transaksi::query()
                    ->where('checkout_request_key', $checkoutRequestKey)
                    ->lockForUpdate()
                    ->first();

                if ($existing) {
                    $this->assertReusableCheckout($existing, $request, $plan, $kloterId);

                    return [$existing, false];
                }

                $kloter = null;

                if ($scope['scope_type'] === AksesLanggananService::SCOPE_KLOTER) {
                    $kloter = KloterBelajar::query()->lockForUpdate()->findOrFail($kloterId);
                    app(KloterBelajarService::class)->validasiKloterCheckout(
                        $kloter,
                        (int) $scope['program_pembelajaran_id']
                    );
                }

                $pendingTransaction = Transaksi::query()
                    ->where('user_id', $request->user()->id)
                    ->where('payment_plan_id', $plan->id)
                    ->where('payment_method', 'midtrans')
                    ->where('status', 'pending')
                    ->latest('id')
                    ->lockForUpdate()
                    ->first();

                if ($pendingTransaction) {
                    $this->assertReusableCheckout($pendingTransaction, $request, $plan, $kloterId);

                    return [$pendingTransaction, false];
                }

                $transaction = Transaksi::create([
                    'transaction_code' => 'MID-'.strtoupper(Str::random(10)),
                    'checkout_request_key' => $checkoutRequestKey,
                    'user_id' => $request->user()->id,
                    'payment_plan_id' => $plan->id,
                    ...$scope,
                    'kloter_belajar_id' => $kloter?->id,
                    'amount' => $plan->price,
                    'payment_method' => 'midtrans',
                    'status' => 'pending',
                    'notes' => 'Midtrans Snap checkout dibuat dari halaman pricing.',
                ]);

                LogTransaksi::create([
                    'transaction_id' => $transaction->id,
                    'changed_by' => $request->user()->id,
                    'new_status' => 'pending',
                    'notes' => 'Midtrans Snap checkout dibuat.',
                ]);

                if ($kloter) {
                    app(KloterBelajarService::class)->reservePaymentSeat(
                        $request->user(),
                        $kloter,
                        $transaction
                    );
                }

                return [$transaction, true];
            }, 3);
        } catch (QueryException $exception) {
            $existing = Transaksi::query()
                ->where('checkout_request_key', $checkoutRequestKey)
                ->first();

            if (! $existing) {
                throw $exception;
            }

            $this->assertReusableCheckout($existing, $request, $plan, $kloterId);

            return [$existing, false];
        }
    }

    private function assertReusableCheckout(
        Transaksi $transaction,
        Request $request,
        PaketPembayaran $plan,
        ?int $kloterId
    ): void {
        abort_unless($transaction->user_id === $request->user()->id, 403);
        abort_unless($transaction->payment_plan_id === $plan->id, 422, 'Checkout intent tidak sesuai paket pembayaran.');
        abort_unless(
            (int) ($transaction->kloter_belajar_id ?? 0) === (int) ($kloterId ?? 0),
            409,
            'Masih ada checkout untuk kloter lain. Batalkan pesanan lama sebelum mengganti kloter.'
        );
        abort_if($transaction->status !== 'pending', 410, 'Pesanan sebelumnya sudah berakhir. Buat pesanan baru untuk melanjutkan.');
    }

    private function refreshReusableCheckoutStatus(
        Request $request,
        PaketPembayaran $plan,
        ?int $kloterId
    ): void {
        $transaction = Transaksi::query()
            ->where('user_id', $request->user()->id)
            ->where('payment_plan_id', $plan->id)
            ->where('payment_method', 'midtrans')
            ->where('status', 'pending')
            ->where(function ($query) use ($kloterId) {
                $kloterId
                    ? $query->where('kloter_belajar_id', $kloterId)
                    : $query->whereNull('kloter_belajar_id');
            })
            ->latest('id')
            ->first();

        if ($transaction) {
            $this->refreshPendingCheckoutStatus($transaction, $request->user()->id);
        }
    }

    private function refreshPendingCheckoutStatus(Transaksi $transaction, ?int $changedBy): void
    {
        if ($transaction->status !== 'pending' || blank($transaction->midtrans_snap_token)) {
            return;
        }

        if ($this->reconcilePendingTransaction($transaction)) {
            return;
        }

        $this->expirePendingCheckoutLocallyIfStale($transaction, $changedBy);
    }

    private function expirePendingCheckoutLocallyIfStale(Transaksi $transaction, ?int $changedBy): bool
    {
        $expiryHours = max(1, (int) config('services.midtrans.snap_expiry_hours', 24));

        if ($transaction->status !== 'pending'
            || $transaction->created_at?->gt(now()->subHours($expiryHours))) {
            return false;
        }

        $this->applyMidtransStatus($transaction, [
            'order_id' => $transaction->transaction_code,
            'gross_amount' => (string) $transaction->amount,
            'transaction_status' => 'expire',
        ], $changedBy, 'Checkout lokal ditandai kedaluwarsa setelah token Snap melewati batas waktu.');

        return true;
    }

    private function prepareSnapPayment(Transaksi $transaction, Request $request): array
    {
        $transaction->loadMissing('paymentPlan');

        if ($transaction->midtrans_snap_token) {
            return [
                'snap_token' => $transaction->midtrans_snap_token,
                'redirect_url' => $transaction->midtrans_snap_redirect_url,
            ];
        }

        $serverKey = config('services.midtrans.server_key');
        abort_if(blank($serverKey), 422, 'Midtrans server key belum dikonfigurasi.');
        abort_if(! $transaction->paymentPlan, 422, 'Paket pembayaran untuk transaksi ini tidak ditemukan.');

        $payload = [
            'transaction_details' => [
                'order_id' => $transaction->transaction_code,
                'gross_amount' => (int) $transaction->amount,
            ],
            'customer_details' => [
                'first_name' => $request->user()->username ?: $request->user()->name,
                'email' => $request->user()->email,
            ],
            'item_details' => [[
                'id' => (string) $transaction->paymentPlan->id,
                'price' => (int) $transaction->amount,
                'quantity' => 1,
                'name' => Str::limit($transaction->paymentPlan->name, 50, ''),
            ]],
            'callbacks' => [
                'finish' => route('user.checkout', $transaction->transaction_code),
                'error' => route('user.checkout', $transaction->transaction_code),
            ],
            'expiry' => [
                'duration' => max(1, (int) config('services.midtrans.snap_expiry_hours', 24)),
                'unit' => 'hours',
            ],
            'credit_card' => [
                'secure' => (bool) config('services.midtrans.is_3ds', true),
            ],
        ];

        $response = Http::withBasicAuth($serverKey, '')
            ->acceptJson()
            ->withHeaders([
                'Idempotency-Key' => 'snap-'.$transaction->transaction_code,
            ])
            ->post($this->snapBaseUrl().'/snap/v1/transactions', $payload);

        if ($response->failed()) {
            abort(422, 'Gagal menyiapkan pembayaran Midtrans. Coba beberapa saat lagi.');
        }

        return DB::transaction(function () use ($transaction, $response) {
            $lockedTransaction = Transaksi::query()->lockForUpdate()->findOrFail($transaction->id);

            if (! $lockedTransaction->midtrans_snap_token) {
                $lockedTransaction->update([
                    'midtrans_snap_token' => $response->json('token'),
                    'midtrans_snap_redirect_url' => $response->json('redirect_url'),
                ]);
            }

            return [
                'snap_token' => $lockedTransaction->midtrans_snap_token,
                'redirect_url' => $lockedTransaction->midtrans_snap_redirect_url,
            ];
        });
    }

    private function mapStatus(?string $transactionStatus, ?string $fraudStatus): string
    {
        return match ($transactionStatus) {
            'capture' => match ($fraudStatus) {
                'accept' => 'success',
                'challenge' => 'pending',
                'deny' => 'failed',
                default => 'pending',
            },
            'settlement' => 'success',
            'pending', 'authorize' => 'pending',
            'deny', 'failure' => 'failed',
            'cancel' => 'canceled',
            'expire' => 'expired',
            'refund', 'partial_refund', 'chargeback' => 'refunded',
            default => 'pending',
        };
    }

    private function payloadMatchesTransaction(Transaksi $transaction, array $payload): bool
    {
        $payloadOrderId = (string) ($payload['order_id'] ?? '');
        $matchesOrder = $payloadOrderId === $transaction->transaction_code
            || Str::startsWith($payloadOrderId, $transaction->transaction_code.'-');

        return $matchesOrder
            && (int) ($payload['gross_amount'] ?? -1) === (int) $transaction->amount;
    }

    private function cancelPayloadMatchesTransaction(Transaksi $transaction, array $payload): bool
    {
        if (($payload['transaction_status'] ?? null) !== 'cancel') {
            return false;
        }

        if (filled($payload['order_id'] ?? null)) {
            $payloadOrderId = (string) $payload['order_id'];
            $matchesOrder = $payloadOrderId === $transaction->transaction_code
                || Str::startsWith($payloadOrderId, $transaction->transaction_code.'-');

            if (! $matchesOrder) {
                return false;
            }
        }

        return ! filled($payload['gross_amount'] ?? null)
            || (int) $payload['gross_amount'] === (int) $transaction->amount;
    }

    private function midtransTransactionNotFound($response): bool
    {
        return $response->status() === 404
            || (string) $response->json('status_code') === '404';
    }

    private function canTransitionStatus(string $oldStatus, string $newStatus): bool
    {
        if (in_array($oldStatus, ['refunded', 'canceled'], true)) {
            return $newStatus === $oldStatus;
        }

        return $oldStatus !== 'success'
            || in_array($newStatus, ['success', 'refunded'], true);
    }

    private function notifySuperadminTransaction(Transaksi $transaction, string $type, string $title, string $severity): void
    {
        $userLabel = $transaction->user?->username ?: $transaction->user?->email ?: 'User';

        app(NotifikasiPenggunaService::class)->kirimKeRole(
            'superadmin',
            $type,
            $title,
            "{$userLabel} - {$transaction->transaction_code}",
            route('superadmin.payments'),
            [
                'transaction_id' => $transaction->id,
                'user_id' => $transaction->user_id,
                'source' => 'midtrans',
            ],
            'payment',
            $severity,
            true
        );
    }

    private function notifyMentorPendingEnrollment(Transaksi $transaction): void
    {
        $transaction->loadMissing(['user:id,username,email', 'kloterBelajar.admin:id,username,email']);
        $kloter = $transaction->kloterBelajar;
        $mentor = $kloter?->admin;

        if (! $kloter || ! $mentor || $mentor->role !== 'admin' || $mentor->status !== 'active') {
            return;
        }

        $notifikasi = app(NotifikasiPenggunaService::class);
        $userLabel = $transaction->user?->username ?: $transaction->user?->email ?: 'Peserta baru';

        $notifikasi->kirimKePengguna(
            $mentor,
            'kloter_enrollment_pending',
            'Peserta menunggu persetujuan',
            "{$userLabel} sudah membayar dan menunggu persetujuan untuk {$kloter->nama}.",
            route('admin.users', ['kloter' => $kloter->id]),
            [
                'transaction_id' => $transaction->id,
                'kloter_id' => $kloter->id,
                'user_id' => $transaction->user_id,
                'source' => 'midtrans',
            ],
            'access',
            'warning',
            true,
        );

        if (! app(KloterBelajarService::class)->masihAdaKapasitas($kloter)) {
            $notifikasi->kirimKePengguna(
                $mentor,
                'kloter_full',
                'Kloter sudah penuh',
                "Kapasitas {$kloter->nama} sudah penuh. Periksa peserta atau kapasitas sebelum menerima pendaftaran baru.",
                route('admin.users', ['kloter' => $kloter->id]),
                ['kloter_id' => $kloter->id, 'source' => 'midtrans'],
                'access',
                'warning',
                true,
            );
        }
    }

    private function snapBaseUrl(): string
    {
        return config('services.midtrans.is_production')
            ? 'https://app.midtrans.com'
            : 'https://app.sandbox.midtrans.com';
    }

    private function apiBaseUrl(): string
    {
        return config('services.midtrans.is_production')
            ? 'https://api.midtrans.com'
            : 'https://api.sandbox.midtrans.com';
    }

    private function accessState(?Transaksi $transaction): string
    {
        if (! $transaction) {
            return 'unavailable';
        }

        if ($transaction->scope_type !== AksesLanggananService::SCOPE_KLOTER) {
            return $transaction->status === 'success' ? 'active' : 'payment_pending';
        }

        $membershipStatus = $transaction->anggotaKloter()->value('status');

        return match ($membershipStatus) {
            'active' => 'active',
            'paid_pending_approval' => 'pending_approval',
            'rejected' => 'refund_required',
            default => $transaction->status === 'success' ? 'pending_approval' : 'payment_pending',
        };
    }

    private function buildChargePayload(Transaksi $transaction, Request $request, string $channel, ?string $cardToken, string $midtransOrderId): array
    {
        $isInstantPayment = in_array($channel, ['qris', 'gopay', 'shopeepay'], true);
        $isConvenienceStore = in_array($channel, ['indomaret', 'alfamart'], true);

        $base = [
            'transaction_details' => [
                'order_id' => $midtransOrderId,
                'gross_amount' => (int) $transaction->amount,
            ],
            'customer_details' => [
                'first_name' => $request->user()->username ?: $request->user()->name,
                'email' => $request->user()->email,
            ],
            'item_details' => [[
                'id' => (string) $transaction->paymentPlan?->id,
                'price' => (int) $transaction->amount,
                'quantity' => 1,
                'name' => Str::limit($transaction->paymentPlan?->name ?? 'Akses Belajar', 50, ''),
            ]],
            'custom_expiry' => [
                'order_time' => now()->format('Y-m-d H:i:s O'),
                'expiry_duration' => $isInstantPayment ? 30 : ($isConvenienceStore ? 24 : 1),
                'unit' => $isInstantPayment ? 'minute' : 'hour',
            ],
        ];

        return match ($channel) {
            'bca_va' => [
                ...$base,
                'payment_type' => 'bank_transfer',
                'bank_transfer' => [
                    'bank' => 'bca',
                ],
            ],
            'bni_va' => [
                ...$base,
                'payment_type' => 'bank_transfer',
                'bank_transfer' => [
                    'bank' => 'bni',
                ],
            ],
            'bri_va' => [
                ...$base,
                'payment_type' => 'bank_transfer',
                'bank_transfer' => [
                    'bank' => 'bri',
                ],
            ],
            'cimb_va' => [
                ...$base,
                'payment_type' => 'bank_transfer',
                'bank_transfer' => [
                    'bank' => 'cimb',
                ],
            ],
            'permata_va' => [
                ...$base,
                'payment_type' => 'permata',
            ],
            'mandiri_bill' => [
                ...$base,
                'payment_type' => 'echannel',
                'echannel' => [
                    'bill_info1' => 'Pembayaran:',
                    'bill_info2' => Str::limit($transaction->paymentPlan?->name ?? 'Akses Kelas', 30, ''),
                ],
            ],
            'qris' => [
                ...$base,
                'payment_type' => 'qris',
                'qris' => [
                    'acquirer' => 'gopay',
                ],
            ],
            'gopay' => [
                ...$base,
                'payment_type' => 'gopay',
                'gopay' => [
                    'enable_callback' => true,
                    'callback_url' => route('user.checkout', $transaction->transaction_code),
                ],
            ],
            'shopeepay' => [
                ...$base,
                'payment_type' => 'shopeepay',
                'shopeepay' => [
                    'callback_url' => route('user.checkout', $transaction->transaction_code),
                ],
            ],
            'indomaret' => [
                ...$base,
                'payment_type' => 'cstore',
                'cstore' => [
                    'store' => 'indomaret',
                    'message' => 'Layanan Belajar TOKU-UP',
                ],
            ],
            'alfamart' => [
                ...$base,
                'payment_type' => 'cstore',
                'cstore' => [
                    'store' => 'alfamart',
                    'alfamart_free_text_1' => '1. Beritahu kasir pembayaran TOKU-UP.',
                    'alfamart_free_text_2' => '2. Tunjukkan kode pembayaran.',
                    'alfamart_free_text_3' => '3. Simpan struk bukti pembayaran.',
                ],
            ],
            'akulaku' => [
                ...$base,
                'payment_type' => 'akulaku',
            ],
            'kredivo' => [
                ...$base,
                'payment_type' => 'kredivo',
            ],
            'credit_card' => [
                ...$base,
                'payment_type' => 'credit_card',
                'credit_card' => [
                    'token_id' => $cardToken,
                    'authentication' => (bool) config('services.midtrans.is_3ds', true),
                ],
            ],
            default => $base,
        };
    }

    private function formatChargeResponse(string $channel, array $response, string $midtransOrderId): array
    {
        $actions = collect($response['actions'] ?? []);

        $qrString = $response['qr_string'] ?? null;
        $qrUrl = $actions->firstWhere('name', 'generate-qr-code')['url'] ?? null;
        $deeplinkUrl = $actions->firstWhere('name', 'deeplink-redirect')['url'] ?? null;

        if (! $qrUrl && filled($qrString)) {
            $qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data='.urlencode($qrString);
        }

        if (! $qrUrl && filled($deeplinkUrl)) {
            $qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data='.urlencode($deeplinkUrl);
        }

        $vaNumber = null;
        $bank = null;

        if (isset($response['va_numbers'][0])) {
            $vaNumber = (string) $response['va_numbers'][0]['va_number'];
            $bank = (string) $response['va_numbers'][0]['bank'];
        } elseif (isset($response['cimb_va_number'])) {
            $vaNumber = (string) $response['cimb_va_number'];
            $bank = 'cimb';
        } elseif (isset($response['permata_va_number'])) {
            $vaNumber = (string) $response['permata_va_number'];
            $bank = 'permata';
        }

        $fallbackMinutes = match (true) {
            in_array($channel, ['qris', 'gopay', 'shopeepay'], true) => 30,
            in_array($channel, ['indomaret', 'alfamart'], true) => 1440,
            default => 60,
        };

        $expiryTime = $response['expiry_time']
            ?? now()->addMinutes($fallbackMinutes)->format('Y-m-d H:i:s');

        return [
            'channel' => $channel,
            'midtrans_order_id' => $midtransOrderId,
            'va_number' => $vaNumber,
            'bank' => $bank,
            'payment_code' => $response['payment_code'] ?? null,
            'store' => $response['store'] ?? ($channel === 'indomaret' ? 'indomaret' : ($channel === 'alfamart' ? 'alfamart' : null)),
            'pdf_url' => $response['pdf_url'] ?? null,
            'biller_code' => $response['biller_code'] ?? null,
            'bill_key' => $response['bill_key'] ?? null,
            'qr_string' => $qrString,
            'qr_url' => $qrUrl,
            'deeplink_url' => $deeplinkUrl,
            'redirect_url' => $response['redirect_url'] ?? null,
            'expiry_time' => $expiryTime,
            'gross_amount' => $response['gross_amount'] ?? null,
            'status_message' => $response['status_message'] ?? null,
            'transaction_status' => $response['transaction_status'] ?? null,
        ];
    }
}
