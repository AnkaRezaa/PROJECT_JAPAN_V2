<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        if (! app()->environment('production')) {
            $this->call([
                DemoDataSeeder::class,
                StandaloneExamDemoSeeder::class,
            ]);
        }

        $this->call([
            GrammarBankSeeder::class,
            NewsPortalSeeder::class,
            AchievementSeeder::class,
            DokkaiSeeder::class,
        ]);
    }
}
