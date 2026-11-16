<?php

use App\Models\Pengguna;
use App\Services\BetaAccessService;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

require __DIR__.'/../../vendor/autoload.php';
$app = require __DIR__.'/../../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
config(['database.default' => 'mysql', 'database.connections.mysql.database' => 'Project_japan_test', 'database.connections.mysql.host' => '127.0.0.1', 'database.connections.mysql.port' => 3306, 'database.connections.mysql.username' => 'root', 'database.connections.mysql.password' => '', 'database.connections.mysql.url' => null]);
DB::purge('mysql');
if (! str_starts_with($argv[1] ?? '', 'beta-concurrency-')) {
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
