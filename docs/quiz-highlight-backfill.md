# Backfill highlight soal lama

Commit 4f3c075 menyediakan perintah backfill. Dukungan penanda kurung untuk
soal baru dan edit soal diimplementasikan terpisah dari backfill produksi.

## Status Terverifikasi - 18 November 2026

- Commit `4f3c075` sudah di-push dan, berdasarkan keluaran terminal pengguna,
  berhasil di-pull ke VPS. Tidak ada migrasi atau build frontend untuk commit ini.
- Lokal: dry-run mengidentifikasi 72 soal Kosakata dari 108 soal yang diperiksa.
  Setelah backup privat dibuat, apply memperbarui 72 target. Pengulangan dry-run
  menghasilkan 0 kandidat baru. Sebanyak 36 instruksi Grammar tidak diubah.
- Pengujian lokal: 9 tes / 147 asersi lulus, termasuk dry-run, idempotensi dan
  pemulihan bersyarat. Ini bukan bukti pengujian seluruh runner di browser VPS.
- VPS: dry-run menghasilkan `Updated: 0` dan `Eligible: 72`. Ada lebih banyak
  soal SKIP daripada lokal; jangan mengasumsikan VPS hanya mempunyai 108 soal.
- Apply VPS belum terkonfirmasi. Belum ada hasil update, nama jurnal produksi,
  atau bukti tampilan highlight setelah apply yang diterima.

### Checklist Rilis

- [x] Perintah backfill, jurnal privat, dan rollback bersyarat tersedia.
- [x] Backfill 72 soal lokal dan pemeriksaan idempotensi selesai.
- [x] Pull dan dry-run VPS terkonfirmasi dari keluaran pengguna.
- [ ] Backup database VPS dikonfirmasi.
- [ ] Apply VPS dan nama jurnalnya dikonfirmasi.
- [ ] Dry-run ulang VPS menghasilkan 0 kandidat baru.
- [ ] Tampilan target merah pada runner VPS diverifikasi.
- [ ] Soal yang dilewati ditinjau dan diklasifikasikan, bukan dipaksa disorot.
- [ ] Deploy build frontend dan backend yang mendukung format kurung ke VPS.

## Format Soal

Di builder dan template Kosakata, Grammar, atau Dokkai, tulis satu target
Jepang seperti `(駅)` atau `（駅）` pada teks soal. Target disimpan di kolom
`highlight_text` dan tampil merah tanpa kurung penanda. Kolom itu tetap
opsional; isi eksplisit bila ada beberapa calon atau targetnya bukan teks Jepang.

Kurung biasa, misalnya `(Noun)`, tetap tampil. Untuk keterangan Jepang yang
bukan target, tulis `\(日本語\)`. Runner tidak menebak target dari soal lama
dan penyimpanan ulang soal yang teksnya tidak berubah tidak menjalankan parser.
Tidak diperlukan migrasi baru. Flashcard, opsi jawaban dan pembahasan tidak termasuk
cakupan perubahan penanda pertanyaan.

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
