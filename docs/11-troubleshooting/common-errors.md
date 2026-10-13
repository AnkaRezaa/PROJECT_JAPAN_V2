# Troubleshooting Umum

## Laravel dan Vite

### `Unable to locate file in Vite manifest`

```bash
npm ci
npm run build
php artisan optimize:clear
```

Pastikan `resources/js/app.jsx` masih menjadi entry yang didaftarkan pada Blade/Vite config.

### Halaman production putih dan elemen `#app` tidak ada

Jika route menjawab 200 tetapi body hampir kosong, `document.body.innerText` kosong, dan `document.getElementById('app')` menghasilkan `null`, periksa error Nginx/PHP dan manifest:

```bash
sudo tail -n 100 /var/log/nginx/error.log
ls -lh public/build/manifest.json
npm run build
```

Tunggu sampai muncul `built in ...`; pesan chunk lebih besar dari 500 kB hanya warning dan bukan penyebab halaman putih. Setelah manifest tersedia:

```bash
php artisan optimize:clear
php artisan optimize
sudo systemctl restart php8.3-fpm
sudo systemctl reload nginx
```

Peringatan browser bahwa CSS di-preload tetapi belum digunakan biasanya akibat HTML gagal dirender, bukan akar masalahnya.

### Ziggy parameter required

Route `user.checkout` membutuhkan `transactionCode`:

```js
route('user.checkout', { transactionCode })
```

Error bukan berasal dari key Midtrans; pemanggil frontend membuat URL tanpa parameter.

### 422 checkout Midtrans

Periksa response JSON Laravel, `payment_plan_id`, UUID `checkout_request_key`, kebutuhan `kloter_belajar_id`, plan aktif, kapasitas kloter, dan server key. Console browser hanya menunjukkan status; penyebab detail ada di response/log.

### Midtrans menjawab `Transaction doesn't exist`

Midtrans kadang memberi HTTP 200 dengan body `status_code: "404"` untuk sesi Snap yang belum diteruskan user ke metode pembayaran. User masih boleh melanjutkan atau membatalkan checkout. Untuk pembatalan sesi ini, gunakan endpoint Snap dengan token dan Basic Auth server key, bukan header bearer/mentah.

Jika scheduler terus mencatat mismatch untuk kondisi ini, itu keterbatasan handler rekonsiliasi terjadwal saat ini; endpoint pemeriksaan status frontend sudah menanganinya secara terpisah.

### `.env` invalid

Gunakan komentar `#`, bukan `//`. Hindari spasi pada nama key dan quote yang tidak ditutup.

## Dependency npm

### `npm ci` lockfile tidak sinkron

Jalankan `npm install` di development menggunakan versi Node/npm yang disepakati, periksa diff lockfile, commit, lalu `npm ci` di VPS. Jangan mengedit lockfile manual.

### Peer dependency Vite/React plugin

Selaraskan versi `vite` dan `@vitejs/plugin-react` di `package.json`, buat ulang lockfile secara terkontrol, lalu build. `--legacy-peer-deps` hanya workaround sementara.

## Mailtrap

### `Missing inbox ID`

Template API menuju sandbox tetapi `MAILTRAP_SANDBOX_INBOX_ID` kosong. Isi ID sandbox atau nonaktifkan template/sandbox endpoint.

### OTP masuk, invoice tidak

- transaksi harus sudah `success`;
- cek log `PurchaseReceiptNotification`;
- cek `queue:failed` dan worker bila queue database;
- cek UUID template purchase receipt;
- cek Email Logs Mailtrap, bukan hanya inbox Gmail.

### Email menuju IP VPS

Ubah `APP_URL` ke domain HTTPS, lalu `php artisan optimize:clear` dan `config:cache`.

## Google OAuth

### `redirect_uri_mismatch`

URI Google Console dan `.env` harus identik termasuk scheme, host, port, path, dan slash. Bersihkan config cache setelah perubahan.

### Google `generate_204 ERR_BLOCKED_BY_CLIENT`

Biasanya diblokir extension/privacy filter browser dan bukan akar kegagalan OAuth. Fokus pada error OAuth utama, coba Incognito tanpa extension, dan cek callback.

### 502 Bad Gateway setelah Login OAuth (`upstream sent too big header`)

Header response Laravel/Inertia yang membawa cookie session dan preload headers melebihi buffer default Nginx FastCGI. Buka kembali file `/etc/nginx/sites-enabled/project_japan_v2` (atau vhost aktif) pada baris `location ~ \.php$` dan pastikan tertulis seperti ini:

```nginx
        fastcgi_buffer_size 64k;
        fastcgi_buffers 16 32k;
        fastcgi_busy_buffers_size 64k;
```

Lalu jalankan kembali:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

## Database

### Table tidak ditemukan

```bash
php artisan migrate:status
php artisan migrate --force
```

Pastikan `.env` menunjuk database yang benar. Jangan membuat tabel manual hanya untuk menutup error migration yang belum dijalankan.

### Seeder class tidak ditemukan

Pastikan file/class namespace `Database\Seeders`, lalu:

```bash
composer dump-autoload
php artisan db:seed --class=NewsPortalSeeder
```

## LiveKit dan Reverb

### WebSocket `ws://127.0.0.1:7880` gagal

LiveKit belum hidup, bind salah, port diblokir, atau browser berjalan pada perangkat lain sehingga `127.0.0.1` menunjuk perangkat user sendiri. Production harus memakai WSS domain publik.

### `invalid token` / `token malformed`

- samakan API key/secret Laravel dan LiveKit;
- bersihkan config cache;
- sinkronkan jam OS;
- pastikan SDK mengirim publish source sebagai string yang didukung, bukan enum integer yang tidak cocok versi server;
- minta token baru setelah perubahan.

### `POST /admin/live-classes/{id}/token 500`

```bash
tail -n 100 storage/logs/laravel.log
php artisan config:show services.livekit
```

Jangan menampilkan secret saat membagikan output. Periksa package SDK, key, TTL, dan exception sebenarnya.

### Reverb tidak connect

- pastikan service hidup;
- cocokkan `VITE_REVERB_*` dan build ulang;
- proxy `/app` dan `/apps` dengan upgrade header;
- cek `/broadcasting/auth`, cookie, dan membership private channel;
- batasi origin setelah koneksi stabil.

Jika browser menampilkan `You must pass your app key when you instantiate Pusher`, `VITE_REVERB_APP_KEY` kosong ketika bundle dibuat. Isi pasangan `REVERB_*` dan `VITE_REVERB_*`, kemudian jalankan `npm run build`; membersihkan config cache saja tidak mengubah nilai yang sudah tertanam dalam bundle JavaScript.

### Signal connect, audio/video gagal

- buka 7881 TCP dan rentang UDP media di UFW serta firewall provider;
- `use_external_ip: true` di production;
- periksa izin browser;
- uji jaringan seluler;
- jaringan kantor ketat mungkin memerlukan TURN/TLS 443 pada IP terpisah.

### Share screen gagal

Wajib HTTPS/localhost dan harus dipicu klik user. Dukungan audio tergantung pilihan tab/window/screen, browser, dan OS.

### User 403 saat join

User harus login, verified, menjadi anggota aktif kloter sesi, dan belum di-kick. Jangan menghapus authorization untuk memaksa join.

## Production

### Nginx 502

Periksa PHP-FPM socket/version, permission, dan service:

```bash
sudo systemctl status php8.3-fpm
sudo tail -n 100 /var/log/nginx/error.log
```

### Scheduler tidak jalan

Periksa crontab user aplikasi, path PHP, permission, timezone, dan:

```bash
php artisan schedule:list
php artisan schedule:run -v
```

### Disk cepat penuh

```bash
df -h
df -i
du -sh storage/*
sudo journalctl --disk-usage
```

Periksa log, import temporary, build lama, backup lokal, dan snapshot. Jangan menghapus file private yang masih direferensikan database tanpa audit.
