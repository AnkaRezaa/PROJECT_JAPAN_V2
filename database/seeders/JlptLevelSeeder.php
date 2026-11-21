<?php

namespace Database\Seeders;

use App\Models\CurriculumTrack;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class JlptLevelSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function (): void {
            $track = CurriculumTrack::query()->where('code', 'jlpt')->lockForUpdate()->firstOrFail();
            $existingNames = $track->levels()->pluck('level_name')
                ->map(fn (string $name) => preg_replace('/\s+/', '', strtoupper($name)));

            foreach (range(1, 5) as $stage) {
                if ($existingNames->contains("N{$stage}") || $existingNames->contains("JLPTN{$stage}")) {
                    continue;
                }

                $track->levels()->create([
                    'level_name' => "JLPT N{$stage}",
                    'stage' => $stage,
                ]);
            }
        });
    }
}
