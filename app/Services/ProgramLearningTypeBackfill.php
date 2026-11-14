<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use RuntimeException;

class ProgramLearningTypeBackfill
{
    public function mapping(): array
    {
        $mapping = [];
        foreach (DB::table('program_pembelajaran')->select('id', 'slug')->orderBy('id')->get() as $program) {
            $mentor = DB::table('kloter_belajar')->where('program_pembelajaran_id', $program->id)->exists()
                || DB::table('live_class_sessions')->where('program_pembelajaran_id', $program->id)->exists();
            $mandiri = false;
            $unknown = false;
            foreach (['payment_plans', 'subscriptions', 'transactions', 'access_keys'] as $table) {
                foreach (DB::table($table)->where('program_pembelajaran_id', $program->id)->get() as $row) {
                    if ($table === 'payment_plans' && str_starts_with((string) $row->slug, 'access-key-')
                        && (int) $row->price === 0 && ! $row->is_active) {
                        continue;
                    }
                    if (($row->kloter_belajar_id ?? null) || $row->scope_type === 'kloter') {
                        $mentor = true;
                    } elseif ($row->scope_type === 'program') {
                        $mandiri = true;
                    } else {
                        $unknown = true;
                    }
                }
            }
            if (($mentor && $mandiri) || $unknown) {
                throw new RuntimeException("Tipe kelas ambigu: {$program->id} ({$program->slug}). Periksa data sebelum migrasi.");
            }
            $mapping[$program->id] = $mentor ? 'mentor' : 'mandiri';
        }

        return $mapping;
    }
}
