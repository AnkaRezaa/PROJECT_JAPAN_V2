<?php

use App\Models\Pengguna;
use App\Services\BetaBackupExcelService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;

function enableOpenBetaForBackupTest(): void
{
    DB::table('app_settings')->where('key', 'beta_access')->update([
        'value' => json_encode([
            'enabled' => true,
            'registration_open' => true,
            'opens_at' => null,
            'opened_at' => null,
        ]),
        'updated_at' => now(),
    ]);
}

function readWorksheetXml(string $xlsxAbsolutePath): string
{
    $zip = new ZipArchive;
    expect($zip->open($xlsxAbsolutePath))->toBe(true);
    $xml = (string) $zip->getFromName('xl/worksheets/sheet1.xml');
    $zip->close();

    return $xml;
}

it('auto-syncs beta registrations into a single private excel workbook and updates verification status', function () {
    Storage::fake('local');
    Notification::fake();
    enableOpenBetaForBackupTest();

    $this->post(route('public.beta.register.store'), [
        'name' => '=Peserta Pertama',
        'email' => 'beta1@example.com',
        'password' => 'Password123!',
        'password_confirmation' => 'Password123!',
        'terms_accepted' => true,
    ])->assertRedirect(route('public.beta.confirmation'));

    Storage::disk('local')->assertExists(BetaBackupExcelService::RELATIVE_PATH);
    $backupPath = Storage::disk('local')->path(BetaBackupExcelService::RELATIVE_PATH);

    $xmlAfterFirst = readWorksheetXml($backupPath);
    expect($xmlAfterFirst)
        ->toContain("'=".'Peserta Pertama')
        ->toContain('beta1@example.com')
        ->toContain('Belum Verifikasi');

    // Second beta participant registers via /register — must stay 1 single file with 2 rows.
    $this->post(route('register'), [
        'name' => 'Peserta Kedua',
        'email' => 'beta2@example.com',
        'password' => 'Password123!',
        'password_confirmation' => 'Password123!',
        'terms_accepted' => true,
    ])->assertRedirect(route('user.dashboard', absolute: false));

    expect(Storage::disk('local')->files('backups'))->toBe([BetaBackupExcelService::RELATIVE_PATH]);

    $xmlAfterSecond = readWorksheetXml($backupPath);
    expect($xmlAfterSecond)
        ->toContain('beta1@example.com')
        ->toContain('beta2@example.com');

    // Verify first beta user's email and confirm Excel status updates automatically.
    $firstUser = Pengguna::where('email', 'beta1@example.com')->firstOrFail();
    $verifyUrl = URL::temporarySignedRoute('public.beta.verify', now()->addMinutes(30), [
        'id' => $firstUser->id,
        'hash' => sha1($firstUser->getEmailForVerification()),
    ]);

    $this->get($verifyUrl)->assertRedirect(route('public.beta.confirmation'));

    $xmlAfterVerify = readWorksheetXml($backupPath);
    expect($xmlAfterVerify)->toContain('Terverifikasi');
});

it('allows only superadmin to download the beta excel backup', function () {
    Storage::fake('local');
    enableOpenBetaForBackupTest();

    Pengguna::factory()->create([
        'username' => 'Beta Tester',
        'email' => 'tester@example.com',
        'role' => 'user',
        'beta_registered_at' => now(),
    ]);

    $admin = Pengguna::factory()->create(['role' => 'admin']);
    $this->actingAs($admin)
        ->get(route('superadmin.system.beta.export-xlsx'))
        ->assertForbidden();

    $superadmin = Pengguna::factory()->create(['role' => 'superadmin']);
    $response = $this->actingAs($superadmin)
        ->get(route('superadmin.system.beta.export-xlsx'))
        ->assertOk();

    expect($response->headers->get('content-type'))
        ->toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect($response->headers->get('content-disposition'))
        ->toContain('peserta-beta-tokuup-')
        ->toContain('.xlsx');

    Storage::disk('local')->assertExists(BetaBackupExcelService::RELATIVE_PATH);
});

it('pushes beta participant rows to the configured google sheets apps script webhook', function () {
    Storage::fake('local');
    Notification::fake();
    Http::fake([
        'https://script.google.com/*' => Http::response(['ok' => true, 'count' => 1], 200),
    ]);

    config([
        'beta.google_sheets.webhook_url' => 'https://script.google.com/macros/s/test-webhook/exec',
        'beta.google_sheets.webhook_secret' => 'rahasia-beta-123',
    ]);
    enableOpenBetaForBackupTest();

    $this->post(route('public.beta.register.store'), [
        'name' => 'Peserta Sheets',
        'email' => 'sheets@example.com',
        'password' => 'Password123!',
        'password_confirmation' => 'Password123!',
        'terms_accepted' => true,
    ])->assertRedirect(route('public.beta.confirmation'));

    Http::assertSent(function ($request) {
        return $request->url() === 'https://script.google.com/macros/s/test-webhook/exec'
            && $request['secret'] === 'rahasia-beta-123'
            && count($request['headers']) === 10
            && count($request['rows']) === 1
            && $request['rows'][0][3] === 'sheets@example.com';
    });
});
