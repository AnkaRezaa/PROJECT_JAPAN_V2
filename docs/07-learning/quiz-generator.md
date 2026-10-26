# Unified Quiz Generator

Generator admin menyusun **draf lokal** dari bank konten, bukan membuat attempt siswa. Tidak ada migrasi, dependency, provider AI, atau perubahan XP. Penerapan draf mengganti isi editor setelah konfirmasi; database baru berubah melalui tombol Simpan dan endpoint CRUD builder yang sudah ada.

## Alur

```text
Builder Kosakata / Grammar / Dokkai
  -> UnifiedQuizGeneratorModal
  -> POST /admin/quiz-generator/{type}
  -> AdminQuizGeneratorController: validasi dan otorisasi modul
  -> QuizGeneratorManager
     -> VocabGeneratorStrategy -> SoalKuisService
     -> GrammarGeneratorStrategy -> KuisGrammarGeneratorService
     -> DokkaiGeneratorStrategy -> bank KuisDokkaiService
  -> draf JSON -> pratinjau / variasi soal
  -> konfirmasi -> adapter -> state editor
  -> Simpan melalui CRUD builder lama
```

`QuizGeneratorStrategyInterface` menyediakan `generateDraft` dan `regenerateSingleQuestion`. Manager memilih strategi dan menolak soal duplikat, jawaban di luar opsi, serta urutan token tidak valid. Tidak ada implementasi ulang engine morfologi atau persistence builder.

## Kontrak API

Named route: `admin.quiz-generator`. Menggunakan sesi admin, CSRF, cakupan program Mentor Kelas, dan limiter `admin-generator` yang sudah tersedia. Siswa tidak dapat mengakses generator. Pencarian sumber Dokkai memakai `admin.dokkai-quizzes.picker?summary=1`, dengan filter level/judul/tema dan pagination 20 item.

Contoh request Kosakata:

```json
{
  "operation": "generate",
  "module_day_id": 12,
  "level": "N3",
  "input": {
    "mode": "word_to_meaning",
    "category": "verb",
    "content_type": "kosakata",
    "status": "published"
  },
  "settings": { "count": 5 }
}
```

ID di atas hanya contoh dokumentasi. Frontend selalu memakai ID kuis/hari dari builder.

- `type`: `vocab`, `grammar`, atau `dokkai`.
- Tujuan: `quiz_id` untuk kuis tersimpan, atau `module_day_id` untuk draf baru. Jika keduanya dikirim, hubungan hari/kuis harus sesuai.
- `level`: N5 sampai N1; `settings.count`: 1-15. Kosakata menyediakan preset 5/10/15; Grammar juga menyediakan pembagian tiga tahap.
- Grammar: `input.pattern`, contoh `input.examples[].japanese/reading/translation`, rumus/arti/penjelasan; `settings.counts` berisi transformation/sentence_builder/context_choice, masing-masing minimal 1 dan jumlahnya sama dengan count. Pengaturan difficulty, target_form, useDistractors, autoMeaning diteruskan ke engine lama.
- Dokkai: `input.source_quiz_id` wajib. Sumber harus sesuai level dan cakupan admin. Hanya satu wacana per draf; soal dipilih dari butir bank dengan satu kunci benar, opsi unik, dan kutipan eviden yang terdapat pada paragraf sumber. Kekurangan stok menghasilkan jumlah adaptif beserta warning, bukan soal pengisi.
- Regenerasi: operation `regenerate`, `question_id`, dan `existing_questions` dari draf aktif, dengan input/settings/tujuan yang sama. Respons berisi satu soal pengganti dengan ID draf yang sama. Dokkai tidak berpindah wacana. Tidak adanya alternatif menghasilkan 422 dan draf lama tetap tersedia.

Envelope respons:

```json
{
  "draft": {
    "schema_version": 1,
    "type": "vocab",
    "level": "N3",
    "material": {},
    "questions": [
      {
        "id": "UUID-draf-bukan-ID-database",
        "kind": "choice",
        "stage": null,
        "prompt": "Teks pertanyaan dari materi",
        "japanese": "",
        "reading": null,
        "translation": null,
        "context": null,
        "choices": [
          { "id": "c1", "text": "Opsi benar", "reading": null, "translation": null },
          { "id": "c2", "text": "Pengecoh", "reading": null, "translation": null }
        ],
        "tokens": [],
        "answer": { "choice_id": "c1" },
        "explanation": null,
        "explanation_reading": null,
        "distractor_explanations": [],
        "audio_url": null,
        "points": 1,
        "source": { "type": "vocabulary", "id": 123 },
        "evidence": null
      }
    ],
    "warnings": []
  }
}
```

Varian:

- Sentence builder: `kind=sentence_builder`, `stage=sentence_builder`, `tokens=[{id,text,...}]`, dan `answer.correct_order=[id,...]`. Opsi pilihan ganda kosong.
- Grammar lainnya: kind choice, stage transformation atau context_choice; `material.lesson` memuat bahan masukan.
- Dokkai: `material.passage` memuat judul/level/metadata wacana, `material.paragraphs` dan `material.vocabularies` menggunakan nomor paragraf lokal. `evidence={paragraph_number,quote}` dan source memuat ID soal serta kuis asal. ID database sumber tidak digunakan sebagai ID record baru ketika disimpan.
- 422: validasi/bahan kurang/variasi tidak tersedia; 403: cakupan atau peran tidak sesuai; 429: batas permintaan. Error tidak mengganti isi builder.

## Integrasi Frontend

Komponen bersama: `resources/js/Components/Features/Quiz/Shared/UnifiedQuizGeneratorModal.jsx`.

Props: `open`, `onClose`, `type`, `onApplyDraft`, `initialData`. Initial data berisi `quizId`, `moduleDayId`, `level`, `hasContent`, serta input/settings opsional. Callback `onApplyDraft(draft, settings)` juga meneruskan pengaturan terpilih agar regenerasi Grammar berikutnya tetap menggunakan konfigurasi yang sama. `generatorDraftAdapters.js` memetakan JSON ke bentuk editor lama; jangan mengirim UUID draf sebagai ID database.

Ketiga builder memakai modal ini. Panel generator Kosakata/Grammar dan picker salin Dokkai lama telah diganti, bukan dipertahankan sebagai UI kedua. Endpoint lama Kosakata/Grammar tetap menjadi adapter kompatibilitas ke manager, bukan engine terpisah. Impor spreadsheet dan editor manual tetap tersedia.

Penutupan modal membatalkan request dan mengabaikan respons terlambat. Konfirmasi penggantian menggunakan ConfirmActionDialog yang sudah ada. Saat modal terbuka, Escape tidak menutup builder di belakangnya.

## Verifikasi

```powershell
php artisan test --compact --filter='UnifiedQuizGeneratorTest|SoalKuisDailyScopeGeneratorTest|GrammarQuizBackendTest|AdminDokkaiSpreadsheetImportTest'
node scripts/test-quiz-generator.mjs
npm run build
```

PHP memakai database testing, bukan database aplikasi lokal. Jangan jalankan dua suite RefreshDatabase pada database testing yang sama secara bersamaan. Browser harness memakai komponen modal dan adapter asli dengan respons API fixture; API, otorisasi, dan penyimpanan nyata diuji terpisah melalui feature test. Harness memakai Chrome lokal tanpa instalasi Playwright. Screenshot disimpan di folder temporary yang dicetak oleh skrip.

Ini generator berbasis bank, bukan LLM. Kelengkapan serta ketepatan pedagogis bahan sumber tetap harus ditinjau admin sebelum diterbitkan.
