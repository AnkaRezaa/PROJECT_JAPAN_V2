# TOKU-UP

TOKU-UP (Tokutei-Ginou Upgrade) adalah platform belajar bahasa Jepang untuk siswa mandiri dan kelas yang dipandu mentor. Siswa mengikuti materi per Minggu dan Hari, mengulang kosakata, berlatih menulis kanji, serta mengambil latihan dan simulasi JLPT, JFT-Basic, dan SSW.

- **Siswa:** roadmap belajar, materi dan presentasi, flashcard, kuis Kosakata/Grammar/Dokkai, ujian, progres, dan ruang kelas live.
- **Admin dan mentor:** kelola materi, bank konten, kuis, serta aktivitas belajar sesuai cakupan.
- **SuperAdmin:** kelola operasional, pembayaran, kloter, dan pengaturan platform.

## Stack

| Bagian | Teknologi |
| --- | --- |
| Backend | PHP 8.3, Laravel 13, MySQL/MariaDB |
| Frontend | Inertia.js, React 18, Vite 8, Tailwind CSS |
| Kelas live | LiveKit untuk audio/video, Laravel Reverb untuk event realtime |
| Integrasi | Midtrans Snap, Google OAuth melalui Laravel Socialite, Mailtrap |
| Pengujian dan CI | Pest, GitHub Actions |

## Mulai di Lokal

Prasyarat: PHP 8.3 dan Composer 2, Node.js 22.12+ dan npm, serta MySQL/MariaDB. Dari root repo:

```bash
composer install
npm ci
cp .env.example .env
php artisan key:generate
```

Di PowerShell, ganti `cp` dengan `Copy-Item .env.example .env`. Buat database lokal dan isi pengaturan `DB_*` di `.env`, lalu jalankan:

```bash
php artisan migrate
php artisan storage:link
```

Buka dua terminal: jalankan `php artisan serve` di terminal pertama dan `npm run dev` di terminal kedua. Aplikasi tersedia di `http://127.0.0.1:8000`. Seeder demo bersifat opsional dan hanya untuk database lokal yang boleh direset.

Untuk menguji ruang kelas live, siapkan Reverb dan LiveKit secara terpisah. Lihat [panduan realtime lokal](docs/06-live-class/development.md).

## Aturan Produk Utama

- Role backend tetap `user`, `admin`, dan `superadmin`.
- Mentor adalah admin pengampu kloter, bukan role baru.
- `scope_type=program` adalah Kelas Mandiri dan aktif setelah pembayaran valid.
- `scope_type=kloter` adalah Kelas Mentor dan menunggu approval mentor setelah pembayaran valid.
- Scope global hanya kompatibilitas data lama; tidak ditawarkan untuk checkout baru.
- Access key adalah jalur manual alternatif, bukan langkah wajib setelah Midtrans.
- Konten program disimpan sekali dan dipakai bersama oleh seluruh kloter program.
- Presentasi offline dan ruang kelas live menggunakan deck yang sama.

## Pengujian dan Deploy

Tes Laravel memakai database terpisah `Project_japan_test` dari [phpunit.xml](phpunit.xml). Siapkan database tes sebelum menjalankan suite; jangan arahkan tes ke database produksi.

```bash
php artisan test
npm run build
composer audit --locked --no-interaction
npm audit --omit=dev
```

Jangan commit `.env`, credential vendor, `livekit.yaml`, backup database, atau file yang mengandung secret.

[GitHub Actions](.github/workflows/ci-deploy.yml) menjalankan tes dan build pada pull request dan push ke `main`. Deploy awal dijalankan manual dari GitHub Actions setelah konfigurasi environment `production`. VPS menerima commit yang diuji serta aset hasil build; workflow tidak menjalankan migrasi atau seeder produksi.

## Dokumentasi

- [Handbook proyek](docs/README.md): arsitektur, integrasi, dan panduan pemeliharaan.
- [Deploy VPS dan setup GitHub Actions](docs/02-deployment/vps-debian.md#github-actions-tes-otomatis-deploy-manual).
- [Testing dan checklist rilis](docs/10-testing/release-checklist.md).
