# Retensi dan Penghapusan Akun

## Prinsip

- User dapat menghapus akunnya sendiri setelah konfirmasi username dan password
  atau autentikasi ulang Google.
- Akun tanpa histori keuangan dihapus permanen.
- Akun dengan transaksi atau langganan dianonimkan agar audit pembayaran tetap
  utuh tanpa menyimpan identitas pribadi.
- Superadmin menggunakan aksi Hapus pada Data User atau Data Admin. Backend yang
  menentukan apakah prosesnya hard delete, anonimisasi, atau ditolak.
- Admin dan Mentor Kelas tidak dapat menghapus dirinya melalui endpoint profil.

## Pengaman

Penghapusan atau anonimisasi ditolak untuk superadmin aktif terakhir,
superadmin yang sedang digunakan, dan Mentor Kelas yang masih mengampu kloter.
Kloter harus dipindahkan terlebih dahulu.

Akun yang ditangguhkan dijadwalkan untuk anonimisasi setelah 30 hari. Scheduler
menjalankan `accounts:anonymize-suspended`; mengaktifkan kembali akun sebelum
tenggat membatalkan jadwal tersebut.

## Deploy

Jalankan migration, pastikan scheduler aktif, lalu uji tiga skenario: user tanpa
transaksi terhapus, user dengan transaksi menjadi anonim dan transaksinya tetap
ada, serta Mentor Kelas dengan kloter ditolak.
