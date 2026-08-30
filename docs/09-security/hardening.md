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
- admin/superadmin tidak auto-link berdasarkan email;
- endpoint sensitif memakai throttle;
- penghapusan akun meminta konfirmasi autentikasi sesuai jenis akun;
- akun manual wajib verifikasi email sesuai kebijakan aplikasi.

## Authorization dan IDOR

- route-model binding bukan authorization;
- selalu periksa ownership/program/kloter/publish/entitlement pada service backend;
- user tidak boleh membuka invoice, flashcard, kuis, PDF, atau live room milik scope lain;
- Mentor Kelas dibatasi ke kloter yang diampu;
- UI tersembunyi bukan kontrol akses.

## Payment

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
