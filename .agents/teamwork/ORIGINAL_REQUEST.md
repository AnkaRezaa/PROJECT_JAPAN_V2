# Original User Request

## 2026-09-26T18:07:24Z

This is a single self-contained testing and verification task; keep it small and focused.

Pengujian whitebox komprehensif dan validasi fungsional menyeluruh terhadap fitur Smart Generator Kuis Grammar (KuisGrammarGeneratorService dan AdminGrammarQuizController) pada aplikasi JapanLingo.

Working directory: C:\laragon\www\project_japan\japanlingov2
Integrity mode: development

## Requirements

### R1. Pengujian Unit Stage 1 (Transformation Generator)
Buat dan eksekusi skenario uji unit untuk memverifikasi logika konjugasi kata kerja (te, ta, nai, ba, stem, dict, potential, passive, causative). Verifikasi bahwa parameter target_form override dihormati saat diisi secara manual, dan fallback deteksi otomatis bekerja sesuai rumus/pola grammar. Pastikan 3 opsi pengecoh yang dihasilkan merupakan variasi bentuk konjugasi yang valid tanpa duplikasi dengan kunci jawaban.

### R2. Pengujian Unit Stage 2 (Sentence Builder Generator)
Buat dan eksekusi skenario uji unit untuk memverifikasi tokenisasi kalimat:
- Penguraian segmen berbasis tanda pipa eksplisit (|).
- Penguraian alami berbasis batas partikel bahasa Jepang (smartSegmentJapaneseSentence) saat tanda pipa tidak diisi, tanpa memotong kanji/kata sembarangan.
- Penambahan token partikel pengecoh yang terdistribusi dan valid.

### R3. Pengujian Unit Stage 3 (Context Choice Generator)
Buat dan eksekusi skenario uji unit untuk memverifikasi pembentukan soal pilihan ganda kontekstual. Buktikan secara objektif bahwa generator tidak pernah lagi mengeluarkan string dummy "文法パターン例文". Verifikasi bahwa jika bank soal database kosong, distractor disintesis secara cerdas melalui mutasi partikel dan infleksi predikat atau diambil dari bank kalimat fallback nyata.

### R4. Pengujian Integrasi Endpoint API Admin
Uji endpoint HTTP /admin/grammar-quizzes/generate-draft dan /admin/grammar-quizzes/regenerate-question. Pastikan validasi field settings.target_form berjalan semestinya dan payload JSON mengembalikan struktur 3 stage kuis yang lengkap.

## Acceptance Criteria

### Verifikasi Hasil Uji
- [ ] Test suite baru (misal: tests/Unit/Services/KuisGrammarGeneratorServiceTest.php atau test runner independen) dibuat dan berhasil dieksekusi dengan status PASS (100% green).
- [ ] Pengujian membuktikan 0 kemunculan teks dummy "文法パターン例文" pada seluruh output soal Stage 3 di berbagai skenario input.
- [ ] Pengujian membuktikan segmentasi alami pada Stage 2 menghasilkan minimal 2 token bermakna tanpa pemotongan karakter sembarangan saat tanda pipa tidak digunakan.
- [ ] Pengujian membuktikan parameter settings.target_form menghasilkan konjugasi yang akurat sesuai bentuk yang dipilih.
- [ ] Endpoint /admin/grammar-quizzes/generate-draft merespons status HTTP 200 dengan struktur stages yang valid.
