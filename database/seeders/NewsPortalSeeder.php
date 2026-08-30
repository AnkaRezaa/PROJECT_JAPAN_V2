<?php

namespace Database\Seeders;

use App\Models\Berita;
use App\Models\Pengguna;
use Illuminate\Database\Seeder;

class NewsPortalSeeder extends Seeder
{
    public function run(): void
    {
        $authorId = Pengguna::query()
            ->where('email', 'superadmin@toku-up.com')
            ->value('id');

        foreach ($this->articles() as $article) {
            Berita::updateOrCreate(
                ['slug' => $article['slug']],
                [
                    ...$article,
                    'created_by' => $authorId,
                    'updated_by' => $authorId,
                ],
            );
        }
    }

    private function articles(): array
    {
        return [
            [
                'title' => 'Menyusun Rutinitas Belajar JLPT N3 yang Konsisten',
                'slug' => 'rutinitas-belajar-jlpt-n3-konsisten',
                'excerpt' => 'Mulai dari sesi singkat yang realistis, lalu bangun ritme belajar yang dapat dipertahankan setiap minggu.',
                'body' => '<h2>Mulai dari target yang kecil</h2><p>Rutinitas belajar yang baik tidak harus dimulai dari dua jam setiap hari. Pilih satu sesi fokus selama 20 sampai 30 menit, lalu tentukan materi yang jelas untuk diselesaikan.</p><h2>Gabungkan tiga aktivitas</h2><p>Gunakan satu sesi untuk kosakata, satu sesi untuk flashcard, dan satu sesi untuk kuis. Pola sederhana ini membantu materi baru masuk tanpa mengabaikan review.</p><blockquote>Konsisten lebih penting daripada belajar terlalu banyak dalam satu hari.</blockquote>',
                'status' => 'published',
                'audience' => 'students',
                'category' => 'materi-belajar',
                'is_pinned' => true,
                'published_at' => now()->subDays(1),
                'scheduled_at' => null,
                'cover_image_path' => 'uploads/news/covers/seed/jlpt-n3-study-desk.png',
                'cover_image_alt' => 'Pelajar sedang menulis catatan bahasa Jepang di meja belajar.',
                'cover_image_caption' => 'Sesi belajar singkat yang konsisten dapat membangun progres jangka panjang.',
                'seo_title' => 'Rutinitas Belajar JLPT N3 yang Konsisten',
                'seo_description' => 'Panduan sederhana membangun ritme belajar JLPT N3 yang realistis dan konsisten.',
            ],
            [
                'title' => 'Cara Review Flashcard tanpa Membuatnya Menumpuk',
                'slug' => 'cara-review-flashcard-tanpa-menumpuk',
                'excerpt' => 'Atur review harian yang ringan agar kosakata tetap melekat tanpa membuat sesi belajar terasa berat.',
                'body' => '<h2>Review sebelum menambah kartu baru</h2><p>Selesaikan kartu yang jatuh tempo sebelum membuka kosakata baru. Cara ini menjaga tumpukan tetap terkendali dan memberi otak kesempatan mengulang materi.</p><h2>Jawab dengan jujur</h2><p>Jika masih ragu dengan sebuah kata, tandai sebagai belum ingat. Review yang jujur akan menghasilkan jadwal pengulangan yang lebih berguna.</p><p>Gunakan sesi pendek pada pagi atau malam hari agar flashcard menjadi kebiasaan, bukan tugas yang ditunda.</p>',
                'status' => 'published',
                'audience' => 'students',
                'category' => 'tips-belajar',
                'is_pinned' => false,
                'published_at' => now()->subDays(2),
                'scheduled_at' => null,
                'cover_image_path' => 'uploads/news/covers/seed/flashcard-review-session.png',
                'cover_image_alt' => 'Tangan sedang menyusun kartu flashcard di atas meja kayu.',
                'cover_image_caption' => 'Review singkat setiap hari lebih efektif daripada sesi panjang yang jarang dilakukan.',
                'seo_title' => 'Cara Review Flashcard agar Tidak Menumpuk',
                'seo_description' => 'Tips mengatur review flashcard harian untuk belajar kosakata bahasa Jepang.',
            ],
            [
                'title' => 'Belajar Bahasa Jepang Saat Perjalanan: Coba Sesi 15 Menit',
                'slug' => 'belajar-bahasa-jepang-saat-perjalanan',
                'excerpt' => 'Waktu tunggu dan perjalanan dapat menjadi sesi review kecil yang tetap produktif.',
                'body' => '<h2>Pilih materi yang mudah dilanjutkan</h2><p>Gunakan perjalanan untuk flashcard, mendengar contoh kalimat, atau membaca ulang ringkasan materi. Hindari tugas yang membutuhkan fokus panjang ketika lingkungan sedang ramai.</p><h2>Siapkan sebelum berangkat</h2><p>Simpan daftar kartu atau materi pilihan terlebih dahulu. Ketika waktu luang muncul, Anda bisa langsung mulai tanpa perlu memilih bahan belajar lagi.</p>',
                'status' => 'published',
                'audience' => 'students',
                'category' => 'tips-belajar',
                'is_pinned' => false,
                'published_at' => now()->subDays(3),
                'scheduled_at' => null,
                'cover_image_path' => 'uploads/news/covers/seed/commute-japanese-study.png',
                'cover_image_alt' => 'Pelajar meninjau catatan bahasa Jepang saat berada di kereta.',
                'cover_image_caption' => 'Sesi 15 menit dapat membantu menjaga kontinuitas belajar di hari yang sibuk.',
                'seo_title' => 'Belajar Bahasa Jepang Saat Perjalanan',
                'seo_description' => 'Cara memanfaatkan waktu perjalanan untuk review bahasa Jepang yang singkat dan fokus.',
            ],
            [
                'title' => 'Mengenal Ocha sebagai Bagian dari Budaya Belajar Jepang',
                'slug' => 'mengenal-ocha-dan-budaya-belajar-jepang',
                'excerpt' => 'Istirahat yang tenang dapat menjadi bagian dari proses belajar, bukan gangguan dari target harian.',
                'body' => '<h2>Berhenti sejenak untuk kembali fokus</h2><p>Dalam banyak kebiasaan belajar, jeda singkat digunakan untuk merapikan pikiran sebelum kembali mengerjakan materi. Secangkir teh dan meja yang rapi dapat membantu menciptakan transisi yang nyaman.</p><h2>Jadikan jeda sebagai ritual sederhana</h2><p>Tentukan durasi istirahat, jauhkan notifikasi, lalu kembali ke satu target kecil. Ritme ini membuat sesi belajar terasa lebih berkelanjutan.</p>',
                'status' => 'published',
                'audience' => 'students',
                'category' => 'budaya-jepang',
                'is_pinned' => false,
                'published_at' => now()->subDays(4),
                'scheduled_at' => null,
                'cover_image_path' => 'uploads/news/covers/seed/tea-culture-study-break.png',
                'cover_image_alt' => 'Teh hijau, buku catatan, dan bunga sakura di meja belajar.',
                'cover_image_caption' => 'Jeda yang teratur membantu menjaga energi saat belajar mandiri.',
                'seo_title' => 'Ocha dan Budaya Belajar Jepang',
                'seo_description' => 'Mengenal peran jeda dan teh dalam membangun suasana belajar yang tenang.',
            ],
            [
                'title' => 'Pendaftaran Kloter Belajar Baru Telah Dibuka',
                'slug' => 'pendaftaran-kloter-belajar-baru-dibuka',
                'excerpt' => 'Pilih kloter yang sesuai dengan jadwal Anda untuk mengikuti roadmap pembelajaran secara bertahap.',
                'body' => '<h2>Belajar dengan ritme mingguan</h2><p>Kloter membantu peserta mengikuti urutan materi, flashcard, dan kuis berdasarkan minggu belajar. Periksa jadwal mulai dan kapasitas sebelum memilih kelas.</p><h2>Siapkan waktu review</h2><p>Selain mengikuti materi baru, sisihkan waktu untuk mengulang kosakata dan menyelesaikan kuis pada minggu yang sama.</p>',
                'status' => 'published',
                'audience' => 'students',
                'category' => 'pengumuman',
                'is_pinned' => false,
                'published_at' => now()->subDays(5),
                'scheduled_at' => null,
                'cover_image_path' => 'uploads/news/covers/seed/cohort-learning-schedule.png',
                'cover_image_alt' => 'Kalender dan perlengkapan belajar bahasa Jepang di meja kerja.',
                'cover_image_caption' => 'Pilih jadwal yang realistis agar progres belajar dapat dijaga setiap minggu.',
                'seo_title' => 'Pendaftaran Kloter Belajar Baru',
                'seo_description' => 'Informasi pendaftaran kloter baru dan cara memilih jadwal belajar yang sesuai.',
            ],
            [
                'title' => 'Belajar Bareng: Memaksimalkan Sesi Kelompok Online',
                'slug' => 'memaksimalkan-sesi-kelompok-online',
                'excerpt' => 'Sesi kelompok yang terstruktur dapat membuat latihan speaking dan review terasa lebih terarah.',
                'body' => '<h2>Tentukan tujuan sebelum sesi dimulai</h2><p>Gunakan satu sesi untuk satu tujuan, misalnya membahas kosakata tema tertentu atau mengulang pola kalimat dari modul minggu ini.</p><h2>Berikan ruang untuk mencoba</h2><p>Jangan hanya mendengar penjelasan. Minta setiap peserta membuat contoh kalimat, menjawab satu pertanyaan, atau menceritakan pengalaman singkat.</p>',
                'status' => 'published',
                'audience' => 'students',
                'category' => 'materi-belajar',
                'is_pinned' => false,
                'published_at' => now()->subDays(6),
                'scheduled_at' => null,
                'cover_image_path' => 'uploads/news/covers/seed/online-study-group.png',
                'cover_image_alt' => 'Kelompok pelajar mengikuti sesi belajar daring dengan laptop dan catatan.',
                'cover_image_caption' => 'Sesi kelompok akan lebih berguna ketika memiliki target latihan yang jelas.',
                'seo_title' => 'Memaksimalkan Sesi Kelompok Online',
                'seo_description' => 'Panduan singkat membuat sesi kelompok online bahasa Jepang lebih efektif.',
            ],
            [
                'title' => 'Menjaga Motivasi Belajar dari Satu Minggu ke Minggu Berikutnya',
                'slug' => 'menjaga-motivasi-belajar-bahasa-jepang',
                'excerpt' => 'Progres kecil yang terlihat akan membantu Anda tetap bergerak ketika materi mulai terasa menantang.',
                'body' => '<h2>Catat kemenangan kecil</h2><p>Satu set flashcard selesai, satu kuis dikerjakan, atau satu pola kalimat dipahami adalah bukti bahwa progres sedang terjadi. Catat pencapaian kecil itu di akhir minggu.</p><h2>Kembali ke alasan awal</h2><p>Tujuan belajar dapat berubah, tetapi arah yang jelas membantu memilih satu langkah berikutnya. Gunakan roadmap sebagai panduan, bukan sebagai beban.</p>',
                'status' => 'published',
                'audience' => 'students',
                'category' => 'platform',
                'is_pinned' => false,
                'published_at' => now()->subDays(7),
                'scheduled_at' => null,
                'cover_image_path' => 'uploads/news/covers/seed/mount-fuji-learning-journey.png',
                'cover_image_alt' => 'Gunung Fuji di kejauhan dengan buku catatan belajar di bagian depan.',
                'cover_image_caption' => 'Perjalanan belajar yang panjang tetap dimulai dari satu sesi kecil hari ini.',
                'seo_title' => 'Menjaga Motivasi Belajar Bahasa Jepang',
                'seo_description' => 'Cara menjaga motivasi belajar bahasa Jepang dengan target kecil dan roadmap mingguan.',
            ],
        ];
    }
}
