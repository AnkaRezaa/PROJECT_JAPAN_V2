# Referral

Referral mencatat pengundang akun baru, tanpa hadiah, XP, atau perubahan akses kelas.

## Aktivasi

1. Deploy kode dan jalankan `php artisan migrate --force` setelah backup database.
2. Jalankan `npm run build` pada lingkungan build/deploy.
3. Isi `REFERRALS_ENABLED=true` di `.env`, kemudian `php artisan config:cache`.

Default adalah nonaktif. Flag ini terpisah dari `BETA_PRELAUNCH_ENABLED`; tidak mengatur kuota beta atau jadwal akses.

## Penggunaan

- Siswa aktif dengan email terverifikasi: Profil -> Undang Teman (`/user/referrals`).
- Halaman menyiapkan kode sekali melalui POST idempotent, bukan mutasi GET.
- Bagikan tautan atau kode. Kode manual pada form daftar mengalahkan nilai awal tautan.
- Email dan Google hanya mencatat pengundang ketika membuat akun baru. Login/pemulihan akun lama tidak mengubah pengundang.
- Konteks Google berlaku maksimal 24 jam dan dibersihkan saat callback; validasi diulang sebelum pembuatan akun.
- Terdaftar adalah total akun yang tercatat; Terverifikasi adalah bagian dari total tersebut, bukan angka tambahan.
- Superadmin melihat ringkasan dan pengundang pada detail pengguna. Siswa tidak menerima identitas penerima undangan.

Menonaktifkan flag menghentikan penggunaan referral baru tanpa menghapus riwayat atau menghalangi registrasi tanpa kode. Menghapus akun pengundang secara permanen melepas FK pada akun yang diundang, bukan menghapus akun tersebut. Anonimisasi/penangguhan membuat kode tidak dapat dipakai karena pemilik tidak aktif.

## Verifikasi

`php artisan test --compact tests/Feature/ReferralTest.php tests/Feature/Auth/GoogleAuthenticationTest.php tests/Feature/Auth/RegistrationTest.php`

`node scripts/test-referrals.mjs` menguji komponen produksi dengan fixture respons browser tanpa menulis akun ke database aplikasi. Screenshot sementara dibersihkan, kecuali `KEEP_REFERRAL_SCREENSHOTS=1` untuk peninjauan visual.

Verifikasi email bukan deteksi akun ganda per orang. Tidak ada klaim antifraud atau pengujian beban tinggi. Sistem tidak menyimpan statistik klik.
