<?php

namespace App\Services;

use App\Models\Kuis;
use App\Models\Pengguna;

class AksesKuisPenggunaService
{
    public function __construct(
        private AksesPremiumService $aksesPremium,
        private KloterBelajarService $kloterBelajar,
        private ProgresRoadmapService $roadmapProgress
    ) {}

    public function abortJikaTerkunci(Pengguna $user, Kuis $quiz): void
    {
        $status = $this->status($user, $quiz);

        abort_unless($status['allowed'], 403, $status['message']);
    }

    public function status(Pengguna $user, Kuis $quiz): array
    {
        $quiz->loadMissing('module.programPembelajaran');
        $module = $quiz->module;

        if (! $module || $module->status !== 'published') {
            return $this->blocked('module_unavailable', 'Modul kuis belum tersedia.', $module);
        }

        if (! $this->aksesPremium->bolehAksesModul($user, $module)) {
            return $this->blocked('subscription_required', 'Akses modul ini belum terbuka.', $module);
        }

        $programId = $module->program_pembelajaran_id;
        $kloter = $programId ? $this->kloterBelajar->kloterAktifUser($user, $programId) : null;
        $mingguAktif = $this->kloterBelajar->mingguAktif($kloter);

        if ($kloter && $mingguAktif !== null && (int) $module->week_number > $mingguAktif) {
            return $this->blocked('kloter_locked', 'Minggu ini belum terbuka untuk kloter kamu.', $module);
        }

        if ($quiz->day) {
            $dayAccess = $this->roadmapProgress->statusAksesHari($user, $quiz->day);
            if (! $dayAccess['allowed']) {
                return $this->blocked($dayAccess['reason'], $dayAccess['message'], $module);
            }
        } elseif ($module->days()->where('status', 'published')->exists()) {
            return $this->blocked(
                'quiz_not_assigned',
                'Kuis ini belum ditetapkan pada Day materi.',
                $module
            );
        }

        return [
            'allowed' => true,
            'reason' => null,
            'message' => null,
            'module' => $module,
            'flashcard_set' => null,
            'flashcard_stats' => ['total' => 0, 'reviewed' => 0],
        ];
    }

    private function blocked(
        string $reason,
        string $message,
        $module,
        ?array $flashcardStats = null
    ): array {
        return [
            'allowed' => false,
            'reason' => $reason,
            'message' => $message,
            'module' => $module,
            'flashcard_set' => null,
            'flashcard_stats' => $flashcardStats ?? ['total' => 0, 'reviewed' => 0],
        ];
    }
}
