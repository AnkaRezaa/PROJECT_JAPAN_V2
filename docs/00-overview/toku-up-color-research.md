# Riset Warna TOKU-UP untuk Landing Page dan Autentikasi

**Tanggal:** 28 Agustus 2026
**Audiens:** pemilik produk, desainer, dan developer TOKU-UP
**Status:** rekomendasi desain sementara sebelum logo dan font final diterima

## Ruang lingkup

Riset ini menerjemahkan referensi klien `revisi_desain_terbaru.jpg` menjadi sistem warna UI yang dapat diterapkan lebih dahulu pada landing page, login, registrasi, dan alur pemulihan akun. Riset tidak mengubah komponen produksi dan tidak menganggap warna hasil ekstraksi JPEG sebagai kode brand final.

## Jawaban langsung

Palet paling sesuai bukan tema hijau menyeluruh. TOKU-UP sebaiknya memakai susunan semantik dari referensi klien:

- **Hijau:** identitas, aksi utama, mulai belajar, dan progres selesai.
- **Biru:** belajar, informasi, fokus, dan aksi sekunder.
- **Kuning:** pencapaian, level, streak, dan penghargaan.
- **Charcoal lembut:** judul, teks, dan fondasi visual tanpa memakai hitam pekat.
- **Putih dan netral muda:** mayoritas permukaan agar warna aksen tetap bermakna.
- **Merah:** hanya error, bahaya, dan tindakan destruktif; bukan dekorasi brand.

Ekstraksi visual dari referensi JPEG menemukan warna dominan mendekati hijau `#30C060` dan tinta `#283038`. Karena kompresi, pencahayaan, dan anti-aliasing gambar dapat menggeser nilai, kode tersebut harus diperlakukan sebagai estimasi sampai tersedia aset logo asli.

## Dasar keputusan

Duolingo menggunakan Feather Green sebagai warna inti, tetapi secara eksplisit memakai netral untuk utilitas dan hierarki serta warna sekunder sebagai percikan visual, bukan untuk memenuhi seluruh layar. Pola ini mendukung penggunaan hijau TOKU-UP secara selektif. [Duolingo Brand Guidelines: Color](https://design.duolingo.com/identity/color/1000)

Khan Academy mengatur warna berdasarkan domain, lapisan, konteks, dan intensitas. Latar, border, foreground, serta shadow memiliki peran berbeda; warna instruktif, sukses, peringatan, dan kritis tidak boleh dipakai sebagai dekorasi yang saling menggantikan. Mereka juga menguji kombinasi token terhadap standar kontras. [Khan Academy: Rebuilding the Color System](https://blog.khanacademy.org/how-we-rebuilt-khan-academys-color-system-from-the-ground-up/)

Penelitian CHI terhadap 450 situs dan 548 partisipan menemukan bahwa kompleksitas visual dan colorfulness berpengaruh pada kesan estetika awal. Warna berperan, tetapi kompleksitas visual lebih berpengaruh; karena itu menambah warna di semua permukaan bukan cara yang tepat untuk membuat produk lebih menarik. [Reinecke et al., CHI 2013](https://www.eecs.harvard.edu/~kgajos/papers/2013/reinecke13predicting.shtml)

Riset psikologi warna menunjukkan warna dapat membawa makna, tetapi efeknya tergantung konteks dan generalisasi praktis yang terlalu kuat belum didukung bukti. Rekomendasi TOKU-UP karena itu menggunakan warna untuk fungsi UI yang konsisten, bukan klaim seperti "hijau pasti membuat orang lebih pintar". [Elliot and Maier, Annual Review of Psychology](https://www.annualreviews.org/content/journals/10.1146/annurev-psych-010213-115035/)

## Palet yang direkomendasikan

### Palet inti

| Token | Nilai sementara | Peran |
| --- | --- | --- |
| `brand.green` | `#30C060` | logo, CTA utama, indikator selesai |
| `brand.green.strong` | `#15803D` | teks hijau, CTA dengan teks putih bila diperlukan |
| `brand.green.soft` | `#E9F9EF` | active state, badge, panel pembelajaran ringan |
| `brand.ink` | `#2D3742` | heading dan tombol di atas hijau terang tanpa terlihat hitam pekat |
| `learning.blue` | `#2563EB` | informasi, fokus, aksi sekunder, status belajar |
| `learning.blue.soft` | `#EFF5FF` | panel informasi dan active state sekunder |
| `achievement.amber` | `#F2B705` | level, XP, badge, streak, reward |
| `achievement.amber.soft` | `#FFF7DC` | panel pencapaian ringan |

### Netral dan status

| Token | Nilai sementara | Peran |
| --- | --- | --- |
| `surface.base` | `#FFFFFF` | kartu dan form |
| `surface.muted` | `#F7FAF8` | latar halaman |
| `surface.tint` | `#F0F7F3` | pemisah section landing |
| `text.body` | `#53606D` | paragraf |
| `text.muted` | `#667085` | metadata dan placeholder penting |
| `border.subtle` | `#DDE7E1` | pemisah dekoratif |
| `border.control` | `#7C8A83` | batas input saat border menjadi petunjuk utama |
| `state.danger` | `#B42318` | error dan bahaya |
| `state.danger.soft` | `#FFF1F0` | latar error |

## Aturan komposisi

Rasio berikut adalah heuristic desain untuk menjaga keseimbangan, bukan standar universal:

- Landing page: sekitar 65% putih/netral muda, 15% tinta dan teks, 12% hijau, 5% biru, dan 3% kuning/warna status.
- Login dan registrasi: sekitar 75% putih/netral, 15% tinta, 8% hijau, dan 2% biru/kuning/status.
- Dalam satu viewport, hanya satu area besar yang boleh memakai warna jenuh.
- Jangan gunakan hijau, biru, dan kuning sekaligus sebagai tiga tombol yang sama kuat.
- Gunakan warna sekunder pada ikon, badge, progress, atau panel kecil; bukan sebagai latar seluruh section.

## Hasil uji kontras

Perhitungan mengikuti rumus luminansi dan ambang WCAG 2.2: teks normal minimal `4.5:1`, teks besar minimal `3:1`, dan petunjuk penting komponen UI minimal `3:1`. [WCAG 2.2](https://www.w3.org/TR/WCAG22/) dan [W3C Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast)

| Kombinasi | Rasio | Hasil |
| --- | ---: | --- |
| Charcoal `#2D3742` pada green `#30C060` | `5.09:1` | Lulus teks normal |
| Putih pada green `#30C060` | `2.38:1` | Gagal; jangan dipakai untuk label tombol |
| Putih pada strong green `#15803D` | `5.02:1` | Lulus teks normal |
| Putih pada blue `#2563EB` | `5.17:1` | Lulus teks normal |
| Charcoal pada amber `#F2B705` | `6.65:1` | Lulus teks normal |
| Body `#55616D` pada putih | `6.33:1` | Lulus teks normal |
| Muted `#667085` pada putih | `4.97:1` | Lulus teks normal |
| Border control `#7C8A83` pada putih | `3.61:1` | Lulus petunjuk komponen |

Implikasi terpenting: tombol hijau terang harus memakai teks charcoal lembut. Jika desain membutuhkan teks putih, gunakan hijau kuat `#15803D`, bukan hijau logo.

## Penerapan pada landing page

### First viewport

- Navbar putih transparan tipis dengan border netral; hapus pola merah lama.
- Hero tetap memakai foto nyata, tetapi overlay berupa lapisan solid putih/netral transparan agar foto dan tulisan tidak berubah menjadi hijau gelap.
- Heading memakai charcoal; satu frasa penting boleh memakai hijau tanpa gradient.
- CTA utama memakai `#30C060` dengan teks `#2D3742`.
- CTA sekunder berupa outline tinta atau biru, bukan tombol hijau kedua.
- Aksen biru dan kuning muncul pada ilustrasi alur `Learn > Pass > Level Up`, statistik, atau badge kecil.

### Section berikutnya

- Gunakan pergantian `surface.base`, `surface.muted`, dan `surface.tint` untuk membentuk ritme.
- Kartu belajar tetap putih; warna kategori hanya pada ikon dan status.
- Progres selesai hijau, aktivitas berjalan biru, pencapaian kuning, dan error merah.
- Hindari card bertumpuk, shadow besar, gradient, serta semua heading berwarna hijau.

Hasil yang diharapkan adalah landing page yang terasa ramah dan energik pada pandangan pertama, tetapi tetap tenang ketika pengguna membaca informasi. Hal ini mengurangi kompleksitas warna sekaligus mempertahankan identitas yang mudah dikenali.

## Penerapan pada login dan registrasi

- Desktop tetap boleh memakai layout dua sisi, tetapi panel visual tidak memakai gradient hijau gelap penuh.
- Foto Fuji diberi scrim charcoal solid transparan untuk keterbacaan, lalu hijau hanya muncul pada garis, label, atau elemen progres. Jangan memakai gradient.
- Panel form menggunakan putih murni di atas latar `#F7FAF8`; tidak perlu glass blur dan shadow berwarna merah.
- Tab aktif memakai teks hijau kuat dan underline; tab tidak aktif memakai `text.body`.
- Input memakai border control yang terlihat, focus ring biru atau hijau kuat, dan error merah dengan ikon/pesan, bukan warna saja.
- Tombol masuk memakai hijau terang dengan teks tinta. Tombol Google tetap netral agar tidak bersaing dengan aksi utama.
- Pada mobile, prioritaskan form; ilustrasi dan copy promosi dipadatkan menjadi header kecil.

Halaman autentikasi harus lebih tenang daripada landing page. Tujuan pengguna sudah jelas, sehingga warna berfungsi untuk orientasi dan tindakan, bukan untuk menarik perhatian ke banyak tempat.

## Audit implementasi saat ini

Fondasi proyek sudah memiliki token hijau, tinta, biru, kuning, surface, border, dan focus. Namun penerapannya belum konsisten:

- `GuestNavbar.jsx` masih membuat pola Seigaiha merah `#DC2626`.
- `Login.jsx` dan `Register.jsx` masih memakai shadow merah `rgba(127,29,29,0.45)`.
- `GuestAuthLayout.jsx` menggunakan rentang `brand-700` sampai `brand-950` untuk area visual besar sehingga hijau terasa berat.
- Landing page mencampur token tema dengan banyak warna hard-coded dan badge merah.
- Tombol login/register memakai `text-white` di atas hijau terang, padahal pasangan tersebut gagal kontras.
- Border input `gray-200` terlalu lemah bila menjadi satu-satunya petunjuk batas kontrol.

Implementasi aman sebaiknya dimulai dari token semantik, lalu mengganti pemakaian warna per komponen. Jangan melakukan find-and-replace semua class hijau karena status sukses, brand, progres, dan aksi memiliki kebutuhan kontras berbeda.

## Validasi dari sisi pengguna

Riset ini baru mencakup evaluasi heuristik dan uji kontras otomatis; belum ada pengujian manusia sehingga tidak boleh disebut sebagai hasil usability test aktual. Setelah implementasi, lakukan pengujian berikut:

1. Lima pengguna target membuka landing page selama lima detik, lalu menyebutkan apa produk ini dan tindakan utama yang terlihat.
2. Pengguna mencari tombol daftar, membuka login, mengisi form, memicu satu error, lalu kembali memperbaikinya.
3. Uji dilakukan pada desktop, ponsel 360 px, mode terang, serta simulasi deuteranopia dan protanopia.
4. Ukur keberhasilan tugas, waktu menemukan CTA, salah klik, keterbacaan pesan, dan komentar spontan tentang kesan produk.
5. Jangan hanya bertanya apakah desain "bagus". Aesthetic-usability effect dapat membuat antarmuka menarik terlihat lebih mudah digunakan daripada kenyataannya; observasi perilaku harus lebih diutamakan daripada pujian visual. [Nielsen Norman Group](https://www.nngroup.com/articles/aesthetic-usability-effect/)

## Alternatif palet

### A. Friendly Balanced - direkomendasikan

Hijau `#30C060`, charcoal `#2D3742`, biru `#2563EB`, amber `#F2B705`, dan permukaan netral. Paling dekat dengan referensi klien serta cukup fleksibel untuk landing dan aplikasi belajar.

### B. Bright Playful

Hijau, biru, dan kuning dibuat lebih jenuh serta lebih sering tampil. Cocok untuk kampanye atau ilustrasi, tetapi berisiko meningkatkan kompleksitas visual dan terasa terlalu kekanak-kanakan bila dipakai pada form dan dashboard.

### C. Calm Premium

Tinta dan putih mendominasi; hijau hanya pada CTA dan logo, sedangkan biru/kuning sangat terbatas. Terlihat lebih premium, tetapi kurang mewakili permintaan klien tentang gaya EdTech yang friendly.

## Rekomendasi final

Gunakan **Friendly Balanced**. Pertahankan hijau referensi sebagai warna identitas, tetapi bangun UI dari netral dan role semantik. Landing page boleh lebih ekspresif; halaman login harus lebih fokus dan tenang. Sebelum implementasi final, minta logo sumber atau brand sheet dari klien untuk mengunci nilai hijau dan tinta yang sebenarnya.

## Sumber utama

- Duolingo, *Brand Guidelines: Color*, diakses 28 Agustus 2026: https://design.duolingo.com/identity/color/1000
- Khan Academy, Caitlyn Mayers, *How We Rebuilt Khan Academy's Color System from the Ground Up*, 23 Maret 2026: https://blog.khanacademy.org/how-we-rebuilt-khan-academys-color-system-from-the-ground-up/
- W3C, *Web Content Accessibility Guidelines 2.2*: https://www.w3.org/TR/WCAG22/
- Katharina Reinecke et al., *Predicting Users' First Impressions of Website Aesthetics*, CHI 2013: https://www.eecs.harvard.edu/~kgajos/papers/2013/reinecke13predicting.shtml
- Andrew J. Elliot and Markus A. Maier, *Color Psychology*, Annual Review of Psychology 65, 2014: https://doi.org/10.1146/annurev-psych-010213-115035
- Lauren I. Labrecque and George R. Milne, *Exciting Red and Competent Blue*, Journal of the Academy of Marketing Science 40, 2012: https://doi.org/10.1007/s11747-010-0245-y
- Nielsen Norman Group, Kate Moran, *The Aesthetic-Usability Effect*, 3 Februari 2024: https://www.nngroup.com/articles/aesthetic-usability-effect/

## Batasan

- Nilai warna referensi berasal dari JPEG beresolusi rendah, bukan aset brand sumber.
- Asosiasi psikologis warna dipengaruhi konteks, budaya, perangkat, dan pengalaman individual.
- Tidak ada palet yang secara universal "sempurna"; rekomendasi ini adalah pilihan paling kuat untuk konteks dan batas proyek saat ini.
- Validasi manusia dan screenshot regression dilakukan setelah implementasi, bukan pada tahap riset ini.
