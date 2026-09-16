<?php

namespace Database\Seeders;

use App\Models\AnggotaKloter;
use App\Models\DeckPresentasi;
use App\Models\KloterBelajar;
use App\Models\KodeAkses;
use App\Models\Kosakata;
use App\Models\Kuis;
use App\Models\Langganan;
use App\Models\Modul;
use App\Models\PaketPembayaran;
use App\Models\ProgramPembelajaran;
use App\Models\SesiKelasLive;
use App\Models\SetFlashcard;
use App\Models\Transaksi;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DemoDataSeeder extends Seeder
{
    private const DEMO_PROGRAM_SLUGS = [
        KelasDemoSeeder::MANDIRI_SLUG,
        KelasDemoSeeder::MENTOR_SLUG,
        'jlpt-n3-mandiri',
        'n3-kosakata-50d',
        'n3-kanji-repetition',
        'n3-tryout-ujian',
    ];

    public function run(): void
    {
        $this->purgeDemoPrograms();

        $this->call([
            PenggunaSeeder::class,
            KelasDemoSeeder::class,
            GrammarLessonDemoSeeder::class,
            ProgramPaymentPlanSeeder::class,
            KloterDemoSeeder::class,
        ]);
    }

    private function purgeDemoPrograms(): void
    {
        DB::transaction(function () {
            $programIds = ProgramPembelajaran::query()
                ->whereIn('slug', self::DEMO_PROGRAM_SLUGS)
                ->pluck('id');

            if ($programIds->isEmpty()) {
                return;
            }

            $moduleIds = Modul::query()
                ->whereIn('program_pembelajaran_id', $programIds)
                ->pluck('id');
            $planIds = PaketPembayaran::query()
                ->whereIn('program_pembelajaran_id', $programIds)
                ->pluck('id');
            $kloterIds = KloterBelajar::query()
                ->whereIn('program_pembelajaran_id', $programIds)
                ->pluck('id');

            SesiKelasLive::query()->whereIn('program_pembelajaran_id', $programIds)->delete();
            AnggotaKloter::query()->whereIn('kloter_belajar_id', $kloterIds)->delete();
            Transaksi::query()
                ->whereIn('program_pembelajaran_id', $programIds)
                ->orWhereIn('payment_plan_id', $planIds)
                ->delete();
            Langganan::query()
                ->whereIn('program_pembelajaran_id', $programIds)
                ->orWhereIn('payment_plan_id', $planIds)
                ->delete();
            KodeAkses::query()
                ->whereIn('program_pembelajaran_id', $programIds)
                ->orWhereIn('payment_plan_id', $planIds)
                ->delete();
            KloterBelajar::query()->whereIn('id', $kloterIds)->delete();
            PaketPembayaran::query()->whereIn('id', $planIds)->delete();

            if ($moduleIds->isNotEmpty()) {
                Kuis::query()->whereIn('module_id', $moduleIds)->delete();
                SetFlashcard::query()->whereIn('module_id', $moduleIds)->delete();
                DeckPresentasi::query()->whereIn('module_id', $moduleIds)->delete();
                Kosakata::query()->whereIn('module_id', $moduleIds)->delete();
                Modul::query()->whereIn('id', $moduleIds)->delete();
            }

            ProgramPembelajaran::query()->whereIn('id', $programIds)->delete();
        });
    }
}
