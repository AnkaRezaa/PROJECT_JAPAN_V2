# Multi-Kurikulum dan Ekspansi Materi

## Bantuan Baca Jepang

Preferensi `show_romaji` dan `show_indonesian_translation` tersimpan pada akun user. Romaji hanya dibuat dari reading kana yang disediakan konten; kanji tanpa reading tidak ditebak otomatis. Berita memakai `reading_blocks` agar editor memasukkan teks Jepang, reading kana, dan terjemahan per bagian.

## Tujuan

TOKU-UP tetap dapat memakai **JLPT N3** sebagai nama kelas dan penawaran saat ini, tetapi fitur generik tidak boleh menganggap semua kelas selalu N3. Fondasi ini menyiapkan penambahan JLPT N5/N4/N2/N1, SSW, TG Jepang, atau jalur lain tanpa mengganti ID dan data pengguna yang sudah ada.

## Model Data

```text
CurriculumTrack (JLPT, SSW, TG, ...)
  -> LevelPembelajaran (N5, N4, N3, ... atau kategori jalur)
      -> ProgramPembelajaran/Kelas
          -> Modul/Week -> Day -> konten, flashcard, kuis, ujian, presentasi
```

- `curriculum_tracks.code` adalah kode stabil untuk aturan sistem; nama boleh diperbarui.
- `program_pembelajaran.curriculum_track_id` menentukan jalur sebuah kelas.
- `levels.curriculum_track_id` mencegah level dari jalur lain dipasang ke kelas.
- Kelas JLPT wajib memilih level. Jalur non-JLPT boleh tanpa level apabila produk belum memerlukannya.
- Data lama dibackfill ke jalur JLPT; ID program, modul, user, subscription, transaksi, dan progress tidak berubah.
- `vocabulary_bank.jlpt_level` nullable. Nilai ini hanya diisi untuk konten JLPT, bukan dipaksa ke SSW/TG.

## Workflow Admin

1. Buka menu Level dan buat jalur kurikulum bila belum tersedia.
2. Tambahkan level/kategori pada jalur tersebut bila dibutuhkan.
3. Saat membuat kelas, pilih jalur terlebih dahulu lalu level yang tersedia untuk jalur itu.
4. Buka Kelola Isi Kelas dan susun Week, Day, presentasi, Bank Konten, kuis, serta ujian seperti biasa.
5. Import konten harus dilakukan dari konteks kelas dan Week. Template akan memakai level kelas; jalur non-JLPT membiarkan kolom level kosong.
6. Publish setelah roadmap, akses, dan tampilan user diperiksa menggunakan akun yang benar-benar memiliki kelas tersebut.

Admin tidak perlu membuat builder baru untuk setiap level. Builder yang sama membaca identitas kurikulum dari kelas.

## Aturan Import

- pilih kelas dan Week sebelum import;
- baris spreadsheet tidak boleh menunjuk Week/Day dari kelas berbeda;
- import dijalankan dalam transaksi agar kegagalan scope tidak meninggalkan sebagian data;
- `jlpt_level` tidak memakai fallback N3; untuk JLPT nilainya mengikuti level kelas;
- import ulang memakai identitas kata dan reading yang sudah ada, sehingga perlu memeriksa hasil update dan duplikasi semantik;
- flashcard dan generator soal tetap menggunakan service lama dan relasi konten yang sudah ada.

## UI User

- nama kelas tetap sumber identitas utama, misalnya `JLPT N3 Mingguan`;
- label fitur memakai istilah generik seperti Pustaka Materi, Quick Quiz, dan Perjalanan Belajar;
- badge jalur/level berasal dari payload program, bukan teks N3 di JSX;
- Quick Quiz dapat mengambil seluruh kelas yang dimiliki atau dibatasi ke satu kelas, tetapi tetap mengecualikan kuis yang terkunci;
- progress dikelompokkan per kelas yang dapat diakses user, bukan daftar level global.

## Checklist Menambah Jalur Baru

1. Tambah `CurriculumTrack` dan level opsional dari UI admin.
2. Buat program serta paket pembayaran/access key sesuai scope program.
3. Isi Week/Day dan import konten dalam konteks program.
4. Verifikasi roadmap, Quick Quiz, Pustaka, progress, ujian, dan sertifikat.
5. Uji akun tanpa akses, akses program lain, kelas mandiri, dan kelas mentor.
6. Backup database sebelum deploy konten massal.

## Kompatibilitas dan Migrasi V3

- jangan mengubah primary key atau menggunakan title/slug sebagai foreign key;
- migration production harus additive dan backup harus diuji restore;
- transaksi, subscription, progress, attempt, review, dan certificate adalah data historis yang tidak boleh diseed ulang saat upgrade;
- perpindahan MySQL ke PostgreSQL memerlukan audit SQL mentah, tipe JSON/date, collation, dump-transform-load, rekonsiliasi jumlah row, dan dry-run; mengganti `DB_CONNECTION` saja tidak cukup;
- deployment aplikasi baru harus menjalankan migration, bukan `migrate:fresh` atau seeder demo pada database production.

## Ditunda Sampai Dibutuhkan

- versioning kurikulum dan prasyarat lintas program;
- taxonomy kompetensi SSW/TG yang belum disepakati klien;
- mapping sertifikat program penuh bila aturan kelulusan tiap jalur berbeda;
- migrasi PostgreSQL;
- authoring massal tingkat lanjut dan analytics per kompetensi.

Penundaan ini disengaja agar implementasi saat ini tidak membangun struktur spekulatif sebelum aturan bisnis tersedia.
