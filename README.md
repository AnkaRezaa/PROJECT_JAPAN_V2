# TOKU-UP

TOKU-UP (Tokutei-Ginou Upgrade) adalah platform belajar bahasa Jepang berbasis kelas. Aplikasi menggabungkan roadmap Week/Day, presentasi, bank konten, kuis dan repetisi, ujian mingguan, handwriting kanji, progress, gamifikasi, pembayaran Midtrans, kloter mentor, serta ruang kelas realtime.

## Dokumentasi

Handbook lengkap tersedia di [docs/README.md](docs/README.md). Mulai dari sana untuk:

- setup Windows/Laragon;
- deployment VPS Debian, Nginx, TLS, scheduler, dan backup;
- Google OAuth dan verifikasi email;
- Mailtrap SMTP/template;
- Midtrans, idempotensi, reconciliation, dan approval kelas mentor;
- Reverb dan LiveKit untuk kelas realtime;
- struktur konten, roadmap, ujian, handwriting, dan gamifikasi;
- hardening keamanan, testing, serta troubleshooting.

Folder `.A_context_project/` menyimpan riwayat keputusan dan revisi klien. Untuk prosedur operasional gunakan `docs/`; untuk perilaku sistem gunakan kode dan test aktif.

## Stack

- Laravel 13 dan PHP 8.3
- MySQL/MariaDB
- Inertia.js, React 18, Vite 8, Tailwind CSS
- Midtrans Snap
- Laravel Socialite
- Mailtrap
- Laravel Reverb dan LiveKit

## Quick Start

```bash
composer install
npm install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan db:seed
php artisan serve
npm run dev
```

Pada PowerShell gunakan `Copy-Item .env.example .env` sebagai pengganti `cp`.

Untuk kelas realtime, Reverb dan LiveKit harus dijalankan sebagai proses terpisah. Lihat [setup realtime development](docs/06-live-class/development.md).

## Aturan Produk Utama

- Role backend tetap `user`, `admin`, dan `superadmin`.
- Mentor adalah admin pengampu kloter, bukan role baru.
- `scope_type=program` adalah Kelas Mandiri dan aktif setelah pembayaran valid.
- `scope_type=kloter` adalah Kelas Mentor dan menunggu approval mentor setelah pembayaran valid.
- Scope global hanya kompatibilitas data lama; tidak ditawarkan untuk checkout baru.
- Access key adalah jalur manual alternatif, bukan langkah wajib setelah Midtrans.
- Konten program disimpan sekali dan dipakai bersama oleh seluruh kloter program.
- Presentasi offline dan ruang kelas live menggunakan deck yang sama.

## Pemeriksaan Dasar

```bash
php artisan test
npm run build
composer audit --locked --no-interaction
npm audit --omit=dev
```

Jangan commit `.env`, credential vendor, `livekit.yaml`, backup database, atau file yang mengandung secret.
