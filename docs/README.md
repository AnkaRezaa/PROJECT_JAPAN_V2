# TOKU-UP - Dokumentasi Proyek

Dokumentasi ini adalah handbook teknis dan operasional TOKU-UP. Gunakan folder `.A_context_project/` untuk membaca riwayat keputusan dan revisi klien; gunakan folder `docs/` untuk setup, deployment, pengoperasian, dan verifikasi sistem yang sedang berlaku.

## Urutan Baca

1. [Arsitektur dan aturan produk](00-overview/architecture-and-product.md)
2. [Setup lokal Windows/Laragon](01-development/local-setup.md)
3. [Referensi environment](01-development/environment-reference.md)
4. [Deployment VPS Debian](02-deployment/vps-debian.md)
5. [Nginx, TLS, dan service](02-deployment/nginx-ssl-services.md)
6. [SEO dan peluncuran domain final](02-deployment/seo-and-search-console.md)
7. [Google OAuth dan autentikasi email](03-auth/google-oauth-and-email-verification.md)
8. [Mailtrap SMTP dan template email](04-email/mailtrap.md)
9. [Midtrans](05-payment/midtrans.md)
10. [Kelas mandiri, mentor, kloter, dan access key](05-payment/access-and-kloter.md)
11. [Arsitektur kelas realtime](06-live-class/architecture-and-operations.md)
12. [Kelas realtime di development](06-live-class/development.md)
13. [Kelas realtime di production](06-live-class/production.md)
14. [Konten, roadmap, dan progress](07-learning/content-roadmap.md)
15. [Gamifikasi](07-learning/gamification.md)
16. [Ekspansi multi-kurikulum](07-learning/multi-curriculum.md)
17. [Bantuan baca dan feedback produk](07-learning/reading-assistance-and-feedback.md)
18. [Scheduler, queue, backup, dan monitoring](08-operations/scheduler-queue-backup.md)
19. [Hardening keamanan](09-security/hardening.md)
20. [Retensi dan penghapusan akun](09-security/account-retention-and-deletion.md)
21. [Testing dan checklist rilis](10-testing/release-checklist.md)
22. [Troubleshooting](11-troubleshooting/common-errors.md)
23. [Referensi seluruh file kode dan resource](12-code-reference/README.md)

Template HTML Mailtrap berada di [mailtrap-templates](mailtrap-templates/).

## Prinsip Dokumentasi

- Jangan menyimpan token, password, API key, secret, atau isi `.env` nyata dalam Git.
- Perintah production memakai contoh path `/var/www/project_japan_v2` dan user `webtest`; sesuaikan bila server berubah.
- Domain contoh production adalah `rezawalker.web.id` dan subdomain LiveKit `live.rezawalker.web.id`.
- `APP_URL` hanya satu URL kanonis. IP VPS bukan URL aplikasi setelah domain aktif.
- Document root web server harus menunjuk ke `public/`, bukan root repository.
- Checklist lama yang menyatakan kelas realtime belum ada sudah usang. Model, controller, UI, Reverb, dan LiveKit integration kini tersedia, tetapi tetap wajib diuji end-to-end di staging sebelum dinyatakan siap production.

## Batas Tanggung Jawab

Repository menyiapkan aplikasi dan contoh service. Konfigurasi DNS, Cloudflare, firewall provider, kredensial vendor, serta kebijakan backup tetap harus diterapkan pada akun dan server production.
