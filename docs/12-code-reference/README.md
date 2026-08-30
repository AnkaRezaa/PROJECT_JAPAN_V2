# Referensi Kode dan File

Bagian ini adalah peta teknis repository TOKU-UP. Tujuannya bukan menggantikan pembacaan kode, tetapi menjawab tiga pertanyaan dengan cepat: file berada di mana, tanggung jawabnya apa, dan dokumentasi operasional terkait berada di mana.

## Katalog

1. [Backend file catalog](backend-file-catalog.md) - seluruh file PHP di `app/`, dikelompokkan berdasarkan lapisan dan area fitur.
2. [Frontend resource catalog](frontend-resource-catalog.md) - seluruh file di `resources/`, termasuk JSX, CSS, gambar, dan Blade root.
3. [Database and test catalog](database-and-test-catalog.md) - seluruh migration, factory, seeder, bootstrap test, dan test case.
4. [Routes and configuration](routes-and-config.md) - batas route, middleware, scheduler, broadcasting, bootstrap, dan semua file `config/`.
5. [Data, storage, and public files](data-storage-public.md) - kepemilikan data runtime, file privat/publik, aset sumber, dan artefak build.
6. [Dependencies and tooling](dependencies-and-tooling.md) - Composer, npm, Vite, Tailwind, PHPUnit/Pest, dan script repository.
7. [Deployment artifacts](deployment-artifacts.md) - hubungan file deployment dengan handbook production.

Komponen multi-kurikulum utama berada di `CurriculumTrack`, relasi jalur pada `ProgramPembelajaran` dan `LevelPembelajaran`, serta migration `2026_08_22_000001_add_curriculum_tracks.php`. Kontrak dan prosedur ekspansinya dijelaskan di [multi-curriculum](../07-learning/multi-curriculum.md).

## Katalog Otomatis

Tiga katalog file dibangkitkan dari worktree saat ini:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/generate-code-reference.ps1
```

Jalankan kembali setelah menambah, memindahkan, atau menghapus file pada `app/`, `resources/`, `database/`, atau `tests/`. Deskripsi yang dibangkitkan adalah orientasi berdasarkan nama, namespace, dan symbol utama; aturan bisnis tetap harus dilihat pada source dan handbook fitur.

## Batasan

- `vendor/`, `node_modules/`, `public/build/`, cache, session, log, serta file upload tidak dikatalogkan satu per satu karena merupakan dependency atau data runtime.
- File publik sumber seperti aset stroke kanji dan audio dijelaskan per kelompok, bukan per berkas.
- Kandidat file lama tidak otomatis dihapus. Status pemakaian harus dibuktikan dari import, route, container binding, command registration, atau test terlebih dahulu.
- Ditemukan `app/grep.exe.stackdump`. File ini bukan source Laravel dan ditandai sebagai kandidat pembersihan terpisah; katalog tidak menganggapnya sebagai komponen aplikasi.
