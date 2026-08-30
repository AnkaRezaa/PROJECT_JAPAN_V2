<?php

namespace Database\Seeders;

use App\Models\AnggotaKloter;
use App\Models\KloterBelajar;
use App\Models\Langganan;
use App\Models\PaketPembayaran;
use App\Models\Pengguna;
use App\Models\ProgramPembelajaran;
use App\Models\Transaksi;
use Illuminate\Database\Seeder;

class KloterDemoSeeder extends Seeder
{
    public const MENTOR_KLOTER_CODE = 'KLT-N3-MENTOR-DEMO';

    public function run(): void
    {
        $mandiriStudent = Pengguna::where('email', 'student@toku-up.com')->firstOrFail();
        $mentorStudent = Pengguna::where('email', 'student2@toku-up.com')->firstOrFail();
        $mentorAdmin = Pengguna::where('email', 'admin.kloter@toku-up.com')->firstOrFail();
        $mandiriProgram = ProgramPembelajaran::where('slug', KelasDemoSeeder::MANDIRI_SLUG)->firstOrFail();
        $mentorProgram = ProgramPembelajaran::where('slug', KelasDemoSeeder::MENTOR_SLUG)->firstOrFail();
        $mandiriPlan = PaketPembayaran::where('slug', ProgramPaymentPlanSeeder::MANDIRI_PLAN_SLUG)->firstOrFail();
        $mentorPlan = PaketPembayaran::where('slug', ProgramPaymentPlanSeeder::MENTOR_PLAN_SLUG)->firstOrFail();

        $mandiriSubscription = Langganan::updateOrCreate(
            ['user_id' => $mandiriStudent->id, 'payment_plan_id' => $mandiriPlan->id],
            [
                'scope_type' => 'program',
                'program_pembelajaran_id' => $mandiriProgram->id,
                'kloter_belajar_id' => null,
                'status' => 'active',
                'start_date' => now()->toDateString(),
                'end_date' => now()->addDays($mandiriPlan->duration_days)->toDateString(),
                'auto_renew' => false,
            ]
        );

        Transaksi::updateOrCreate(
            ['transaction_code' => 'DEMO-MANDIRI-0001'],
            [
                'user_id' => $mandiriStudent->id,
                'payment_plan_id' => $mandiriPlan->id,
                'subscription_id' => $mandiriSubscription->id,
                'scope_type' => 'program',
                'program_pembelajaran_id' => $mandiriProgram->id,
                'kloter_belajar_id' => null,
                'amount' => $mandiriPlan->price,
                'payment_method' => 'manual',
                'status' => 'success',
                'notes' => 'Transaksi demo kelas mandiri.',
                'processed_at' => now(),
            ]
        );

        $kloter = KloterBelajar::updateOrCreate(
            ['kode' => self::MENTOR_KLOTER_CODE],
            [
                'program_pembelajaran_id' => $mentorProgram->id,
                'admin_id' => $mentorAdmin->id,
                'nama' => 'JLPT N3 Mentor - Kloter Demo',
                'tanggal_mulai' => now()->subWeek()->toDateString(),
                'tanggal_selesai' => now()->addDays($mentorPlan->duration_days)->toDateString(),
                'max_siswa' => 20,
                'is_default' => true,
                'status' => 'active',
                'catatan' => 'Kloter testing dengan mentor dan siswa aktif.',
            ]
        );

        $mentorSubscription = Langganan::updateOrCreate(
            ['user_id' => $mentorStudent->id, 'payment_plan_id' => $mentorPlan->id],
            [
                'scope_type' => 'kloter',
                'program_pembelajaran_id' => $mentorProgram->id,
                'kloter_belajar_id' => $kloter->id,
                'status' => 'active',
                'start_date' => now()->toDateString(),
                'end_date' => now()->addDays($mentorPlan->duration_days)->toDateString(),
                'auto_renew' => false,
            ]
        );

        $mentorTransaction = Transaksi::updateOrCreate(
            ['transaction_code' => 'DEMO-MENTOR-0001'],
            [
                'user_id' => $mentorStudent->id,
                'payment_plan_id' => $mentorPlan->id,
                'subscription_id' => $mentorSubscription->id,
                'scope_type' => 'kloter',
                'program_pembelajaran_id' => $mentorProgram->id,
                'kloter_belajar_id' => $kloter->id,
                'amount' => $mentorPlan->price,
                'payment_method' => 'manual',
                'status' => 'success',
                'notes' => 'Transaksi demo kelas bersama mentor.',
                'processed_at' => now(),
            ]
        );

        AnggotaKloter::updateOrCreate(
            ['kloter_belajar_id' => $kloter->id, 'user_id' => $mentorStudent->id],
            [
                'subscription_id' => $mentorSubscription->id,
                'transaction_id' => $mentorTransaction->id,
                'access_key_id' => null,
                'joined_at' => now(),
                'status' => 'active',
                'catatan' => 'Siswa mentor demo sudah disetujui dan siap masuk kelas.',
            ]
        );

        $mandiriStudent->update(['subscription_status' => 'premium']);
        $mentorStudent->update(['subscription_status' => 'premium']);
    }
}
