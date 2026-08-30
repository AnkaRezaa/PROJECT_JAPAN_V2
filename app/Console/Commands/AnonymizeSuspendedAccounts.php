<?php

namespace App\Console\Commands;

use App\Services\AccountSuspensionService;
use Illuminate\Console\Command;

class AnonymizeSuspendedAccounts extends Command
{
    protected $signature = 'accounts:anonymize-suspended';

    protected $description = 'Anonimkan akun yang sudah ditangguhkan selama 30 hari';

    public function handle(AccountSuspensionService $service): int
    {
        $count = $service->anonymizeDueAccounts();
        $this->info("{$count} akun dianonimkan.");

        return self::SUCCESS;
    }
}
