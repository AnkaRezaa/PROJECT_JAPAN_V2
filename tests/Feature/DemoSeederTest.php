<?php

use App\Models\AnggotaKloter;
use App\Models\DeckPresentasi;
use App\Models\HariModul;
use App\Models\KloterBelajar;
use App\Models\Kuis;
use App\Models\Langganan;
use App\Models\Modul;
use App\Models\PaketPembayaran;
use App\Models\Pengguna;
use App\Models\ProgramPembelajaran;
use Database\Seeders\DemoDataSeeder;
use Illuminate\Support\Facades\Hash;

it('builds the complete two-class demo dataset idempotently', function () {
    $this->seed(DemoDataSeeder::class);
    $this->seed(DemoDataSeeder::class);

    expect(ProgramPembelajaran::pluck('slug')->sort()->values()->all())->toBe([
        'jlpt-n3-mentor',
        'jlpt-n3-mingguan',
    ])->and(Modul::count())->toBe(6)
        ->and(HariModul::count())->toBe(18)
        ->and(Kuis::whereNotNull('module_day_id')->count())->toBe(18)
        ->and(Kuis::whereNotNull('exam_order')->count())->toBe(6)
        ->and(DeckPresentasi::where('audience_scope', 'shared')->count())->toBe(18)
        ->and(DeckPresentasi::where('audience_scope', 'mentor_session')->count())->toBe(1);

    foreach ([
        'superadmin@toku-up.com',
        'admin@toku-up.com',
        'admin.kloter@toku-up.com',
        'student@toku-up.com',
        'student2@toku-up.com',
    ] as $email) {
        $user = Pengguna::where('email', $email)->firstOrFail();

        expect($user->hasVerifiedEmail())->toBeTrue()
            ->and($user->password_login_enabled)->toBeTrue()
            ->and(Hash::check('TOKU-UP#2026', $user->password))->toBeTrue();
    }
});

it('seeds separate mandiri and mentor access flows', function () {
    $this->seed(DemoDataSeeder::class);

    $mandiri = ProgramPembelajaran::where('slug', 'jlpt-n3-mingguan')->firstOrFail();
    $mentor = ProgramPembelajaran::where('slug', 'jlpt-n3-mentor')->firstOrFail();
    $mentorAdmin = Pengguna::where('email', 'admin.kloter@toku-up.com')->firstOrFail();
    $mandiriStudent = Pengguna::where('email', 'student@toku-up.com')->firstOrFail();
    $mentorStudent = Pengguna::where('email', 'student2@toku-up.com')->firstOrFail();

    expect(PaketPembayaran::where('program_pembelajaran_id', $mandiri->id)->where('scope_type', 'program')->where('is_active', true)->count())->toBe(1)
        ->and(PaketPembayaran::where('program_pembelajaran_id', $mentor->id)->where('scope_type', 'kloter')->where('is_active', true)->count())->toBe(1)
        ->and(KloterBelajar::where('program_pembelajaran_id', $mandiri->id)->count())->toBe(0)
        ->and(KloterBelajar::where('program_pembelajaran_id', $mentor->id)->where('admin_id', $mentorAdmin->id)->count())->toBe(1)
        ->and(Langganan::where('user_id', $mandiriStudent->id)->where('scope_type', 'program')->where('status', 'active')->count())->toBe(1)
        ->and(Langganan::where('user_id', $mentorStudent->id)->where('scope_type', 'kloter')->where('status', 'active')->count())->toBe(1)
        ->and(AnggotaKloter::where('user_id', $mentorStudent->id)->where('status', 'active')->count())->toBe(1);
});
