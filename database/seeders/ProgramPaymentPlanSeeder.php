<?php

namespace Database\Seeders;

use App\Models\PaketPembayaran;
use App\Models\ProgramPembelajaran;
use Illuminate\Database\Seeder;

class ProgramPaymentPlanSeeder extends Seeder
{
    public const MANDIRI_PLAN_SLUG = 'akses-jlpt-n3-mandiri-30-hari';

    public const MENTOR_PLAN_SLUG = 'kelas-jlpt-n3-mentor-90-hari';

    public function run(): void
    {
        PaketPembayaran::query()
            ->where(function ($query) {
                $query->where('scope_type', 'global')
                    ->orWhereNull('scope_type');
            })
            ->update(['is_active' => false]);

        $mandiri = ProgramPembelajaran::where('slug', KelasDemoSeeder::MANDIRI_SLUG)->firstOrFail();
        $mentor = ProgramPembelajaran::where('slug', KelasDemoSeeder::MENTOR_SLUG)->firstOrFail();

        PaketPembayaran::updateOrCreate(
            ['slug' => self::MANDIRI_PLAN_SLUG],
            [
                'name' => 'Akses JLPT N3 Mandiri',
                'scope_type' => 'program',
                'program_pembelajaran_id' => $mandiri->id,
                'description' => 'Akses seluruh roadmap JLPT N3 Mandiri selama 30 hari.',
                'price' => 79000,
                'duration_days' => 30,
                'features' => [
                    'Roadmap 3 Week dan 9 Day',
                    'PPT materi kelas',
                    'Kosakata dan repetisi',
                    'Kuis checkpoint harian',
                ],
                'is_active' => true,
            ]
        );

        PaketPembayaran::updateOrCreate(
            ['slug' => self::MENTOR_PLAN_SLUG],
            [
                'name' => 'Kelas JLPT N3 Bersama Mentor',
                'scope_type' => 'kloter',
                'program_pembelajaran_id' => $mentor->id,
                'description' => 'Kelas JLPT N3 dengan kloter, pendampingan mentor, dan ruang kelas live selama 90 hari.',
                'price' => 199000,
                'duration_days' => 90,
                'features' => [
                    'Roadmap 3 Week dan 9 Day',
                    'PPT materi kelas',
                    'Kuis checkpoint harian',
                    'Kloter dan pendampingan mentor',
                    'Ruang kelas live',
                ],
                'is_active' => true,
            ]
        );

        PaketPembayaran::query()
            ->whereIn('program_pembelajaran_id', [$mandiri->id, $mentor->id])
            ->whereNotIn('slug', [self::MANDIRI_PLAN_SLUG, self::MENTOR_PLAN_SLUG])
            ->update(['is_active' => false]);
    }
}
