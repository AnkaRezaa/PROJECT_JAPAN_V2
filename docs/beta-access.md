# Beta 50 akun

## Aktivasi

Backup database sebelum deploy, jalankan `php artisan migrate --force` dan build aset. Pengaturan baru default nonaktif. Tidak perlu mengubah flag Coming Soon untuk mengaktifkan aturan akses beta.

Superadmin -> Sistem -> Beta:

1. Aktifkan Mode beta dan Pendaftaran, lalu Simpan.
2. Kuota tetap 50 akun baru, dihitung sejak pembuatan akun. Akun belum verifikasi dan suspended tetap menggunakan slot; penghapusan permanen melepas slot.
3. Isi Jadwal buka dalam WIB atau gunakan Buka Sekarang setelah konfirmasi. Jadwal disimpan UTC dan dievaluasi saat request, tanpa scheduler. Peserta memuat ulang halaman/masuk lagi setelah waktu pembukaan.
4. Menutup Pendaftaran tidak menutup akses peserta yang sudah dibuka.
5. Menonaktifkan Mode beta memerlukan konfirmasi: registrasi normal kembali berlaku dan gate beta dilepas. Flag `BETA_PRELAUNCH_ENABLED` tetap hanya mengatur tampilan beranda, bukan keamanan akses.

## Perilaku

- Tombol Daftar Beta di Coming Soon menuju `/daftar-beta`, bukan `/register`. Form sementara ini menyimpan akun asli tanpa login otomatis, kemudian mengarahkan ke `/daftar-beta/selesai`. Form reguler `/register` tetap memakai alur existing.
- Form beta meminta nama, email, kata sandi, konfirmasi, dan persetujuan ketentuan. Kode referral opsional mengikuti pengaturan existing. Tidak ada tombol Google pada form prapendaftaran ini.
- Email peserta beta menggunakan tautan signed kedaluwarsa `/daftar-beta/verifikasi/{id}/{hash}` yang bisa dibuka tanpa login. Verifikasi hanya mengonfirmasi email, tidak membuat sesi login atau memberi akses belajar. Pengiriman awal menggunakan satu email verifikasi, tanpa email sambutan tambahan.
- Konfirmasi dan kirim ulang hanya membaca akun yang tersimpan pada sesi browser pendaftaran atau sesi setelah tautan signed berhasil dibuka. ID/email yang dikirim client tidak dapat memilih akun lain. Kirim ulang memakai cooldown 3 menit dan maksimal 5 pengiriman per 2 jam, termasuk email awal.
- Jika layanan email gagal, akun tetap tersimpan sebagai belum terverifikasi dan halaman konfirmasi menampilkan pesan gangguan. Pengguna dapat mengirim ulang nanti tanpa mendaftar lagi.
- Sifat sementara: mematikan **Pendaftaran** menutup form untuk akun baru. Ketika Mode beta dimatikan atau akses beta sudah dibuka (manual/jadwal), GET `/daftar-beta` kembali ke `/`, dan POST ditolak, bukan berubah menjadi registrasi normal. Konfirmasi, verifikasi, dan kirim ulang peserta lama tetap tersedia; akun tidak dihapus. Halaman konfirmasi menyediakan tombol Masuk hanya setelah email terverifikasi dan akses dibuka.
- Hanya akun baru yang mendaftar saat Mode beta aktif memiliki penanda beta. Akun lama, admin dan mentor tidak diberi penanda otomatis.
- Email dan Google memakai pengaman kuota server yang sama. Login/pemulihan Google untuk akun existing tidak mengambil slot.
- Sebelum pembukaan, peserta boleh mengakses halaman publik, akun/profil, verifikasi, password dan logout. Endpoint aplikasi lain ditolak sebelum controller, termasuk kuis, ujian, pembayaran, token live dan redeem access key.
- Browser diarahkan ke `/user/beta/waiting`; request JSON menerima 423. Verifikasi email tetap wajib. Setelah pembukaan, akses mengikuti langganan/keanggotaan existing, tidak otomatis gratis.
- Pembukaan yang sudah terjadi tidak dapat dijadwalkan ulang untuk mengunci kembali peserta melalui UI ini. Tidak ada tombol reset batch beta pada rilis pertama.
- Logo mengikuti varian resmi `Copy of TokuUp 1@2x-100.jpg`. Pembaruan 17 November: PNG transparan diekspor dari sumber native `Copy of mentahan tokuup.ai`, bukan hasil generatif. Logo lengkap digunakan pada Coming Soon/halaman tunggu; wordmark/emblem baru menggantikan logo di navbar, footer, login, sidebar seluruh role, portal ujian, loader, dan favicon. Varian dark mengubah tulisan hitam menjadi putih tanpa membalik hijau.
- `node scripts/export-brand-logo.mjs` meregenerasi aset dari file AI lokal melalui PDF.js dan Chrome dengan Vite lokal pada port 5173. Ini alat ekspor aset, tidak diperlukan pada VPS/build produksi. File sumber klien tetap utuh. PNG memiliki alpha; bagian putih di dalam lambang dipertahankan.

## Backup Excel Peserta Beta (`.xlsx`)

- Setiap pendaftaran peserta baru saat Mode beta aktif (lewat `/daftar-beta`, `/register`, maupun daftar baru via Google) serta setiap perubahan status verifikasi email peserta beta otomatis menyinkronkan data dari database ke **1 file Excel tunggal** pada disk privat server: `storage/app/private/backups/peserta-beta.xlsx` (`App\Services\BetaBackupExcelService`).
- Penyimpanan memakai disk `local` (privat, tidak dapat diakses lewat URL publik) dengan penguncian `Cache::lock('beta:excel-backup')` dan mekanisme file sementara + *atomic rename* agar aman terhadap pendaftaran bersamaan dan tidak pernah korup. Kegagalan penulisan backup dicatat lewat `report()` tanpa menggagalkan proses pendaftaran atau verifikasi peserta.
- Kolom yang dicatat: `No`, `User ID`, `Nama / Username`, `Email`, `Metode Daftar`, `Status Verifikasi`, `Waktu Verifikasi (WIB)`, `Status Akun`, `Waktu Daftar Beta (WIB)`, dan `Direferensikan Oleh`. Kata sandi/hash tidak pernah disimpan di file Excel, dan seluruh sel disanitasi terhadap *Excel Formula Injection*.
- Superadmin dapat mengunduh salinan terbaru kapan saja melalui **Superadmin -> Sistem -> Beta -> Unduh Backup Excel (`.xlsx`)** (`GET /superadmin/system/beta/export-xlsx`). Akses dibatasi khusus role `superadmin`, sinkronisasi ulang dijalankan sebelum unduhan, dan setiap unduhan dicatat di log aktivitas (`beta.backup_exported`).
- **Sinkronisasi Opsional ke Google Spreadsheet**: Bila `BETA_GOOGLE_SHEETS_WEBHOOK_URL` dan `BETA_GOOGLE_SHEETS_WEBHOOK_SECRET` diisi di `.env` (mengarah ke Web App Google Apps Script `/exec`), setiap sinkronisasi otomatis mengirim payload `{ secret, headers, rows }` ke Google Sheet tersebut secara non-blocking (kegagalan jaringan ke Google tidak pernah menggagalkan pendaftaran atau backup `.xlsx` lokal).

## Pengujian

`php artisan test --compact tests/Feature/BetaExcelBackupTest.php tests/Feature/BetaAccessTest.php tests/Feature/ReferralTest.php tests/Feature/Auth/GoogleAuthenticationTest.php tests/Feature/Auth/RegistrationTest.php tests/Feature/ReleaseSoonPageTest.php`

Tes concurrency memakai dua proses PHP pada MySQL `Project_japan_test` lokal, dengan fixture committed dan cleanup. Jangan menjalankannya bersamaan dengan suite lain pada database testing yang sama. Worker tidak ditujukan untuk database produksi.

`node scripts/test-beta-pages.mjs` menguji komponen produksi dengan fixture respons browser, bukan membuat akun pada database aplikasi. `KEEP_BETA_SCREENSHOTS=1` mempertahankan screenshot sementara untuk ditinjau; hapus sesudahnya.

`php artisan test --compact tests/Feature/Auth/BetaRegistrationTest.php` memverifikasi prapendaftaran guest, validasi, kuota/penutupan, link signed/idempotensi/expiry, isolasi sesi, cooldown, dan pemulihan kegagalan email. `BETA_FORMS_ONLY=1` membatasi harness browser pada Coming Soon dan kedua halaman prapendaftaran; harness juga memeriksa submit form dan error inline.

Keterbatasan: email terverifikasi tidak membuktikan satu akun per orang. Tidak ada pelepasan slot pending otomatis, pengiriman pengumuman massal, atau pemberian kelas beta gratis. Tidak ada klaim uji kapasitas produksi.
