<?php

namespace App\Services;

use App\Models\Flashcard;
use App\Models\Pengguna;
use App\Models\SetFlashcard;

class AksesFlashcardPenggunaService
{
    public function __construct(
        private readonly AksesPremiumService $aksesPremium,
        private readonly KloterBelajarService $kloterBelajar,
        private readonly ProgresRoadmapService $roadmapProgress
    ) {}

    public function abortJikaTerkunci(Pengguna $user, SetFlashcard $flashcardSet): void
    {
        $status = $this->status($user, $flashcardSet);

        abort_unless($status['allowed'], $status['http_status'], $status['message']);
    }

    public function status(Pengguna $user, SetFlashcard $flashcardSet): array
    {
        $flashcardSet->loadMissing('module.programPembelajaran', 'day.module');

        if ($flashcardSet->status !== 'published' || $flashcardSet->module?->status !== 'published') {
            return ['allowed' => false, 'http_status' => 404, 'message' => 'Flashcard tidak tersedia.'];
        }

        if (! $this->aksesPremium->bolehAksesModul($user, $flashcardSet->module)) {
            return ['allowed' => false, 'http_status' => 403, 'message' => 'Akses flashcard ini belum terbuka.'];
        }

        $module = $flashcardSet->module;
        $kloter = $module->program_pembelajaran_id
            ? $this->kloterBelajar->kloterAktifUser($user, $module->program_pembelajaran_id)
            : null;
        $mingguAktif = $this->kloterBelajar->mingguAktif($kloter);

        if ($kloter && $mingguAktif !== null && (int) $module->week_number > $mingguAktif) {
            return ['allowed' => false, 'http_status' => 403, 'message' => 'Minggu ini belum terbuka untuk kloter kamu.'];
        }

        if ($flashcardSet->day) {
            $dayStatus = $this->roadmapProgress->statusAksesHari($user, $flashcardSet->day);
            if (! $dayStatus['allowed']) {
                return ['allowed' => false, 'http_status' => 403, 'message' => $dayStatus['message']];
            }
        }

        return ['allowed' => true, 'http_status' => 200, 'message' => null];
    }

    public function abortJikaKartuTerkunci(Pengguna $user, Flashcard $flashcard): void
    {
        $flashcard->loadMissing('set.module');

        abort_unless($flashcard->set, 404);

        $this->abortJikaTerkunci($user, $flashcard->set);
    }
}
