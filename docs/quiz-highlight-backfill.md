# Backfill highlight soal lama

Rilis ini hanya menyediakan perintah backfill dan tesnya. Parser penanda kurung,
escape keterangan biasa, serta penyelarasan seluruh jalur input belum dirilis.

## VPS

1. Backup database dengan prosedur backup VPS yang biasa digunakan.
2. Pull kode, lalu jalankan `php artisan quiz:backfill-highlights` tanpa opsi.
3. Periksa baris PROPOSE dan SKIP. Jumlah produksi tidak harus sama dengan lokal.
4. Jika usulan benar, jalankan `php artisan quiz:backfill-highlights --apply`.
5. Simpan nama jurnal yang dicetak, lalu ulangi dry-run untuk memeriksa idempotensi.

Perintah hanya mengisi highlight_text yang null. Teks, ID, jawaban, nilai, urutan,
timestamp dan riwayat tidak diubah. Pola pertanyaan yang dikenali adalah
`Apa arti KATA?`, `Apa arti dari KATA?`, dan `Bagaimana cara membaca KATA?`;
metadata vocabulary existing juga digunakan jika cocok. Soal ambigu dilewati.

Jurnal tersimpan pada disk local privat di direktori highlight-backfills.
Pemulihan bersyarat menggunakan:

```bash
php artisan quiz:backfill-highlights --rollback=highlight-NAMA-JURNAL.json
```

Rollback hanya memulihkan baris yang teks, timestamp, dan targetnya masih sesuai
jurnal. Jangan menghapus direktori jurnal sebelum hasil diverifikasi.

Tidak ada migrasi baru. Jika kolom highlight_text belum ada, periksa migrasi
existing terlebih dahulu. Error 500 runner VPS perlu didiagnosis dari log;
perintah backfill ini bukan perbaikan untuk error tersebut.
