# Bantuan Baca dan Feedback Produk

## Bantuan baca

Preferensi pengguna disimpan pada `users.show_romaji` dan
`users.show_indonesian_translation`. Pengguna mengubahnya dari halaman profil.
Komponen `JapaneseReading` menjadi satu pintu tampilan teks Jepang, kana, romaji,
dan terjemahan.

Cakupan bantuan baca adalah konten belajar yang memiliki data terstruktur:

- kosakata dan contoh kalimat;
- flashcard di dalam kuis;
- soal, opsi jawaban, pembahasan, quick quiz, dan ujian;
- blok bacaan berita yang memiliki reading.

PDF, gambar, video, dan teks bebas pada canvas presentasi tidak dikonversi secara
otomatis. Admin harus mengisi kolom reading ketika membuat materi. Import soal
mendukung `question_reading`, `correct_answer_reading`, `option_readings`, dan
`explanation_reading`.

## Feedback produk

Semua pengguna terautentikasi dapat membuka tombol Feedback. Laporan disimpan
di tabel `product_feedback`; tabel ini berbeda dari `learning_feedback` yang
khusus untuk rating repetisi belajar.

Superadmin memproses laporan melalui menu Aktivitas pada tab Feedback & Bug.
Status yang tersedia adalah `new`, `reviewing`, dan `resolved`. Hasil filter dapat
diunduh sebagai CSV UTF-8 yang dapat dibuka di Excel. Export menambahkan BOM dan
menetralkan awalan formula spreadsheet.

Tidak ada screenshot otomatis atau realtime broadcast. Setelah submit, data
langsung tersimpan dan terlihat pada refresh/Inertia berikutnya.
