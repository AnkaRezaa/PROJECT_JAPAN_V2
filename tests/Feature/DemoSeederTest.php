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
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\PenggunaSeeder;
use Illuminate\Support\Facades\Hash;

it('restores five demo accounts with the correct role and scope without duplicating accounts', function () {
    $accounts = [
        'student@toku-up.com' => ['user', null],
        'student2@toku-up.com' => ['user', null],
        'admin@toku-up.com' => ['admin', Pengguna::ADMIN_SCOPE_GLOBAL],
        'admin.kloter@toku-up.com' => ['admin', Pengguna::ADMIN_SCOPE_KLOTER],
        'superadmin@toku-up.com' => ['superadmin', null],
    ];

    $this->seed(PenggunaSeeder::class);
    $originalIds = Pengguna::whereIn('email', array_keys($accounts))->pluck('id', 'email')->all();

    Pengguna::whereIn('email', array_keys($accounts))->update([
        'role' => 'admin',
        'admin_scope' => Pengguna::ADMIN_SCOPE_KLOTER,
    ]);
    $this->seed(PenggunaSeeder::class);

    expect(Pengguna::count())->toBe(5);
    foreach ($accounts as $email => [$role, $scope]) {
        $user = Pengguna::where('email', $email)->sole();
        expect($user->id)->toBe($originalIds[$email])
            ->and($user->role)->toBe($role)
            ->and($user->admin_scope)->toBe($scope)
            ->and($user->isAdminGlobal())->toBe($email === 'admin@toku-up.com')
            ->and($user->isMentor())->toBe($email === 'admin.kloter@toku-up.com');
    }
});

it('rejects demo seeding in production before changing accounts or deleting demo programs', function (string $seeder) {
    $this->seed(DemoDataSeeder::class);
    $users = Pengguna::orderBy('id')->get()->map->getRawOriginal()->all();
    $programs = ProgramPembelajaran::orderBy('id')->get()->map->getRawOriginal()->all();
    $transactions = \App\Models\Transaksi::orderBy('id')->get()->map->getRawOriginal()->all();
    $environment = $this->app->environment();

    try {
        $this->app->instance('env', 'production');
        expect(fn () => $this->artisan('db:seed', ['--class' => $seeder, '--force' => true])->run())
            ->toThrow(\RuntimeException::class, 'cannot run in production');
    } finally {
        $this->app->instance('env', $environment);
    }

    expect(Pengguna::orderBy('id')->get()->map->getRawOriginal()->all())->toBe($users)
        ->and(ProgramPembelajaran::orderBy('id')->get()->map->getRawOriginal()->all())->toBe($programs)
        ->and(\App\Models\Transaksi::orderBy('id')->get()->map->getRawOriginal()->all())->toBe($transactions);
})->with([PenggunaSeeder::class, DemoDataSeeder::class, DatabaseSeeder::class]);

it('builds the complete two-class demo dataset idempotently', function () {
    $this->seed(DemoDataSeeder::class);
    $this->seed(DemoDataSeeder::class);

    expect(ProgramPembelajaran::pluck('slug')->sort()->values()->all())->toBe([
        'jlpt-n3-mentor',
        'jlpt-n3-mingguan',
    ])->and(Modul::count())->toBe(6)
        ->and(HariModul::count())->toBe(18)
        ->and(Kuis::whereNotNull('module_day_id')->count())->toBe(24)
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
            ->and(Hash::check(PenggunaSeeder::DEMO_PASSWORD, $user->password))->toBeTrue();
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
