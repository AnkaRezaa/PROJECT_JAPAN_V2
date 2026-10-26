# Hardening Keamanan

## Web Root dan Nginx

- document root hanya `/var/www/project_japan_v2/public`;
- blokir dotfiles, `.env`, log, SQL, backup, `artisan`, dan directory listing;
- jangan expose root repo, `vendor`, atau `storage/app/private`;
- hapus `public/hot` dari artifact production;
- gunakan HTTPS dan redirect HTTP ke HTTPS.

Uji:

```bash
curl -I https://rezawalker.web.id/.env
curl -I https://rezawalker.web.id/composer.json
curl -I https://rezawalker.web.id/artisan
curl -I https://rezawalker.web.id/storage/logs/laravel.log
```

Harus 403/404.

## Environment Production

```dotenv
APP_ENV=production
APP_DEBUG=false
SESSION_SECURE_COOKIE=true
SESSION_HTTP_ONLY=true
SESSION_SAME_SITE=lax
```

Gunakan secret production baru. Jika secret pernah terekspos, rotasi database, Midtrans, Google, Mailtrap, Reverb, LiveKit, Redis/storage, dan rencanakan rotasi APP_KEY dengan dampak session/data terenkripsi.

## Authentication

- OAuth memakai state, bukan `stateless()`;
- email Google harus verified;
- akun manual dengan email terverifikasi dapat ditautkan ke identitas Google terverifikasi yang cocok; role dan akses tidak berubah;
- pemulihan akun manual yang belum terverifikasi melalui Google menonaktifkan password lama, mengganti hash password dan remember token, serta menghapus OTP reset yang tertunda;
- akun nonaktif atau email yang sudah terikat ke identitas Google lain ditolak sebelum perubahan data;
- endpoint sensitif memakai throttle;
- penghapusan akun meminta konfirmasi autentikasi sesuai jenis akun;
- akun manual wajib verifikasi email sesuai kebijakan aplikasi.

### Sesi dan Pembatasan Login

- Middleware `AuthenticateSession` Laravel memeriksa kecocokan password pada setiap request web yang terautentikasi. Event `Login` langsung menyimpan HMAC password di sesi, tanpa menunggu redirect berikutnya.
- Reset password atau pemulihan Google membuat sesi lama ditolak pada request berikutnya. Perubahan password dari profil mempertahankan sesi browser yang melakukan perubahan, tetapi menolak sesi browser lain.
- Batas terpusat di `config/auth.php`: 5 kegagalan per email-IP dalam 60 detik, 20 kegagalan per akun lintas IP dalam 900 detik, dan 60 request per IP lintas email dalam 60 detik.
- Email login dinormalisasi; key limiter di-hash. Login berhasil menghapus penghitung kegagalan akun dan email-IP, tetapi tidak menghapus kuota IP. Batas IP juga mencakup payload tidak valid dan merespons HTTP 429 dengan `Retry-After`.
- Cache limiter harus persisten lintas request. Pada multi-instance, gunakan cache bersama. Pastikan konfigurasi trusted proxy sesuai infrastruktur agar IP yang dihitung benar.

### Deployment Satu Kali: Logout Sesi Lama

Sesi sebelum patch belum mempunyai snapshot password. Pada rilis patch ini, logout seluruh pengguna satu kali dengan menghapus sesi dan mencabut remember token. Jadwalkan di luar kelas/ujian aktif; pengguna perlu login kembali. Ini bukan prosedur untuk setiap deployment. Tidak perlu mengganti `APP_KEY`, mengubah password pengguna, atau menjalankan seeder.

Aktifkan maintenance, deploy kode, lalu bersihkan cache konfigurasi:

```bash
php artisan down
# Deploy kode sesuai prosedur VPS.
php artisan optimize:clear
```

Jalankan dari root aplikasi VPS menggunakan user pemilik aplikasi. Perintah berikut hanya mendukung driver `database` atau direktori sesi `file` standar; driver/path lain harus diperiksa terlebih dahulu. Jangan melanjutkan ke `artisan up` jika gagal.

```bash
php artisan tinker --execute='
$driver = config("session.driver");
if (! in_array($driver, ["database", "file"], true)) {
    throw new RuntimeException("Driver sesi perlu ditinjau sebelum pencabutan.");
}
if ($driver === "file") {
    $path = realpath(config("session.files"));
    $expected = realpath(storage_path("framework/sessions"));
    if (! $path || ! $expected || $path !== $expected) {
        throw new RuntimeException("Direktori sesi tidak standar; hentikan dan periksa.");
    }
    foreach (Illuminate\Support\Facades\File::files($path) as $file) {
        if (preg_match("/^[A-Za-z0-9]{40}$/D", $file->getFilename())
            && ! Illuminate\Support\Facades\File::delete($file->getPathname())) {
            throw new RuntimeException("Gagal mencabut salah satu sesi.");
        }
    }
} else {
    Illuminate\Support\Facades\DB::connection(config("session.connection"))
        ->table(config("session.table", "sessions"))->delete();
}
App\Models\Pengguna::query()->whereNotNull("remember_token")
    ->update(["remember_token" => null]);
echo "Sesi dan remember token lama sudah dicabut.\n";
'
```

Setelah perintah berhasil, bangun kembali cache sesuai prosedur deployment, jalankan `php artisan up`, lalu smoke-test login manual, Google, logout, dan reset password. Jangan menjalankan pencabutan ini pada database development/test yang bukan target rilis.

## Authorization dan IDOR

- route-model binding bukan authorization;
- selalu periksa ownership/program/kloter/publish/entitlement pada service backend;
- user tidak boleh membuka invoice, flashcard, kuis, PDF, atau live room milik scope lain;
- Mentor Kelas dibatasi ke kloter yang diampu;
- UI tersembunyi bukan kontrol akses.

## Payment

- API pembayaran user memakai pemeriksaan role/status akun; akun suspended ditolak dan sesi request tersebut dicabut. Webhook Midtrans tetap diproses terpisah dari sesi user.
- Checkout, Snap, dan charge baru hanya untuk program `published`, termasuk invoice pending. Riwayat, pembatalan, sinkronisasi, serta webhook transaksi lama tetap diproses; instruksi Midtrans yang sudah terbit tidak dibatalkan otomatis.
- Fallback gambar QR dibuat lokal di browser. Jangan mengirim `qr_string` atau deeplink pembayaran ke generator gambar pihak ketiga; URL fallback lama diabaikan tanpa mengubah catatan transaksi.
- validasi signature sebelum status diproses;
- cocokkan nominal/order/program/kloter;
- mapping status fail-closed;
- gunakan lock, idempotency key, dan constraint;
- webhook tidak memakai CSRF tetapi hanya endpoint tersebut yang dikecualikan;
- jangan throttle retry resmi terlalu agresif;
- monitor pending dan reconciliation.

## File Upload dan Import

- validasi MIME dan signature file;
- batasi ukuran upload, hasil ekstraksi, entry ZIP, XML, baris, kolom, dan sel;
- gunakan `LIBXML_NONET`;
- tolak path traversal;
- simpan source private;
- jangan percaya file hanya karena uploader admin.

## XSS dan Data Frontend

- setiap `dangerouslySetInnerHTML` harus menerima HTML yang sudah disanitasi backend/service;
- jangan mengirim full Eloquent model jika UI hanya perlu beberapa field;
- jangan kirim path storage, import summary, speaker notes, atau metadata internal ke user;
- security header yang disarankan: CSP bertahap, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, dan frame policy yang tidak memblokir integrasi yang memang dibutuhkan.

## Realtime

- Reverb origin production tidak boleh `*`;
- token LiveKit diterbitkan backend setelah authorization dan TTL pendek;
- key/secret tidak masuk frontend;
- mic block ditegakkan LiveKit server;
- kicked participant tidak mendapat token baru;
- 7880 dan 8080 internal;
- media UDP hanya port yang dibutuhkan;
- snapshot papan dibatasi ukuran dan dinormalisasi.

## DDoS dan Abuse

- gunakan Cloudflare/WAF untuk serangan volumetrik, TLS, bot filtering, dan edge rate limit;
- limiter Laravel melindungi checkout, sync/cancel, access key, auth, import, learning actions, serta live room;
- Turnstile/CAPTCHA hanya ditambahkan pada endpoint yang benar-benar diserang, misalnya register/login/reset; tidak perlu mengganggu semua user belajar;
- Redis tidak wajib untuk single VPS, tetapi limiter/cache bersama memerlukannya saat multi-instance.

## Audit Dependency

```bash
composer audit --locked --no-interaction
npm audit --omit=dev
```

Jalankan ulang di CI karena advisory berubah dari waktu ke waktu. Jangan menjalankan `npm audit fix --force` tanpa review breaking change.

## Checklist Incident

1. Putus/disable credential yang bocor.
2. Simpan log dan timeline; jangan langsung menghapus bukti.
3. Rotasi secret dan revoke session/token.
4. Periksa transaksi, perubahan admin, download private, dan login abnormal.
5. Patch akar masalah dan uji.
6. Beri tahu pihak terkait sesuai dampak data dan kewajiban hukum.
7. Dokumentasikan tindakan pencegahan.
