<?php

use App\Models\Pengguna;
use App\Services\BetaAccessService;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

if (getenv('APP_ENV') !== 'testing'
    || getenv('DB_DATABASE') !== 'Project_japan_test'
    || ! str_starts_with($argv[1] ?? '', 'beta-concurrency-')) {
    exit(2);
}

require __DIR__.'/../../vendor/autoload.php';
$app = require __DIR__.'/../../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
if (DB::getDefaultConnection() !== 'mysql' || DB::connection()->getDatabaseName() !== 'Project_japan_test') {
    exit(2);
}
try {
    DB::transaction(function () use ($argv) {
        $stamp = app(BetaAccessService::class)->registrationTimestamp();
        usleep(300000);
        $user = new Pengguna(['username' => 'Concurrency test', 'email' => $argv[1], 'password' => Hash::make('test-password')]);
        $user->forceFill(['beta_registered_at' => $stamp])->save();
    });
    echo 'created';
} catch (ValidationException $exception) {
    echo 'full';
}
