# Kelas Mandiri, Kelas Mentor, Kloter, dan Access Key

## Cakupan Mentor Kelas

Hak Mentor Kelas diturunkan dari `kloter_belajar.admin_id`. Program tanpa kloter yang ditugaskan tidak boleh muncul atau dapat dibuka mentor lewat URL langsung. Kelas mandiri tidak menjadi hak akses mentor.

## Kelas Mandiri

```text
scope_type = program
```

- user membeli satu program;
- pembayaran valid membuat subscription aktif;
- tidak membutuhkan kloter atau approval mentor;
- roadmap terbuka sesuai entitlement program dan aturan progress.

## Kelas Mentor

```text
scope_type = kloter
```

- user memilih kloter aktif milik program saat checkout;
- kapasitas/kursi diperiksa dan direservasi selama transaksi pending;
- pembayaran valid membuat enrollment `paid_pending_approval`;
- subscription belum aktif;
- Mentor Kelas menyetujui atau menolak;
- approval membuat membership dan subscription aktif, dengan durasi mulai pada waktu approval;
- reject memberi notifikasi dan memerlukan proses refund manual bila uang harus dikembalikan.

## Admin dan Mentor

- mentor adalah akun `role=admin` yang menjadi `admin_id` kloter;
- admin global boleh menjadi mentor bila ditetapkan sebagai pengampu kloter;
- Mentor Kelas hanya memproses siswa kloternya;
- admin global dapat melihat seluruh approval, tetapi tetap tidak boleh mengubah data secara ambigu tanpa konteks kloter;
- superadmin membuat kloter dan menetapkan admin pengampu.

## Jalur Persetujuan dan Jalur Manual

```text
Pembayaran mentor: pending_payment -> paid_pending_approval -> active
Administratif: subscription aktif -> ditambahkan manual -> active
```

- Tab **Persetujuan** hanya menampilkan membership `paid_pending_approval` dengan transaksi `success`.
- Admin pengampu menjadi pemroses utama; admin global dapat memproses seluruh kloter sebagai penanggung jawab cadangan.
- Mentor Kelas lain tetap tidak dapat memproses enrollment di luar kloter yang diampunya.
- **Tambahkan Siswa Secara Manual** hanya untuk access key, pembayaran manual, migrasi, atau koreksi administratif. Jalur ini langsung mengaktifkan membership dan tidak masuk antrean persetujuan.
- Status kloter `draft`, `active`, dan `archived` dikelola superadmin. Admin mengatur jadwal, roster, serta persetujuan hanya pada kloter aktif.

## Access Key

Access key adalah alternatif untuk promo, pembayaran manual, atau enrollment administratif.

- key program memberi akses kelas sesuai scope;
- key terikat kloter dapat memasukkan user ke kloter;
- key tidak dikirim otomatis setelah Midtrans;
- key global baru tidak dibuat;
- key global legacy yang belum dipakai ditolak;
- redemption dibatasi rate limit dan divalidasi backend.

## Data Legacy

Subscription global lama tetap dihormati sampai `end_date`. Transaksi global pending lama masih dapat diselesaikan melalui invoice yang sudah ada, tetapi UI tidak menawarkan plan global baru.

## Operasional Superadmin

1. Buat program/kelas.
2. Buat payment plan dengan scope `program` atau `kloter`.
3. Jangan mengaktifkan plan mandiri dan mentor bersamaan untuk program yang sama.
4. Untuk mentor, buat kloter aktif, tentukan kapasitas/tanggal mulai, lalu assign admin pengampu.
5. Pantau transaksi, enrollment pending, approval, penolakan, dan kebutuhan refund.

## Operasional Admin

1. Buka daftar user/kloter.
2. Periksa peserta `paid_pending_approval`.
3. Cocokkan pembayaran, kelas, dan kloter.
4. Approve atau reject dengan konfirmasi.
5. Jangan membuat subscription manual jika flow approval sudah memprosesnya.

## Pengujian

- plan program tidak meminta kloter;
- plan kloter wajib memilih kloter yang aktif, belum penuh, dan berasal dari program yang sama;
- user di luar transaksi tidak dapat membuka invoice;
- pembayaran mentor tidak membuka roadmap sebelum approval;
- approval berulang idempoten;
- admin bukan pengampu mendapat 403;
- reject melepas/menandai enrollment sesuai aturan;
- access key tidak membuat membership/subscription ganda.
