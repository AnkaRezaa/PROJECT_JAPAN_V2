# Arsitektur dan Aturan Produk

## Tujuan Produk

TOKU-UP adalah LMS bahasa Jepang berbasis kelas. Alur utamanya bukan halaman materi panjang, tetapi:

```text
Kelas -> Week -> aktivitas terurut -> Day -> kuis/repetisi -> ujian -> progress
```

Presentasi dapat ditempatkan sebagai pembuka Week, setelah Day tertentu, atau penutup Week. Bank Konten N3 menjadi sumber kosakata, kanji, dan bunpo. Flashcard dan handwriting dipakai dalam alur repetisi kuis; ujian mingguan memakai pengalaman terpisah tanpa XP dan repetisi.

## Stack

- Laravel 13, PHP 8.3, MySQL/MariaDB
- Inertia.js, React 18, Vite 8, Tailwind CSS, Material UI Icons
- Midtrans Snap untuk pembayaran
- Laravel Socialite untuk Google OAuth
- Mailtrap SMTP dan Template API untuk email transaksional
- Laravel Reverb untuk state kolaborasi realtime
- LiveKit untuk kamera, mikrofon, dan screen sharing
- Fabric.js/PDF.js untuk presentasi dan papan
- `kanji-recognizer` serta aset stroke lokal untuk handwriting

## Role dan Batas Akses

### User

- mendaftar manual atau login Google;
- membeli kelas, menggunakan access key, dan mengikuti kloter;
- membuka roadmap, presentasi, kuis, ujian, progress, leaderboard, berita, dan ruang kelas;
- hanya dapat masuk ruang live jika menjadi anggota aktif kloter sesi.

### Admin

- mengelola konten kelas bersama: Week, Day, presentasi, flashcard/repetisi, kuis, ujian, dan Bank Konten;
- Mentor Kelas melihat data operasional siswa pada kloter yang diampu;
- admin global dapat melihat seluruh area admin, tetapi ruang live tetap memerlukan hubungan pengampu pada kloter;
- mentor adalah label UI untuk admin pengampu, bukan role backend baru.

### Superadmin

- mengelola user, admin, scope admin, kloter, payment plan, transaksi, access key, berita, gamifikasi, sistem, dan audit;
- bukan editor utama materi pembelajaran.

## Mode Kelas dan Pembayaran

- `scope_type=program`: Kelas Mandiri. Pembayaran valid langsung mengaktifkan subscription kelas.
- `scope_type=kloter`: Kelas Mentor. User memilih kloter, pembayaran valid menghasilkan `paid_pending_approval`, lalu mentor/admin menyetujui enrollment.
- Scope `global` hanya kompatibilitas data lama. Plan, checkout, dan access key global baru tidak boleh dibuat.
- Access key adalah jalur manual alternatif, bukan langkah setelah pembayaran Midtrans.

## Komponen Utama

```text
app/Http/Controllers/       HTTP dan Inertia entry point
app/Services/               aturan akses dan proses domain
app/Models/                 model Eloquent
app/Events/                 event domain dan realtime
app/Notifications/          OTP, verifikasi, invoice
app/Console/Commands/       maintenance dan reconciliation
resources/js/Pages/         halaman per role
resources/js/Components/    komponen UI dan fitur bersama
routes/web.php              route aplikasi
routes/auth.php             autentikasi
routes/channels.php         otorisasi private broadcast channel
routes/console.php          scheduler
database/migrations/        skema database
database/seeders/           data demo dan referensi
tests/Feature/              test alur utama
```

## Sumber Kebenaran

1. Kode dan migration aktif.
2. Dokumentasi di `docs/`.
3. Keputusan terbaru di `.A_context_project/Revisi/` dan `.A_context_project/(new)Chat WhatsApp dengan Fuad (Jepang)/`.
4. Catatan lama hanya referensi; jangan menghidupkan kembali flow yang sudah diganti.

## Fitur yang Harus Divalidasi Manual

- kamera, mikrofon, share screen, reconnect, dan TURN pada jaringan berbeda;
- handwriting pada Chrome/Edge mobile dan desktop dengan touch, mouse, serta trackpad;
- payment Midtrans dan approval mentor sebagai satu alur staging;
- delivery email production dan reputasi domain;
- import spreadsheet besar serta laporan baris gagal.
