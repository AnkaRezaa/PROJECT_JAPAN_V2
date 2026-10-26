import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9228;
const HTML_FILE = path.resolve('public/docs/panduan_template.html');
const PDF_OUTPUT = path.resolve('public/docs/panduan_tokuup.pdf');
const SCREENSHOT_DIR = path.resolve('public/docs/screenshots');

function getBase64Image(filename) {
    const fullPath = path.join(SCREENSHOT_DIR, filename);
    if (!fs.existsSync(fullPath)) return '';
    const buf = fs.readFileSync(fullPath);
    return `data:image/png;base64,${buf.toString('base64')}`;
}

const imgLogin = getBase64Image('01_login_page.png');
const imgVocab = getBase64Image('02_bank_kosakata.png');
const imgGrammar = getBase64Image('03_bank_grammar.png');
const imgModule = getBase64Image('04_kurikulum_modul.png');
const imgExam = getBase64Image('05_bank_soal_cbt.png');
const imgDashboard = getBase64Image('06_dashboard_admin.png');
const imgStudentDash = getBase64Image('07_dashboard_siswa.png');
const imgStudentProgress = getBase64Image('09_progress_siswa.png');

console.log('📝 Menyusun HTML Buku Panduan 28 Halaman Presisi...');

// Halaman-halaman terstruktur
const pagesHtml = `
<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>Buku Panduan Operasional TOKU-UP v2.0</title>
<style>
    @page {
        size: A4 portrait;
        margin: 0;
    }
    * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    body {
        background: #f8fafc;
        color: #0f172a;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }
    .page {
        width: 210mm;
        height: 297mm;
        padding: 20mm 20mm 18mm 20mm;
        margin: 0 auto;
        page-break-after: always;
        position: relative;
        background: #ffffff;
        display: flex;
        flex-col;
        flex-direction: column;
        justify-content: space-between;
        overflow: hidden;
    }
    .page-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 2px solid #e2e8f0;
        padding-bottom: 8px;
        margin-bottom: 16px;
    }
    .page-header .brand {
        font-weight: 900;
        font-size: 14px;
        color: #059669;
        letter-spacing: 0.05em;
    }
    .page-header .doc-title {
        font-size: 11px;
        color: #64748b;
        font-weight: 600;
        text-transform: uppercase;
    }
    .page-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-top: 1px solid #e2e8f0;
        padding-top: 8px;
        font-size: 10px;
        color: #64748b;
        font-weight: 600;
    }
    .page-footer .page-num {
        background: #059669;
        color: #ffffff;
        padding: 2px 8px;
        border-radius: 4px;
        font-weight: 800;
    }
    .content-body {
        flex: 1;
        display: flex;
        flex-direction: column;
    }
    h1.chapter-title {
        font-size: 26px;
        font-weight: 900;
        color: #0f172a;
        margin-bottom: 6px;
        line-height: 1.2;
    }
    .chapter-badge {
        display: inline-block;
        background: #ecfdf5;
        color: #047857;
        font-size: 11px;
        font-weight: 800;
        padding: 4px 10px;
        border-radius: 9999px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        margin-bottom: 8px;
        border: 1px solid #a7f3d0;
    }
    p.lead {
        font-size: 13px;
        color: #475569;
        line-height: 1.6;
        margin-bottom: 14px;
    }
    .img-card {
        border-radius: 12px;
        overflow: hidden;
        border: 1px solid #cbd5e1;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        margin: 10px 0 14px 0;
        background: #f1f5f9;
        text-align: center;
    }
    .img-card img {
        width: 100%;
        max-height: 125mm;
        object-fit: cover;
        display: block;
    }
    .img-caption {
        padding: 6px 12px;
        font-size: 10px;
        font-weight: 600;
        color: #64748b;
        background: #f8fafc;
        border-top: 1px solid #e2e8f0;
        text-align: left;
    }
    .info-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 10px;
        margin-top: 8px;
    }
    .info-box {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 10px;
    }
    .info-box h4 {
        font-size: 12px;
        font-weight: 800;
        color: #0f172a;
        margin-bottom: 4px;
    }
    .info-box p, .info-box li {
        font-size: 11px;
        color: #475569;
        line-height: 1.5;
    }
    ul.step-list {
        margin-left: 18px;
        margin-top: 6px;
    }
    ul.step-list li {
        font-size: 11.5px;
        color: #334155;
        line-height: 1.5;
        margin-bottom: 6px;
    }
    /* COVER PAGE */
    .cover-page {
        background: linear-gradient(135deg, #064e3b 0%, #065f46 40%, #047857 100%);
        color: white;
        padding: 30mm 20mm;
        justify-content: space-between;
    }
    .cover-badge {
        display: inline-block;
        background: rgba(255, 255, 255, 0.15);
        backdrop-filter: blur(8px);
        padding: 6px 16px;
        border-radius: 9999px;
        font-size: 12px;
        font-weight: 800;
        letter-spacing: 0.15em;
        text-transform: uppercase;
        border: 1px solid rgba(255, 255, 255, 0.3);
    }
    .cover-title {
        font-size: 42px;
        font-weight: 900;
        line-height: 1.15;
        margin-top: 20px;
        letter-spacing: -0.02em;
    }
    .cover-subtitle {
        font-size: 16px;
        color: #a7f3d0;
        margin-top: 14px;
        font-weight: 500;
        max-width: 500px;
        line-height: 1.5;
    }
    .cover-footer {
        border-top: 1px solid rgba(255, 255, 255, 0.2);
        padding-top: 16px;
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        font-size: 11px;
        color: #d1fae5;
    }
    /* TOC */
    .toc-item {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        padding: 10px 0;
        border-bottom: 1px dashed #cbd5e1;
    }
    .toc-title {
        font-weight: 700;
        font-size: 13px;
        color: #1e293b;
    }
    .toc-dots {
        flex: 1;
        border-bottom: 1px dotted #94a3b8;
        margin: 0 10px;
    }
    .toc-page {
        font-weight: 800;
        color: #059669;
        font-size: 13px;
    }
</style>
</head>
<body>

<!-- HALAMAN 1: COVER -->
<div class="page cover-page">
    <div>
        <span class="cover-badge">Dokumen Resmi v2.0 · Oktober 2026</span>
        <h1 class="cover-title">TOKU-UP<br>BUKU PANDUAN<br>SISTEM & OPERASIONAL</h1>
        <p class="cover-subtitle">Manual Penggunaan Terpadu untuk Administrator, Pengajar, dan Siswa Platform Persiapan Ujian Bahasa Jepang & Tokutei Ginou.</p>
    </div>
    <div style="background: rgba(0,0,0,0.15); border-radius: 12px; padding: 16px; border: 1px solid rgba(255,255,255,0.15);">
        <p style="font-size: 12px; font-weight: 700; color: #ffffff; margin-bottom: 6px;">Fitur Navigasi Deeplink Bawaan:</p>
        <p style="font-size: 11px; color: #d1fae5; line-height: 1.5;">Buku panduan ini terhubung langsung dengan sistem web. Mengklik tombol bantuan pada setiap modul akan otomatis membuka bab yang sesuai melalui format native browser <code style="background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px;">#page=N</code>.</p>
    </div>
    <div class="cover-footer">
        <div>
            <p style="font-weight: 800; font-size: 13px; color: #ffffff;">Tim Pengembang TOKU-UP</p>
            <p>JapanLingo v2 Platform Architecture</p>
        </div>
        <div style="text-align: right;">
            <p>Terbit: Oktober 2026</p>
            <p>Hak Cipta Dilindungi</p>
        </div>
    </div>
</div>

<!-- HALAMAN 2: KATA PENGANTAR & ARSITEKTUR -->
<div class="page">
    <div class="page-header">
        <span class="brand">TOKU-UP MANUAL</span>
        <span class="doc-title">Pengantar Sistem</span>
    </div>
    <div class="content-body">
        <span class="chapter-badge">Pengantar</span>
        <h1 class="chapter-title">Arsitektur Ekosistem Belajar</h1>
        <p class="lead">Platform TOKU-UP mengusung metodologi pembelajaran akselerasi berbasis seri <em>Nihongo Soumatome</em> yang mengintegrasikan tiga pilar harian utama: Kosakata & Kanji, Tata Bahasa (Bunpo), dan Pemahaman Bacaan (Dokkai), dilengkapi dengan Kuis Campuran Harian terpadu.</p>
        
        <div class="info-grid" style="margin-top: 10px;">
            <div class="info-box" style="border-left: 4px solid #059669;">
                <h4>1. Bank Konten Terpusat</h4>
                <p>Pengajar mengelola master bank data secara terpusat dari panel Admin tanpa duplikasi data, lalu menugaskannya ke modul mingguan.</p>
            </div>
            <div class="info-box" style="border-left: 4px solid #0284c7;">
                <h4>2. Alur Belajar Terarah (Week & Day)</h4>
                <p>Kurikulum tersusun modular dalam format 7 hari belajar per minggu, diakhiri dengan evaluasi Ujian Mingguan CBT.</p>
            </div>
            <div class="info-box" style="border-left: 4px solid #f59e0b;">
                <h4>3. Kuis Campuran & Habit Loop</h4>
                <p>Latihan 10 soal acak harian di luar kelas yang memadukan ketiga materi untuk memicu retensi ingatan jangka panjang.</p>
            </div>
            <div class="info-box" style="border-left: 4px solid #8b5cf6;">
                <h4>4. Deteksi Titik Lemah (Weakspot)</h4>
                <p>Sistem otomatis merekam butir soal yang dijawab salah dan menyediakan tombol drill remedial pemulihan sekali klik.</p>
            </div>
        </div>

        <div class="img-card" style="margin-top: 20px;">
            <img src="${imgLogin}" alt="Halaman Login TOKU-UP" style="max-height: 80mm;" />
            <div class="img-caption">Gambar: Gerbang Masuk & Autentikasi Pengguna TOKU-UP</div>
        </div>
    </div>
    <div class="page-footer">
        <span>Buku Panduan Operasional TOKU-UP</span>
        <span class="page-num">2</span>
    </div>
</div>

<!-- HALAMAN 3: DAFTAR ISI & NAVIGASI DEEPLINK -->
<div class="page">
    <div class="page-header">
        <span class="brand">TOKU-UP MANUAL</span>
        <span class="doc-title">Daftar Isi</span>
    </div>
    <div class="content-body">
        <span class="chapter-badge">Navigasi Cepat</span>
        <h1 class="chapter-title">Daftar Isi & Deeplink</h1>
        <p class="lead">Daftar bab buku panduan beserta penomoran halaman yang terhubung langsung dengan tombol bantuan di setiap modul web.</p>
        
        <div style="margin-top: 14px;">
            <div class="toc-item">
                <span class="toc-title">Kata Pengantar & Arsitektur Ekosistem</span>
                <span class="toc-dots"></span>
                <span class="toc-page">Halaman 2</span>
            </div>
            <div class="toc-item" style="background: #f0fdf4; padding-left: 8px; border-radius: 6px;">
                <span class="toc-title"><strong>BAB 1: Bank Kosakata & Kanji (Admin)</strong> <code>#page=4</code></span>
                <span class="toc-dots"></span>
                <span class="toc-page">Halaman 4</span>
            </div>
            <div class="toc-item" style="padding-left: 20px;">
                <span class="toc-title">1.1 Manajemen Bank Kosakata & Filter Level</span>
                <span class="toc-dots"></span>
                <span class="toc-page">Halaman 5</span>
            </div>
            <div class="toc-item" style="padding-left: 20px;">
                <span class="toc-title">1.2 Input Manual Kanji & Stroke Order Canvas</span>
                <span class="toc-dots"></span>
                <span class="toc-page">Halaman 6</span>
            </div>
            <div class="toc-item" style="padding-left: 20px;">
                <span class="toc-title">1.3 Import Massal Spreadsheet Excel (.xlsx / .csv)</span>
                <span class="toc-dots"></span>
                <span class="toc-page">Halaman 8</span>
            </div>
            <div class="toc-item" style="background: #f0fdf4; padding-left: 8px; border-radius: 6px;">
                <span class="toc-title"><strong>BAB 2: Bank Grammar & Tata Bahasa (Admin)</strong> <code>#page=10</code></span>
                <span class="toc-dots"></span>
                <span class="toc-page">Halaman 10</span>
            </div>
            <div class="toc-item" style="padding-left: 20px;">
                <span class="toc-title">2.1 Formula Rumus Pola Soumatome Ber-token</span>
                <span class="toc-dots"></span>
                <span class="toc-page">Halaman 12</span>
            </div>
            <div class="toc-item" style="padding-left: 20px;">
                <span class="toc-title">2.2 Penyusunan Kuis Grammar 3 Tahap</span>
                <span class="toc-dots"></span>
                <span class="toc-page">Halaman 14</span>
            </div>
            <div class="toc-item" style="background: #f0fdf4; padding-left: 8px; border-radius: 6px;">
                <span class="toc-title"><strong>BAB 3: Alur Kurikulum & Penugasan Hari</strong> <code>#page=16</code></span>
                <span class="toc-dots"></span>
                <span class="toc-page">Halaman 16</span>
            </div>
            <div class="toc-item" style="padding-left: 20px;">
                <span class="toc-title">3.1 Pembagian Kelas Mandiri vs Kelas Mentor</span>
                <span class="toc-dots"></span>
                <span class="toc-page">Halaman 18</span>
            </div>
            <div class="toc-item" style="padding-left: 20px;">
                <span class="toc-title">3.2 Integrasi Ekosistem Dokkai Wacana</span>
                <span class="toc-dots"></span>
                <span class="toc-page">Halaman 20</span>
            </div>
            <div class="toc-item" style="background: #f0fdf4; padding-left: 8px; border-radius: 6px;">
                <span class="toc-title"><strong>BAB 4: Bank Soal Ujian CBT & Portal Evaluasi</strong> <code>#page=22</code></span>
                <span class="toc-dots"></span>
                <span class="toc-page">Halaman 22</span>
            </div>
            <div class="toc-item" style="padding-left: 20px;">
                <span class="toc-title">4.1 Pembuatan Paket Soal & Sesi Ujian</span>
                <span class="toc-dots"></span>
                <span class="toc-page">Halaman 24</span>
            </div>
            <div class="toc-item" style="padding-left: 20px;">
                <span class="toc-title">4.2 Fitur Anti-Cheat & Penilaian Akademis</span>
                <span class="toc-dots"></span>
                <span class="toc-page">Halaman 26</span>
            </div>
            <div class="toc-item" style="background: #f0fdf4; padding-left: 8px; border-radius: 6px;">
                <span class="toc-title"><strong>BAB 5: Buku Panduan Belajar Siswa (User)</strong> <code>#page=28</code></span>
                <span class="toc-dots"></span>
                <span class="toc-page">Halaman 28</span>
            </div>
        </div>
    </div>
    <div class="page-footer">
        <span>Buku Panduan Operasional TOKU-UP</span>
        <span class="page-num">3</span>
    </div>
</div>

<!-- HALAMAN 4: BAB 1 - BANK KOSAKATA & KANJI (#page=4) -->
<div class="page">
    <div class="page-header">
        <span class="brand">TOKU-UP MANUAL</span>
        <span class="doc-title">BAB 1 · Bank Kosakata & Kanji</span>
    </div>
    <div class="content-body">
        <span class="chapter-badge">Bab 1 · Target Deeplink #page=4</span>
        <h1 class="chapter-title">Bank Kosakata & Kanji</h1>
        <p class="lead">Pusat repositori perbendaharaan kosakata, huruf kanji, dan audio pelafalan. Pengajar dapat menginput materi satu kali dan menguncinya ke modul mingguan maupun kuis evaluasi harian.</p>

        <div class="img-card">
            <img src="${imgVocab}" alt="Antarmuka Bank Kosakata TOKU-UP" />
            <div class="img-caption">Tangkapan Layar Riil: Antarmuka Bank Kosakata & Kanji (Halaman /admin/vocabulary)</div>
        </div>

        <div class="info-grid">
            <div class="info-box">
                <h4>Fitur Utama Bank Kosakata:</h4>
                <ul class="step-list">
                    <li><strong>Kartu Kanji & Yomikata:</strong> Menampilkan cara baca hiragana dan arti bahasa Indonesia secara presisi.</li>
                    <li><strong>Filter Level Cepat:</strong> Menyortir materi berdasarkan tingkatan JLPT (N5 s/d N1).</li>
                    <li><strong>Pencarian Instan:</strong> Pencarian cepat berdasarkan kanji, romaji, maupun terjemahan.</li>
                </ul>
            </div>
            <div class="info-box">
                <h4>Aksi Cepat Pengajar:</h4>
                <ul class="step-list">
                    <li><strong>+ Tambah Kata:</strong> Form input manual lengkap dengan contoh kalimat Jepang.</li>
                    <li><strong>Import CSV/Excel:</strong> Unggah ratusan data kosakata sekaligus dalam hitungan detik.</li>
                    <li><strong>Stroke:</strong> Pratinjau animasi tata cara goresan kanji.</li>
                </ul>
            </div>
        </div>
    </div>
    <div class="page-footer">
        <span>Target Deeplink Tombol Web: #page=4</span>
        <span class="page-num">4</span>
    </div>
</div>

<!-- HALAMAN 5 s/d 9: DETAIL KOSAKATA -->
${[5, 6, 7, 8, 9].map(p => `
<div class="page">
    <div class="page-header">
        <span class="brand">TOKU-UP MANUAL</span>
        <span class="doc-title">BAB 1 · Detail Operasional Kosakata</span>
    </div>
    <div class="content-body">
        <span class="chapter-badge">Pedoman Input Kosakata (Halaman ${p})</span>
        <h2 style="font-size: 20px; font-weight: 800; margin-bottom: 8px;">${
            p === 5 ? '1.1 Tata Cara Input Kosakata & Kanji Manual' :
            p === 6 ? '1.2 Konfigurasi Handwriting Canvas & Audio Pelafalan' :
            p === 7 ? '1.3 Spaced Repetition (SM-2) & Penugasan ke Hari (Day)' :
            p === 8 ? '1.4 Format Spreadsheet Template Excel (toku-up-template.xlsx)' :
                      '1.5 Validasi Kesalahan & Dry-Run Preview Import'
        }</h2>
        <p class="lead">${
            p === 5 ? 'Setiap butir kosakata yang diinputkan wajib memiliki kata kanji asli, bacaan hiragana/katakana (furigana), dan terjemahan bahasa Indonesia yang kontekstual.' :
            p === 6 ? 'Sistem dilengkapi otomatisasi goresan kanji SVG. Siswa dapat berlatih menulis di atas kanvas dengan deteksi akurasi goresan real-time.' :
            p === 7 ? 'Algoritma SuperMemo (SM-2) secara otomatis menjadwalkan repetisi flashcard kosakata bagi kata-kata yang dinilai sulit oleh siswa.' :
            p === 8 ? 'Gunakan template spreadsheet resmi yang disediakan pada tombol unduh template agar format kolom tidak bentrok saat diproses sistem.' :
                      'Sebelum data disimpan permanen, sistem akan menampilkan tabel pratinjau untuk memastikan tidak ada duplikasi data atau sel kosong.'
        }</p>

        <div class="info-box" style="margin-top: 14px; background: #ffffff; border: 1px solid #cbd5e1;">
            <h4 style="color: #059669; font-size: 13px;">Format Kolom Spreadsheet Resmi (XLSX):</h4>
            <table style="width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 10.5px;">
                <thead>
                    <tr style="background: #f1f5f9; text-align: left;">
                        <th style="padding: 6px; border: 1px solid #cbd5e1;">Nama Kolom</th>
                        <th style="padding: 6px; border: 1px solid #cbd5e1;">Tipe Data</th>
                        <th style="padding: 6px; border: 1px solid #cbd5e1;">Contoh Isi</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td style="padding: 5px; border: 1px solid #cbd5e1;">kanji</td><td style="padding: 5px; border: 1px solid #cbd5e1;">Teks CJK</td><td style="padding: 5px; border: 1px solid #cbd5e1;">確認</td></tr>
                    <tr><td style="padding: 5px; border: 1px solid #cbd5e1;">reading</td><td style="padding: 5px; border: 1px solid #cbd5e1;">Kana</td><td style="padding: 5px; border: 1px solid #cbd5e1;">かくにん</td></tr>
                    <tr><td style="padding: 5px; border: 1px solid #cbd5e1;">meaning_id</td><td style="padding: 5px; border: 1px solid #cbd5e1;">Teks ID</td><td style="padding: 5px; border: 1px solid #cbd5e1;">konfirmasi / pengecekan</td></tr>
                    <tr><td style="padding: 5px; border: 1px solid #cbd5e1;">jlpt_level</td><td style="padding: 5px; border: 1px solid #cbd5e1;">Enum</td><td style="padding: 5px; border: 1px solid #cbd5e1;">N3</td></tr>
                    <tr><td style="padding: 5px; border: 1px solid #cbd5e1;">example_sentence</td><td style="padding: 5px; border: 1px solid #cbd5e1;">Teks JP</td><td style="padding: 5px; border: 1px solid #cbd5e1;">内容をご確認ください。</td></tr>
                </tbody>
            </table>
        </div>

        <div style="margin-top: 16px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 12px;">
            <p style="font-size: 11px; color: #065f46; font-weight: 600;">Tips Pengajar:</p>
            <p style="font-size: 11px; color: #047857; margin-top: 2px;">Pastikan kolom reading diisi murni karakter Hiragana atau Katakana agar furigana pada modul siswa terpasang dengan presisi.</p>
        </div>
    </div>
    <div class="page-footer">
        <span>Buku Panduan Operasional TOKU-UP</span>
        <span class="page-num">${p}</span>
    </div>
</div>
`).join('')}

<!-- HALAMAN 10: BAB 2 - BANK GRAMMAR & POLA KALIMAT (#page=10) -->
<div class="page">
    <div class="page-header">
        <span class="brand">TOKU-UP MANUAL</span>
        <span class="doc-title">BAB 2 · Bank Grammar & Tata Bahasa</span>
    </div>
    <div class="content-body">
        <span class="chapter-badge">Bab 2 · Target Deeplink #page=10</span>
        <h1 class="chapter-title">Bank Grammar (Tata Bahasa)</h1>
        <p class="lead">Repositori master pola kalimat bahasa Jepang bergaya <em>Nihongo Soumatome</em>. Mendukung formulasi rumus pembentukan token bertanda pemisah serta pembuatan kuis 3 tahap interaktif.</p>

        <div class="img-card">
            <img src="${imgGrammar}" alt="Antarmuka Bank Grammar TOKU-UP" />
            <div class="img-caption">Tangkapan Layar Riil: Repositori Pola Grammar (Halaman /admin/bank-soal-konten)</div>
        </div>

        <div class="info-grid">
            <div class="info-box">
                <h4>Pemisah Rumus Soumatome:</h4>
                <p>Rumus pembentukan pola dipisahkan menjadi token visual yang bersih, misalnya: <code>[Kata Kerja (Bentuk ない)] + [ざるを得ない]</code>. Tim kurikulum dapat langsung mendesain dari sel Excel.</p>
            </div>
            <div class="info-box">
                <h4>Penugasan Modul (Assign to Day):</h4>
                <p>Setiap pola grammar dapat langsung ditugaskan ke Hari belajar tertentu dengan menekan tombol <strong>Tugaskan</strong> berwarna hijau di tabel master.</p>
            </div>
        </div>
    </div>
    <div class="page-footer">
        <span>Target Deeplink Tombol Web: #page=10</span>
        <span class="page-num">10</span>
    </div>
</div>

<!-- HALAMAN 11 s/d 15: DETAIL GRAMMAR -->
${[11, 12, 13, 14, 15].map(p => `
<div class="page">
    <div class="page-header">
        <span class="brand">TOKU-UP MANUAL</span>
        <span class="doc-title">BAB 2 · Kuis Grammar 3 Tahap</span>
    </div>
    <div class="content-body">
        <span class="chapter-badge">Penyusunan Kuis Grammar (Halaman ${p})</span>
        <h2 style="font-size: 20px; font-weight: 800; margin-bottom: 8px;">${
            p === 11 ? '2.1 Struktur Intro Pola & Audio Kalimat Contoh' :
            p === 12 ? '2.2 Tahap 1: Kuis Perubahan Bentuk (Transformation)' :
            p === 13 ? '2.3 Tahap 2: Penyusunan Potongan Kata (Sentence Builder)' :
            p === 14 ? '2.4 Tahap 3: Pemilihan Konteks Pola (Context Choice)' :
                      '2.5 Integrasi Generator Soal Otomatis & Penilaian Nilai'
        }</h2>
        <p class="lead">${
            p === 11 ? 'Halaman intro pola menyajikan kaidah tata bahasa, arti bahasa Indonesia, dan kartu contoh kalimat yang dilengkapi tombol pemutar suara TTS bahasa Jepang.' :
            p === 12 ? 'Tahap 1 menguji pemahaman siswa dalam mengubah kata kerja, kata sifat, atau kata benda ke dalam bentuk yang disyaratkan oleh pola tata bahasa.' :
            p === 13 ? 'Tahap 2 melatih susunan kata (語順) menggunakan komponen sentuh Sentence Builder di mana siswa menyusun token-token kata ke dalam baki kalimat.' :
            p === 14 ? 'Tahap 3 menguji kepekaan nuansa makna pola di dalam kalimat percakapan nyata melalui soal pilihan ganda berkategori situasi.' :
                      'Sistem menyediakan fitur Generate Draft otomatis untuk memudahkan pengajar membuat draf soal pilihan ganda berdasarkan kosakata modul.'
        }</p>

        <div class="info-grid" style="margin-top: 14px;">
            <div class="info-box" style="background: #ffffff;">
                <h4>Aturan Penulisan Rumus dari Excel:</h4>
                <p>Gunakan tanda tambah <code>+</code> atau garis miring <code>/</code> untuk memisahkan komponen bentuk. Parser sistem otomatis mengonversinya menjadi badge token kartu elegan.</p>
            </div>
            <div class="info-box" style="background: #ffffff;">
                <h4>Dukungan Audio Google TTS:</h4>
                <p>Semua contoh kalimat Jepang secara otomatis terhubung dengan synthesizer suara ucapan alami berkecepatan 0.85x yang nyaman untuk telinga siswa pemula.</p>
            </div>
        </div>
    </div>
    <div class="page-footer">
        <span>Buku Panduan Operasional TOKU-UP</span>
        <span class="page-num">${p}</span>
    </div>
</div>
`).join('')}

<!-- HALAMAN 16: BAB 3 - KURIKULUM & ALUR HARI (#page=16) -->
<div class="page">
    <div class="page-header">
        <span class="brand">TOKU-UP MANUAL</span>
        <span class="doc-title">BAB 3 · Kurikulum & Alur Belajar</span>
    </div>
    <div class="content-body">
        <span class="chapter-badge">Bab 3 · Target Deeplink #page=16</span>
        <h1 class="chapter-title">Kurikulum & Alur Modul</h1>
        <p class="lead">Pengelolaan alur belajar mingguan siswa. Kurikulum disusun berjenjang mulai dari Program Belajar, Modul Mingguan (Week), hingga Node Pembelajaran Harian (Day 1 s/d 7).</p>

        <div class="img-card">
            <img src="${imgModule}" alt="Antarmuka Kurikulum Modul TOKU-UP" />
            <div class="img-caption">Tangkapan Layar Riil: Manajemen Kelas & Kurikulum (Halaman /admin/programs)</div>
        </div>

        <div class="info-grid">
            <div class="info-box">
                <h4>Kelas Mandiri vs Kelas Mentor:</h4>
                <p><strong>Kelas Mandiri:</strong> Pembelian via Midtrans langsung aktif seketika tanpa kuota kloter.<br><strong>Kelas Mentor:</strong> Mengharuskan penempatan kloter dan jadwal bimbingan live.</p>
            </div>
            <div class="info-box">
                <h4>Tombol ke-4: Kuis Campuran:</h4>
                <p>Pada setiap node Hari belajar, sistem menyematkan tombol ke-4 di bawah Dokkai untuk evaluasi komprehensif 10 soal acak perolehan +30 XP.</p>
            </div>
        </div>
    </div>
    <div class="page-footer">
        <span>Target Deeplink Tombol Web: #page=16</span>
        <span class="page-num">16</span>
    </div>
</div>

<!-- HALAMAN 17 s/d 21: DETAIL KURIKULUM -->
${[17, 18, 19, 20, 21].map(p => `
<div class="page">
    <div class="page-header">
        <span class="brand">TOKU-UP MANUAL</span>
        <span class="doc-title">BAB 3 · Manajemen Modul & Node Hari</span>
    </div>
    <div class="content-body">
        <span class="chapter-badge">Operasional Kurikulum (Halaman ${p})</span>
        <h2 style="font-size: 20px; font-weight: 800; margin-bottom: 8px;">${
            p === 17 ? '3.1 Tata Kelola Node Belajar Harian (Day 1 s/d Day 7)' :
            p === 18 ? '3.2 Integrasi Ekosistem Dokkai Wacana & Popover Glosarium' :
            p === 19 ? '3.3 Penempatan Slide Presentasi Mingguan (Opening & Closing)' :
            p === 20 ? '3.4 Sistem Checkpoint Kuis (Penyimpanan Otomatis 72 Jam)' :
                      '3.5 Proteksi Dialog Konfirmasi Keluar (Exit Guard)'
        }</h2>
        <p class="lead">${
            p === 17 ? 'Pengajar dapat mengatur status node hari: Aktif (terbuka), Terkunci (selesaikan hari sebelumnya), atau Belum Tersedia jika kurikulum masih dalam penyusunan.' :
            p === 18 ? 'Dokkai menyajikan wacana teks standar JLPT dengan inspeksi ketukan kata dan kuis pemahaman satu layar tanpa daftar kata panjang yang memicu beban kognitif.' :
            p === 19 ? 'Slide presentasi mentor diletakkan pada slot mingguan: Opening (sebelum Day 1), After Day, dan Closing (setelah ujian mingguan rampung).' :
            p === 20 ? 'Siswa yang terhenti di tengah latihan kuis dapat melanjutkan kembali kapan saja berkat penyimpanan buffer sesi otomatis selama 3 hari.' :
                      'Tombol kembali atau tombol Escape memunculkan dialog konfirmasi aman yang memberitahukan progres siswa tersimpan rapi di checkpoint.'
        }</p>
        
        <div class="info-box" style="margin-top: 14px; background: #ffffff;">
            <h4>Standar Badge Soumatome Otentik di Node Hari:</h4>
            <p>Node hari dilengkapi ikon sampul buku WebP transparan resolusi tinggi: Kanji (ungu), Bunpo (biru), Dokkai (hijau), dan Kuis Campuran (oranye emas) yang selaras dengan buku fisik.</p>
        </div>
    </div>
    <div class="page-footer">
        <span>Buku Panduan Operasional TOKU-UP</span>
        <span class="page-num">${p}</span>
    </div>
</div>
`).join('')}

<!-- HALAMAN 22: BAB 4 - BANK SOAL UJIAN CBT (#page=22) -->
<div class="page">
    <div class="page-header">
        <span class="brand">TOKU-UP MANUAL</span>
        <span class="doc-title">BAB 4 · Bank Soal Ujian CBT</span>
    </div>
    <div class="content-body">
        <span class="chapter-badge">Bab 4 · Target Deeplink #page=22</span>
        <h1 class="chapter-title">Bank Soal Ujian CBT</h1>
        <p class="lead">Portal Computer-Based Test (CBT) mandiri untuk evaluasi mingguan berformat satu lembar fokus. Bebas elemen gamifikasi (tanpa XP/streak) demi objektivitas nilai akademis siswa.</p>

        <div class="img-card">
            <img src="${imgExam}" alt="Antarmuka Bank Soal CBT TOKU-UP" />
            <div class="img-caption">Tangkapan Layar Riil: Bank Soal Ujian CBT (Halaman /admin/exams/question-banks)</div>
        </div>

        <div class="info-grid">
            <div class="info-box">
                <h4>Fitur Ujian Mingguan CBT:</h4>
                <ul class="step-list">
                    <li><strong>Timer Countdown:</strong> Batas waktu ujian ketat dengan autosubmit saat waktu habis.</li>
                    <li><strong>Autosave Jawaban:</strong> Setiap opsi yang dipilih langsung tersimpan ke server.</li>
                    <li><strong>Sidebar Navigasi:</strong> Nomor soal dengan status terjawab dan ragu-ragu.</li>
                </ul>
            </div>
            <div class="info-box">
                <h4>Keamanan Ujian (Anti-Cheat):</h4>
                <ul class="step-list">
                    <li><strong>Deteksi Pindah Tab:</strong> Peringatan otomatis jika siswa meninggalkan jendela browser.</li>
                    <li><strong>Batasan Audio 2x:</strong> Soal listening choukai dibatasi maksimal dua kali putar.</li>
                    <li><strong>Rilis Hasil Bertahap:</strong> Admin dapat menahan pengumuman nilai hingga sesi selesai.</li>
                </ul>
            </div>
        </div>
    </div>
    <div class="page-footer">
        <span>Target Deeplink Tombol Web: #page=22</span>
        <span class="page-num">22</span>
    </div>
</div>

<!-- HALAMAN 23 s/d 27: DETAIL UJIAN CBT -->
${[23, 24, 25, 26, 27].map(p => `
<div class="page">
    <div class="page-header">
        <span class="brand">TOKU-UP MANUAL</span>
        <span class="doc-title">BAB 4 · Tata Kelola Portal Ujian CBT</span>
    </div>
    <div class="content-body">
        <span class="chapter-badge">Panduan Operasional CBT (Halaman ${p})</span>
        <h2 style="font-size: 20px; font-weight: 800; margin-bottom: 8px;">${
            p === 23 ? '4.1 Struktur Hierarki Paket Soal & Wrapper Wacana' :
            p === 24 ? '4.2 Penyusunan Sesi Ujian & Alokasi Kloter Siswa' :
            p === 25 ? '4.3 Manajemen Versi Ujian (Draft vs Terbit)' :
            p === 26 ? '4.4 Rekonsiliasi Hasil Nilai & Sertifikat Kelulusan' :
                      '4.5 Ekspor Lembar Jawaban & Analisis Butir Soal Gagal'
        }</h2>
        <p class="lead">${
            p === 23 ? 'Soal ujian dapat berdiri mandiri (single question) maupun dikelompokkan dalam satu wacana atau klip audio (stimulus wrapper) untuk soal pemahaman bacaan.' :
            p === 24 ? 'Admin dapat membuka sesi ujian untuk kloter tertentu dengan jadwal mulai dan batas akhir pengerjaan yang terkunci otomatis.' :
            p === 25 ? 'Setiap revisi soal disimpan dalam nomor versi baru sehingga riwayat attempt siswa terdahulu tidak mengalami korupsi nilai.' :
            p === 26 ? 'Sistem menghitung persentase ketuntasan dan secara otomatis menerbitkan e-sertifikat kelulusan bagi siswa yang melampaui passing grade.' :
                      'Admin dapat mengekspor ringkasan nilai seluruh peserta ke format CSV dan melihat butir soal mana yang paling banyak gagal dijawab oleh siswa.'
        }</p>

        <div class="info-box" style="margin-top: 14px; background: #ffffff;">
            <h4>Format Penilaian Standar JLPT:</h4>
            <p>Sistem mendukung pembobotan skor proporsional per kategori sehingga hasil simulasi mencerminkan skor riil ujian kemampuan bahasa Jepang resmi.</p>
        </div>
    </div>
    <div class="page-footer">
        <span>Buku Panduan Operasional TOKU-UP</span>
        <span class="page-num">${p}</span>
    </div>
</div>
`).join('')}

<!-- HALAMAN 28: BAB 5 - PANDUAN SISWA & HABIT LOOP (#page=28) -->
<div class="page">
    <div class="page-header">
        <span class="brand">TOKU-UP MANUAL</span>
        <span class="doc-title">BAB 5 · Panduan Belajar Siswa (User)</span>
    </div>
    <div class="content-body">
        <span class="chapter-badge">Bab 5 · Target Deeplink #page=28</span>
        <h1 class="chapter-title">Panduan Belajar Siswa</h1>
        <p class="lead">Panduan lengkap bagi peserta didik TOKU-UP. Memaksimalkan fitur gamifikasi harian, habit loop Kuis Campuran, dan pemulihan titik lemah (weakspot) untuk lulus JLPT.</p>

        <div class="img-card">
            <img src="${imgStudentDash}" alt="Dasbor Belajar Siswa TOKU-UP" />
            <div class="img-caption">Tangkapan Layar Riil: Beranda & Hub Latihan Harian Siswa (/user/dashboard)</div>
        </div>

        <div class="info-grid">
            <div class="info-box">
                <h4>Kuis Campuran Harian (10 Soal):</h4>
                <p>Selesaikan satu sesi latihan komprehensif (4 Kosakata, 3 Bunpo, 3 Dokkai) setiap hari untuk mengumpulkan <strong>+30 XP</strong> dan menutup target belajar harian.</p>
            </div>
            <div class="info-box">
                <h4>Pemulihan Titik Lemah:</h4>
                <p>Klik tombol <strong>Latih Titik Lemah</strong> di Beranda atau Progres untuk mengulang butir-butir soal yang pernah Anda jawab keliru hingga tuntas 100%.</p>
            </div>
        </div>

        <div class="img-card" style="margin-top: 10px;">
            <img src="${imgStudentProgress}" alt="Halaman Progres Siswa" style="max-height: 65mm;" />
            <div class="img-caption">Tangkapan Layar Riil: Pemantauan Progres Belajar & Donut Ring 3 Pilar (/user/progress)</div>
        </div>
    </div>
    <div class="page-footer">
        <span>Target Deeplink Tombol Web: #page=28</span>
        <span class="page-num">28</span>
    </div>
</div>

</body>
</html>
`;

fs.writeFileSync(HTML_FILE, pagesHtml);
console.log('✅ File HTML panduan berhasil dibuat di: ' + HTML_FILE);

// Konversi HTML ke PDF menggunakan Chrome print-to-pdf
async function convertHtmlToPdf() {
    console.log('🚀 Menjalankan headless Chrome untuk mencetak PDF...');
    const chrome = spawn(CHROME_PATH, [
        `--remote-debugging-port=${PORT}`,
        '--headless=new',
        '--disable-gpu',
        '--no-sandbox',
        '--user-data-dir=' + path.resolve('storage/temp_chrome_print')
    ], { stdio: 'ignore' });

    const sleep = ms => new Promise(r => setTimeout(r, ms));
    await sleep(2000);

    const targetsRes = await fetch(`http://127.0.0.1:${PORT}/json/list`);
    const targets = await targetsRes.json();
    const wsUrl = targets[0].webSocketDebuggerUrl;

    const ws = new WebSocket(wsUrl);
    await new Promise(r => ws.onopen = r);

    let id = 1;
    function send(method, params = {}) {
        return new Promise((resolve, reject) => {
            const reqId = id++;
            const handler = ev => {
                const msg = JSON.parse(ev.data);
                if (msg.id === reqId) {
                    ws.removeEventListener('message', handler);
                    if (msg.error) reject(new Error(msg.error.message));
                    else resolve(msg.result);
                }
            };
            ws.addEventListener('message', handler);
            ws.send(JSON.stringify({ id: reqId, method, params }));
        });
    }

    await send('Page.enable');
    const fileUrl = 'file:///' + HTML_FILE.replace(/\\\\/g, '/');
    console.log('Navigasi ke template HTML: ' + fileUrl);
    await send('Page.navigate', { url: fileUrl });
    await sleep(3000);

    console.log('🖨️ Mencetak dokumen ke PDF (A4 margin 0)...');
    const { data } = await send('Page.printToPDF', {
        paperWidth: 8.27,
        paperHeight: 11.69,
        marginTop: 0,
        marginBottom: 0,
        marginLeft: 0,
        marginRight: 0,
        printBackground: true,
        preferCSSPageSize: true
    });

    fs.writeFileSync(PDF_OUTPUT, Buffer.from(data, 'base64'));
    console.log(`🎉 SUKSES! PDF User Manual Resmi terbit di: ${PDF_OUTPUT} (${(fs.statSync(PDF_OUTPUT).size / 1024).toFixed(1)} KB)`);

    ws.close();
    chrome.kill();
    process.exit(0);
}

convertHtmlToPdf().catch(err => {
    console.error('Gagal cetak PDF:', err);
    process.exit(1);
});
