# Google OAuth dan Autentikasi Email

## Akun Pengelola

- Admin Global, Mentor Kelas, dan Superadmin dibuat lebih dahulu oleh Superadmin.
- Login Google pertama hanya menautkan akun jika Google menyatakan email terverifikasi dan alamatnya sama dengan email database.
- Login Google tidak pernah membuat atau menaikkan role pengelola secara otomatis.
- Email pengelola yang sudah digunakan sebagai identitas Google tidak diedit dari halaman Data Admin.

## Suspend dan Retensi

- Suspend langsung menutup akses dan menjadwalkan anonimisasi setelah 30 hari.
- Reaktivasi sebelum tenggat membatalkan jadwal anonimisasi.
- Mentor Kelas harus melepas atau memindahkan seluruh kloter sebelum disuspend.
- `accounts:anonymize-suspended` menghapus identitas login dan data pribadi, tetapi mempertahankan transaksi, progres, dan audit yang terhubung ke ID internal.

## Alur Login

TOKU-UP memiliki dua jalur:

1. Akun manual: password, verifikasi email, dan OTP reset password melalui email.
2. Google OAuth: callback Socialite, email Google harus terverifikasi, lalu akun user dapat dibuat atau di-link.

Google OAuth tidak membutuhkan OTP Mailtrap tambahan karena Google sudah memverifikasi identitas email. Akun admin/superadmin tidak boleh auto-link hanya berdasarkan email; `google_id` harus sudah terhubung untuk mencegah pengambilalihan akun berprivilege.

## Google Cloud Console

1. Buka Google Cloud Console dan pilih/buat project TOKU-UP.
2. Buka `APIs & Services -> OAuth consent screen`.
3. Isi nama aplikasi, support email, developer contact, homepage, privacy policy, dan terms bila production.
4. Pilih audience yang sesuai. Saat status Testing, tambahkan email tester.
5. Buka `Credentials -> Create Credentials -> OAuth client ID`.
6. Pilih `Web application`.
7. Tambahkan origin dan callback yang benar.

Development Artisan:

```text
Authorized JavaScript origin:
http://127.0.0.1:8000

Authorized redirect URI:
http://127.0.0.1:8000/auth/google/callback
```

Jika memakai domain Laragon, daftarkan domain itu secara terpisah. Jangan mencampur `localhost`, `127.0.0.1`, dan domain `.test`; Google membandingkan URI secara persis.

Production:

```text
Authorized JavaScript origin:
https://rezawalker.web.id

Authorized redirect URI:
https://rezawalker.web.id/auth/google/callback
```

## Environment

```dotenv
GOOGLE_CLIENT_ID=CLIENT_ID_DARI_GOOGLE
GOOGLE_CLIENT_SECRET=CLIENT_SECRET_DARI_GOOGLE
GOOGLE_REDIRECT_URI="${APP_URL}/auth/google/callback"
```

Lalu:

```bash
php artisan optimize:clear
php artisan config:cache
```

## Aturan Keamanan yang Sudah Diterapkan

- OAuth memakai state/session; jangan menambahkan `stateless()`.
- Callback tanpa email terverifikasi ditolak.
- User biasa dapat auto-link berdasarkan email sesuai flow controller.
- Admin dan superadmin tidak auto-link hanya karena alamat email sama.
- Penghapusan akun Google memerlukan reautentikasi Google agar bukan sekadar session aplikasi lama.

## Verifikasi Email Manual

- Registrasi manual memicu `EmailVerificationNotification`.
- Endpoint verifikasi memakai signed URL dan throttle.
- Resend mempunyai cooldown serta pembatasan abuse.
- Akun dummy dari seeder boleh sudah memiliki `email_verified_at` agar tidak mencoba mengirim email ke alamat palsu.

## Reset Password

- Hanya akun dengan password login aktif yang memakai OTP reset password.
- OTP dikirim melalui channel email dan mempunyai masa berlaku/rate limit.
- Scheduler `auth:clear-resets` membersihkan data reset lama.

## Troubleshooting

### `redirect_uri_mismatch`

Bandingkan nilai `GOOGLE_REDIRECT_URI` dengan URI pada Google Console. Periksa scheme, host, port, path, trailing slash, dan cache config.

### Error 400 setelah mengganti domain

Tambahkan callback domain baru di Google Console, ubah `APP_URL`, bersihkan cache, dan coba dari session incognito baru.

### Google masuk tetapi diarahkan ke dashboard lama

Periksa role user dan `PengarahDashboardController`; redirect setelah login mengikuti role, bukan setting Google.

### Akun Google yang dihapus dapat login lagi

Menghapus akun lokal tidak mencabut akun Google milik user. Login Google berikutnya dapat membuat akun baru bila kebijakan registrasi mengizinkan. Revoke akses aplikasi dilakukan user di pengaturan akun Google; aplikasi hanya boleh menghapus link dan data lokal sesuai kebijakan privasi.
