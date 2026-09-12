<?php

namespace Database\Seeders;

use App\Models\BroadcastPopup;
use Illuminate\Database\Seeder;

class SampleBroadcastPopupSeeder extends Seeder
{
    public function run(): void
    {
        BroadcastPopup::updateOrCreate(
            ['title' => 'Promo Spesial JLPT N5-N3: Diskon 40%!'],
            [
                'description' => 'Akses seluruh materi JLPT, ribuan bank soal interaktif, live class mingguan, dan tryout bersertifikat dengan harga hemat.',
                'type' => 'promo',
                'badge' => 'DISKON 40%',
                'image_path' => '/images/promo_jlpt_banner.jpg',
                'cta_label' => 'Lihat Paket Belajar',
                'cta_url' => '/pricing',
                'target_page' => 'all',
                'target_audience' => 'all',
                'is_active' => true,
            ]
        );
    }
}
