# Setup Development Windows dan Laragon

## Prasyarat

- Windows 10/11 dan Laragon
- PHP 8.3 dengan `pdo_mysql`, `curl`, `mbstring`, `openssl`, `xml`, `zip`, `gd`, dan `intl`
- MySQL/MariaDB
- Composer
- Node.js 22 dan npm
- Git

Untuk kelas realtime tambahkan LiveKit Server Windows. Lihat [panduan realtime development](../06-live-class/development.md).

## Instalasi Awal

```powershell
cd C:\laragon\www\project_japan\toku-up
composer install
npm install
Copy-Item .env.example .env
php artisan key:generate
```

Jangan menimpa `.env` lama bila sudah berisi konfigurasi lokal yang valid.

## Database

Buat database MySQL, lalu isi `.env`:

```dotenv
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=Project_japan
DB_USERNAME=root
DB_PASSWORD=
```

Jalankan:

```powershell
php artisan optimize:clear
php artisan migrate
php artisan db:seed
```

Untuk menyiapkan seluruh data demo yang konsisten, gunakan:

```powershell
php artisan db:seed --class=DemoDataSeeder
```

Seeder ini dapat dijalankan ulang dan akan mereset dataset demo yang dikenali sebelum membuat dua kelas contoh: kelas mandiri dan kelas mentor. Baca isi seeder sebelum menjalankannya pada database yang sudah berisi data client. Jangan menjalankan `migrate:fresh --seed` pada production.

## Menjalankan Aplikasi

Dengan virtual host Laragon:

```powershell
npm run dev
```

Atau dengan server Artisan:

```powershell
php artisan serve --host=127.0.0.1 --port=8000
npm run dev
```

Jika queue menggunakan `database`, jalankan worker hanya bila notifikasi/job memang dibuat asynchronous:

```powershell
php artisan queue:work database --queue=mail,default --tries=3
```

Untuk trafik kecil, `QUEUE_CONNECTION=sync` memproses email langsung dan tidak membutuhkan worker.

## Build dan Test Dasar

```powershell
npm run build
php artisan test
php artisan route:list
php artisan schedule:list
```

Pemeriksaan keamanan dependency:

```powershell
composer audit --locked --no-interaction
npm audit --omit=dev
```

## Akun Demo

Semua akun berikut memakai password `TOKU-UP#2026`:

- `superadmin@toku-up.com`: superadmin.
- `admin@toku-up.com`: admin global.
- `admin.kloter@toku-up.com`: admin mentor/pengampu kloter.
- `student@toku-up.com`: siswa kelas mandiri.
- `student2@toku-up.com`: siswa kelas mentor.

Email demo ditandai sudah terverifikasi sehingga login pertama tidak memicu OTP ke alamat dummy. Kredensial ini hanya untuk development, staging, dan demonstrasi client.

## Masalah Umum

- `Unable to locate file in Vite manifest`: jalankan `npm install`, lalu `npm run build`, atau hidupkan Vite dev server.
- `npm ci` tidak sinkron: perbarui lockfile di local dengan versi Node/npm yang sama, commit `package-lock.json`, lalu ulangi `npm ci`.
- `could not find driver`: periksa `php -m`; aktifkan `pdo_mysql` pada PHP CLI Laragon.
- `.env is invalid`: komentar dotenv memakai `#`, bukan `//`.
- Perubahan `VITE_*` tidak terbaca: restart Vite atau build ulang.
