# Midtrans Payment Gateway

## Arsitektur

1. User memilih plan dari halaman kelas.
2. Frontend membuat UUID `checkout_request_key` dan memanggil checkout.
3. Backend memvalidasi plan, program, kloter, kapasitas, dan user.
4. Backend membuat atau menggunakan kembali transaksi berdasarkan idempotency key.
5. Frontend membuka Snap dengan token transaksi.
6. Midtrans mengirim webhook ke backend.
7. Backend memverifikasi signature, nominal, order ID, dan transisi status.
8. Akses kelas diaktifkan atau masuk approval mentor sesuai scope.
9. Scheduler merekonsiliasi transaksi pending bila webhook terlambat.

## Environment Sandbox

```dotenv
MIDTRANS_SERVER_KEY=SB-Mid-server-...
MIDTRANS_CLIENT_KEY=SB-Mid-client-...
MIDTRANS_IS_PRODUCTION=false
MIDTRANS_IS_SANITIZED=true
MIDTRANS_IS_3DS=true
MIDTRANS_SNAP_EXPIRY_HOURS=24
```

Production memakai pasangan key production dan `MIDTRANS_IS_PRODUCTION=true`. Jangan mencampur server/client key sandbox dan production.

## Dashboard Midtrans

Set notification URL:

```text
https://rezawalker.web.id/payments/midtrans/notification
```

Webhook route publik sengaja tidak memakai CSRF, tetapi dilindungi signature Midtrans. Jangan menambahkan throttle Laravel agresif karena dapat menghambat retry resmi.

Finish redirect tidak boleh diarahkan ke route `user.checkout` tanpa `transactionCode`, karena route itu wajib memiliki parameter. Flow utama sudah dikendalikan callback Snap dan invoice aplikasi. Jika dashboard mewajibkan URL umum, gunakan halaman aman yang tidak membutuhkan parameter, misalnya halaman kelas user.

## Idempotensi

Frontend menyimpan `checkout_request_key` di session storage. Backend memiliki constraint dan lock sehingga klik berulang dengan key yang sama menggunakan transaksi yang sama. Ini mencegah pembuatan banyak transaksi aplikasi, tetapi Midtrans tetap dapat meminta pembayaran hanya setelah user mengonfirmasi metode pembayaran pada Snap.

Idempotensi juga diterapkan saat status masuk berulang: transaksi dikunci, transisi status divalidasi, dan aktivasi subscription tidak digandakan.

## Masa Berlaku dan Checkout Ulang

Snap dibuat dengan masa berlaku sesuai `MIDTRANS_SNAP_EXPIRY_HOURS` (default 24 jam). Sebelum memakai kembali transaksi pending, backend memeriksa status resminya. Checkout yang sudah kedaluwarsa ditutup dan frontend membuat `checkout_request_key` baru agar user dapat memesan kembali tanpa memakai token lama dari `sessionStorage`.

Callback `finish` dan `error` Snap selalu kembali ke invoice TOKU-UP yang menyertakan `transactionCode`. Jangan memakai URL contoh vendor seperti `https://example.com`.

## Validasi Webhook

Urutan keamanan:

1. Ambil `order_id`, `status_code`, `gross_amount`, dan `signature_key`.
2. Hitung SHA-512 `order_id + status_code + gross_amount + server_key`.
3. Bandingkan dengan `hash_equals`.
4. Cari transaksi berdasarkan kode.
5. Pastikan payload dan nominal sama dengan transaksi.
6. Map status secara fail-closed.
7. Jalankan perubahan dan aktivasi dalam transaksi database.

Mapping utama:

```text
capture + accept     -> success
capture + challenge  -> pending
capture + deny       -> failed
capture + unknown    -> pending
settlement           -> success
pending/authorize    -> pending
deny/failure         -> failed
cancel               -> canceled
expire               -> expired
refund/chargeback    -> refunded
unknown              -> pending
```

Status tidak dikenal tidak boleh mengaktifkan akses.

## Reconciliation

Command:

```bash
php artisan payments:reconcile-pending --hours=48
```

Scheduler menjalankannya setiap 10 menit dengan `withoutOverlapping`. Reconciliation adalah reliability layer; mapping webhook aman tidak boleh menunggu scheduler selesai dibuat.

Midtrans dapat merespons HTTP 200 dengan body `status_code: "404"` ketika token Snap sudah dibuat tetapi user belum memilih metode pembayaran sehingga transaksi belum tercatat di Core API. Endpoint pemeriksaan status frontend memperlakukan kondisi ini sebagai checkout yang belum dimulai, bukan transaksi tidak valid.

Keterbatasan aktif: command rekonsiliasi terjadwal masih mencatat respons 200/404 tersebut sebagai mismatch. Sampai handler command diselaraskan, warning ini tidak berarti pembayaran user gagal, tetapi harus dipantau agar tidak menutupi kegagalan API lain.

## Cancel dan Refund

- User hanya dapat membatalkan transaksi Midtrans miliknya yang masih pending.
- Pembatalan transaksi yang sudah masuk Core API memakai endpoint Core API.
- Bila Core API menjawab transaksi belum ada, backend membatalkan sesi menggunakan endpoint Snap dan `midtrans_snap_token`.
- Kedua endpoint server-to-server wajib memakai HTTP Basic Auth dengan server key sebagai username dan password kosong. Header `Authorization` berisi server key mentah akan ditolak 401.
- Respons Snap cancel yang sah dapat hanya berisi `canceled_at`; respons tersebut tidak boleh dipaksa memiliki payload transaksi lengkap.
- Pembatalan menyelaraskan status resmi jika API cancel gagal atau transaksi sudah tertutup.
- Refund/chargeback membatalkan hanya subscription terkait transaksi.
- Penolakan enrollment kelas mentor tidak otomatis melakukan refund finansial; superadmin harus memproses refund melalui Midtrans dan mencatatnya.

## Email Invoice

Invoice `PurchaseReceiptNotification` dipicu ketika status pertama kali berubah menjadi `success`. Kelas mentor dapat tetap menunggu approval walaupun pembayaran sukses; isi invoice harus membedakan status pembayaran dan status akses.

## Test Wajib

- signature invalid menghasilkan 403;
- nominal atau order ID berbeda tidak mengaktifkan akses;
- semua kombinasi capture/fraud status;
- callback sukses berulang tidak membuat subscription ganda;
- klik checkout berulang memakai transaksi yang sama;
- sync hanya membaca transaksi milik user;
- cancel pending dan callback terlambat;
- Core API HTTP 200 dengan body `status_code: 404`;
- pembatalan sesi Snap yang belum tercatat di Core API;
- checkout kedaluwarsa menghasilkan pesanan dan token baru;
- settlement kelas mandiri langsung aktif;
- settlement kelas mentor menjadi `paid_pending_approval`;
- reconciliation mengubah pending sesuai status resmi.
