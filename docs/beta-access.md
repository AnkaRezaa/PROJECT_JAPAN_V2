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

- Hanya akun baru yang mendaftar saat Mode beta aktif memiliki penanda beta. Akun lama, admin dan mentor tidak diberi penanda otomatis.
- Email dan Google memakai pengaman kuota server yang sama. Login/pemulihan Google untuk akun existing tidak mengambil slot.
- Sebelum pembukaan, peserta boleh mengakses halaman publik, akun/profil, verifikasi, password dan logout. Endpoint aplikasi lain ditolak sebelum controller, termasuk kuis, ujian, pembayaran, token live dan redeem access key.
- Browser diarahkan ke `/user/beta/waiting`; request JSON menerima 423. Verifikasi email tetap wajib. Setelah pembukaan, akses mengikuti langganan/keanggotaan existing, tidak otomatis gratis.
- Pembukaan yang sudah terjadi tidak dapat dijadwalkan ulang untuk mengunci kembali peserta melalui UI ini. Tidak ada tombol reset batch beta pada rilis pertama.
- Logo mengikuti varian resmi `Copy of TokuUp 1@2x-100.jpg`. Pembaruan 17 November: PNG transparan diekspor dari sumber native `Copy of mentahan tokuup.ai`, bukan hasil generatif. Logo lengkap digunakan pada Coming Soon/halaman tunggu; wordmark/emblem baru menggantikan logo di navbar, footer, login, sidebar seluruh role, portal ujian, loader, dan favicon. Varian dark mengubah tulisan hitam menjadi putih tanpa membalik hijau.
- `node scripts/export-brand-logo.mjs` meregenerasi aset dari file AI lokal melalui PDF.js dan Chrome dengan Vite lokal pada port 5173. Ini alat ekspor aset, tidak diperlukan pada VPS/build produksi. File sumber klien tetap utuh. PNG memiliki alpha; bagian putih di dalam lambang dipertahankan.

## Pengujian

`php artisan test --compact tests/Feature/BetaAccessTest.php tests/Feature/ReferralTest.php tests/Feature/Auth/GoogleAuthenticationTest.php tests/Feature/Auth/RegistrationTest.php tests/Feature/ReleaseSoonPageTest.php`

Tes concurrency memakai dua proses PHP pada MySQL `Project_japan_test` lokal, dengan fixture committed dan cleanup. Jangan menjalankannya bersamaan dengan suite lain pada database testing yang sama. Worker tidak ditujukan untuk database produksi.

`node scripts/test-beta-pages.mjs` menguji komponen produksi dengan fixture respons browser, bukan membuat akun pada database aplikasi. `KEEP_BETA_SCREENSHOTS=1` mempertahankan screenshot sementara untuk ditinjau; hapus sesudahnya.

Keterbatasan: email terverifikasi tidak membuktikan satu akun per orang. Tidak ada pelepasan slot pending otomatis, pengiriman pengumuman massal, atau pemberian kelas beta gratis. Tidak ada klaim uji kapasitas produksi.
