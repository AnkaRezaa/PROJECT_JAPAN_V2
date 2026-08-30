# Mailtrap SMTP dan Template Email

## Email yang Digunakan

- verifikasi email akun manual;
- OTP reset password;
- bukti pembayaran/invoice setelah transaksi sukses;
- notifikasi keputusan enrollment mentor bila notification tersebut diarahkan ke email.

Notifikasi in-app tetap terpisah. `MAIL_NOTIFICATIONS_ENABLED=false` mencegah semua notifikasi aplikasi umum membanjiri email; notifikasi email transaksional khusus tetap memakai notification class masing-masing.

## Development

### Mailtrap Sandbox

Sandbox hanya menangkap email di inbox Mailtrap dan tidak mengirim ke Gmail.

```dotenv
MAIL_MAILER=smtp
MAIL_HOST=sandbox.smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USERNAME=USERNAME_SANDBOX
MAIL_PASSWORD=PASSWORD_SANDBOX
MAIL_FROM_ADDRESS=hello@example.com
MAIL_FROM_NAME="TOKU-UP Local"

MAILTRAP_TEMPLATES_ENABLED=true
MAILTRAP_API_TOKEN=TOKEN_API
MAILTRAP_SANDBOX_INBOX_ID=ID_INBOX_SANDBOX
```

`Missing inbox ID` berarti Template API sandbox dipakai tetapi `MAILTRAP_SANDBOX_INBOX_ID` kosong atau salah.

Untuk testing tanpa koneksi email gunakan:

```dotenv
MAIL_MAILER=log
MAILTRAP_TEMPLATES_ENABLED=false
```

Email akan tertulis pada `storage/logs/laravel.log`.

## Production Email Sending

1. Tambahkan sending domain `rezawalker.web.id` di Mailtrap.
2. Pasang semua DNS record yang diberikan dashboard: verification, DKIM, DMARC, dan tracking.
3. Isi Sender Information dari account owner.
4. Tunggu seluruh record berstatus Verified.
5. Buat API token production.
6. Buat tiga template Mailtrap dan salin HTML dari `docs/mailtrap-templates/`.
7. Salin UUID template dari tab integration.

Contoh production:

```dotenv
MAIL_MAILER=smtp
MAIL_SCHEME=null
MAIL_HOST=live.smtp.mailtrap.io
MAIL_PORT=587
MAIL_USERNAME=apismtp@mailtrap.io
MAIL_PASSWORD=TOKEN_API_MAILTRAP
MAIL_FROM_ADDRESS=noreply@rezawalker.web.id
MAIL_FROM_NAME="TOKU-UP"

MAILTRAP_TEMPLATES_ENABLED=true
MAILTRAP_API_TOKEN=TOKEN_API_MAILTRAP
MAILTRAP_API_ENDPOINT=https://send.api.mailtrap.io/api/send
MAILTRAP_SANDBOX_INBOX_ID=
MAILTRAP_TEMPLATE_PASSWORD_RESET_OTP_UUID=UUID_TEMPLATE_OTP
MAILTRAP_TEMPLATE_VERIFY_EMAIL_UUID=UUID_TEMPLATE_VERIFIKASI
MAILTRAP_TEMPLATE_PURCHASE_RECEIPT_UUID=UUID_TEMPLATE_INVOICE
```

Username production SMTP adalah `apismtp@mailtrap.io`; password-nya token API yang ditampilkan integration, bukan password akun Mailtrap.

## Cara Pengiriman di Kode

`MailtrapTemplateChannel` memanggil `MailtrapTemplateService` jika template API aktif dan UUID tersedia. Bila template tidak dikonfigurasi atau pengiriman template gagal sesuai fallback notification, email Laravel SMTP digunakan. Frontend tidak menerima token atau UUID.

Jika `QUEUE_CONNECTION=sync`, request mengirim email langsung. Jika notification masuk antrean database, worker harus hidup:

```bash
php artisan queue:work database --queue=mail,default --tries=3
```

## Uji End-to-End

1. Registrasi manual dengan Gmail uji.
2. Pastikan email verifikasi masuk dan link kembali ke domain production.
3. Uji forgot password dan OTP.
4. Selesaikan pembayaran sandbox Midtrans.
5. Pastikan invoice terkirim setelah transaksi menjadi `success`, bukan saat checkout dibuat.
6. Periksa Email Logs, bounce, spam complaint, dan log Laravel.

## Troubleshooting

- OTP/verifikasi masuk tetapi invoice tidak: periksa status transaksi, queue/job `PurchaseReceiptNotification`, serta UUID invoice.
- Job `DONE` tetapi email tidak terlihat: periksa Email Logs Mailtrap, penerima, folder spam, dan apakah endpoint sandbox masih dipakai.
- Link email menuju IP VPS: set `APP_URL` ke domain HTTPS, lalu bersihkan config cache.
- Gmail tidak menerima email sandbox: perilaku normal; gunakan Email Sending production dengan domain verified.
- Domain `Unverified`: tunggu propagasi DNS, pastikan record ada pada nameserver aktif, lalu klik verify kembali.

## Keamanan

- Rotasi token yang pernah ditempel ke chat, screenshot, atau Git.
- Jangan menaruh credential di template HTML.
- Gunakan DMARC awal `p=none` untuk observasi, kemudian naikkan kebijakan setelah delivery stabil.
