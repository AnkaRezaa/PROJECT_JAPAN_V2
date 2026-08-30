# Referensi Environment

Salin `.env.example`, lalu isi secret hanya pada environment masing-masing. Nilai di bawah adalah pola, bukan kredensial siap pakai.

## Aplikasi dan Database

```dotenv
APP_NAME="TOKU-UP"
APP_ENV=local
APP_KEY=
APP_DEBUG=true
APP_URL=http://127.0.0.1:8000

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=Project_japan
DB_USERNAME=root
DB_PASSWORD=

SESSION_DRIVER=database
CACHE_STORE=database
QUEUE_CONNECTION=sync
FILESYSTEM_DISK=local
```

Production wajib memakai `APP_ENV=production`, `APP_DEBUG=false`, URL HTTPS, cookie secure, dan secret baru.

## Google OAuth

```dotenv
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI="${APP_URL}/auth/google/callback"
```

URI callback harus sama karakter demi karakter dengan Google Cloud Console.

## Midtrans

```dotenv
MIDTRANS_SERVER_KEY=
MIDTRANS_CLIENT_KEY=
MIDTRANS_IS_PRODUCTION=false
MIDTRANS_IS_SANITIZED=true
MIDTRANS_IS_3DS=true
MIDTRANS_SNAP_EXPIRY_HOURS=24
```

Server key tidak pernah dikirim ke frontend. Client key memang dipakai Snap di browser. `MIDTRANS_SNAP_EXPIRY_HOURS` menentukan masa berlaku checkout Snap dan batas checkout pending lokal sebelum dapat diganti dengan pesanan baru.

## Email dan Mailtrap

```dotenv
MAIL_MAILER=smtp
MAIL_SCHEME=null
MAIL_HOST=live.smtp.mailtrap.io
MAIL_PORT=587
MAIL_USERNAME=apismtp@mailtrap.io
MAIL_PASSWORD=
MAIL_FROM_ADDRESS=noreply@rezawalker.web.id
MAIL_FROM_NAME="TOKU-UP"

MAIL_NOTIFICATIONS_ENABLED=false
MAILTRAP_TEMPLATES_ENABLED=true
MAILTRAP_API_TOKEN=
MAILTRAP_API_ENDPOINT=https://send.api.mailtrap.io/api/send
MAILTRAP_SANDBOX_INBOX_ID=
MAILTRAP_TEMPLATE_PASSWORD_RESET_OTP_UUID=
MAILTRAP_TEMPLATE_VERIFY_EMAIL_UUID=
MAILTRAP_TEMPLATE_PURCHASE_RECEIPT_UUID=
```

`MAILTRAP_SANDBOX_INBOX_ID` kosong pada production. Detail ada di [Mailtrap](../04-email/mailtrap.md).

## Reverb

```dotenv
BROADCAST_CONNECTION=reverb
REVERB_APP_ID=toku-up-local
REVERB_APP_KEY=
REVERB_APP_SECRET=
REVERB_HOST=127.0.0.1
REVERB_PORT=8080
REVERB_SCHEME=http
REVERB_SERVER_HOST=127.0.0.1
REVERB_SERVER_PORT=8080
REVERB_SCALING_ENABLED=false

VITE_REVERB_APP_KEY="${REVERB_APP_KEY}"
VITE_REVERB_HOST="${REVERB_HOST}"
VITE_REVERB_PORT="${REVERB_PORT}"
VITE_REVERB_SCHEME="${REVERB_SCHEME}"
```

Pada production, browser mengakses Reverb lewat WSS pada domain, sementara proses Reverb tetap bind ke `127.0.0.1:8080` di belakang Nginx.

## LiveKit

```dotenv
LIVEKIT_API_URL=http://127.0.0.1:7880
LIVEKIT_WS_URL=ws://127.0.0.1:7880
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
LIVEKIT_TOKEN_TTL=900
```

Pada production, `LIVEKIT_API_URL` tetap internal dan `LIVEKIT_WS_URL` menjadi `wss://live.rezawalker.web.id`.

## Setelah Mengubah Environment

```bash
php artisan optimize:clear
php artisan config:cache
```

Restart Reverb, queue worker, dan PHP-FPM bila perubahan dilakukan di production. Build ulang frontend jika nilai `VITE_*` berubah.

## Aturan Secret

- Jangan commit `.env`, backup `.env`, `livekit.yaml`, token Mailtrap, atau key vendor.
- Jangan memakai secret development di production.
- Rotasi secret jika pernah masuk Git, log publik, screenshot, atau server dengan document root salah.
- Rotasi `APP_KEY` dengan rencana khusus karena session dan data terenkripsi lama dapat tidak terbaca.
