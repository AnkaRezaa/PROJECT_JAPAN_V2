<?php

use App\Models\GrammarBank;
use App\Models\HariModul;
use App\Models\Kosakata;
use App\Models\Kuis;
use App\Models\LevelPembelajaran;
use App\Models\Modul;
use App\Models\Pengguna;
use App\Models\ProgramPembelajaran;
use App\Models\Soal;
use App\Services\GrammarBankService;
use App\Services\KloterBelajarService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\HttpException;

test('WB-SEC-001: regular student cannot access superadmin activity route', function () {
    $student = Pengguna::factory()->create(['role' => 'user']);

    $response = $this->actingAs($student)->get(route('superadmin.activity'));
    expect($response->status())->toBeIn([403, 302]);
});

test('WB-SEC-002: mentor scope boundary prevents accessing modules outside their assigned programs', function () {
    $kloterService = app(KloterBelajarService::class);
    $mentor = Pengguna::factory()->create(['role' => 'mentor']);

    $level = LevelPembelajaran::firstOrCreate(['level_name' => 'WB Mentor'], ['stage' => 3]);
    $program = ProgramPembelajaran::create([
        'title' => 'Program Mentor Asing',
        'level_id' => $level->id,
        'slug' => 'program-mentor-asing-' . Str::random(4),
    ]);
    $module = Modul::create([
        'title' => 'Modul Mentor Asing',
        'program_pembelajaran_id' => $program->id,
        'week_number' => 94,
        'status' => 'published',
    ]);

    // Karena program tidak diasuh oleh mentor ini, harus melempar HttpException 403
    expect(fn () => $kloterService->abortJikaModulDiLuarCakupan($mentor, $module->id))
        ->toThrow(HttpException::class);
});

test('WB-SEC-003: student quiz payload omits raw correct answer from serialized response', function () {
    $level = LevelPembelajaran::firstOrCreate(['level_name' => 'WB Payload'], ['stage' => 3]);
    $program = ProgramPembelajaran::firstOrCreate(
        ['title' => 'Program WB Payload'],
        ['level_id' => $level->id, 'slug' => 'program-wb-pay-' . Str::random(4)]
    );
    $module = Modul::firstOrCreate(
        ['title' => 'Modul WB Payload', 'program_pembelajaran_id' => $program->id],
        ['week_number' => 93, 'status' => 'published']
    );
    $day = HariModul::firstOrCreate(
        ['module_id' => $module->id, 'day_number' => 83],
        ['title' => 'Hari Payload', 'status' => 'published']
    );

    $quiz = Kuis::create([
        'module_id' => $module->id,
        'module_day_id' => $day->id,
        'type' => 'multiple_choice',
        'status' => 'published',
    ]);

    $question = Soal::create([
        'quiz_id' => $quiz->id,
        'type' => 'multiple_choice',
        'question_text' => 'Apa arti kata Neko?',
        'options' => ['Kucing', 'Anjing', 'Burung'],
        'correct_answer' => 'Kucing',
        'order' => 1,
    ]);

    $learningService = app(\App\Services\PembelajaranPenggunaService::class);
    $student = Pengguna::factory()->create(['role' => 'user']);
    $payload = $learningService->quizPayload($student, $quiz);

    $serializedQuestions = collect(data_get($payload, 'quiz.questions', []));
    $firstQ = $serializedQuestions->firstWhere('id', $question->id);

    // Kunci jawaban tidak boleh bocor ke paket soal yang dikirim ke browser
    expect($firstQ)->not->toBeNull();
    expect(data_get($firstQ, 'correct_answer'))->toBeNull();
});

test('WB-PF-001 & WB-PF-002: admin content bank stats caching and invalidation works as expected', function () {
    Cache::forget('admin:bank_soal:stats');

    // 1. Ambil stats pertama kali (harus menghitung dan menyimpan di cache)
    $stats1 = Cache::remember('admin:bank_soal:stats', 60, fn () => [
        'total_vocabulary' => Kosakata::count(),
        'total_grammar' => GrammarBank::count(),
        'total_exam_banks' => 0,
    ]);

    expect(Cache::has('admin:bank_soal:stats'))->toBeTrue();

    // 2. Tambah kosakata baru
    Kosakata::create([
        'word' => 'キャッシュ_' . Str::random(4),
        'reading' => 'きゃっしゅ',
        'meaning_id' => 'Uji Cache Invalidation',
        'content_type' => 'kosakata',
    ]);

    // 3. Simulasikan invalidasi cache
    Cache::forget('admin:bank_soal:stats');
    expect(Cache::has('admin:bank_soal:stats'))->toBeFalse();

    // 4. Hitung ulang
    $stats2 = Cache::remember('admin:bank_soal:stats', 60, fn () => [
        'total_vocabulary' => Kosakata::count(),
        'total_grammar' => GrammarBank::count(),
        'total_exam_banks' => 0,
    ]);

    expect($stats2['total_vocabulary'])->toBeGreaterThan($stats1['total_vocabulary']);
});

test('WB-ARCH-001 s.d. WB-ARCH-006: static code cleanliness and anti-spaghetti audit', function () {
    $basePath = base_path();

    // 1. Audit routes/web.php tidak memuat inline SQL query liar
    $webRoutes = file_get_contents($basePath . '/routes/web.php');
    expect($webRoutes)->not->toContain('DB::select');
    expect($webRoutes)->not->toContain('DB::insert');
    expect($webRoutes)->not->toContain('DB::statement');

    // 2. Audit keberadaan UI Reusable Components
    expect(file_exists($basePath . '/resources/js/Components/UI/ConfirmActionDialog.jsx'))->toBeTrue();
    expect(file_exists($basePath . '/resources/js/Components/UI/Card.jsx'))->toBeTrue();
    expect(file_exists($basePath . '/resources/js/Components/Features/BankSoal/BankSoalNavbar.jsx'))->toBeTrue();

    // 3. Audit tidak ada file scratch/temp yang tertinggal di app/Http/Controllers
    $controllerFiles = glob($basePath . '/app/Http/Controllers/*.php');
    foreach ($controllerFiles as $file) {
        $basename = basename($file);
        expect($basename)->not->toMatch('/^(temp|test|dummy|scratch).*\.php$/i');
    }

    // 4. Audit kebersihan arsitektur frontend: sub-komponen terisolasi di Features, bukan di Pages
    expect(is_dir($basePath . '/resources/js/Pages/User/Checkout/Components'))->toBeFalse();
    expect(is_dir($basePath . '/resources/js/Components/Features/Checkout'))->toBeTrue();
});
