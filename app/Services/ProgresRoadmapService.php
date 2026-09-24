<?php

namespace App\Services;

use App\Models\Flashcard;
use App\Models\HariModul;
use App\Models\Kuis;
use App\Models\Modul;
use App\Models\PengerjaanKuis;
use App\Models\Pengguna;
use App\Models\Progres;
use App\Models\ProgresHariModul;
use App\Models\ReviewFlashcard;
use App\Models\SetFlashcard;
use Illuminate\Support\Facades\DB;

class ProgresRoadmapService
{
    public function __construct(
        private readonly NotifikasiPenggunaService $notifikasi
    ) {}

    public function statusAksesHari(Pengguna $user, HariModul $day): array
    {
        $day->loadMissing('module');

        $moduleAccess = $this->statusAksesModul($user, $day->module);
        if (! $moduleAccess['allowed']) {
            return $moduleAccess;
        }

        if ($day->status !== 'published') {
            return ['allowed' => false, 'reason' => 'day_unavailable', 'message' => 'Day ini belum tersedia.'];
        }

        $previousDay = HariModul::query()
            ->where('module_id', $day->module_id)
            ->where('status', 'published')
            ->where('day_number', '<', $day->day_number)
            ->orderByDesc('day_number')
            ->first();

        if ($previousDay && ! $this->hariSelesai($user, $previousDay)) {
            return ['allowed' => false, 'reason' => 'previous_day_required', 'message' => 'Selesaikan Day sebelumnya terlebih dahulu.'];
        }

        return ['allowed' => true, 'reason' => null, 'message' => null];
    }

    public function statusAksesModul(Pengguna $user, ?Modul $module): array
    {
        if (! $module || $module->status !== 'published') {
            return ['allowed' => false, 'reason' => 'week_unavailable', 'message' => 'Minggu ini belum tersedia.'];
        }

        $previousModule = Modul::query()
            ->where('program_pembelajaran_id', $module->program_pembelajaran_id)
            ->where('status', 'published')
            ->where(function ($query) use ($module) {
                $query->where('week_number', '<', $module->week_number)
                    ->orWhere(function ($query) use ($module) {
                        $query->where('week_number', $module->week_number)
                            ->where('id', '<', $module->id);
                    });
            })
            ->orderByDesc('week_number')
            ->orderByDesc('id')
            ->first();

        if ($previousModule && ! Progres::query()
            ->where('user_id', $user->id)
            ->where('module_id', $previousModule->id)
            ->whereNotNull('completed_at')
            ->exists()) {
            return ['allowed' => false, 'reason' => 'previous_week_required', 'message' => 'Selesaikan Minggu sebelumnya terlebih dahulu.'];
        }

        return ['allowed' => true, 'reason' => null, 'message' => null];
    }

    public function hariSelesai(Pengguna $user, HariModul $day): bool
    {
        return ProgresHariModul::query()
            ->where('user_id', $user->id)
            ->where('module_day_id', $day->id)
            ->whereNotNull('completed_at')
            ->exists();
    }

    public function selesaikanDariKuis(Pengguna $user, Kuis $quiz, int $score): array
    {
        $quiz->loadMissing('day.module');
        $day = $quiz->day;

        if (! $day || ((int) $day->checkpoint_quiz_id !== (int) $quiz->id && ! $quiz->isGrammar())) {
            return ['day_completed' => false, 'module_completed' => false, 'was_module_completed' => false];
        }

        $checkpoint = Kuis::query()
            ->whereKey($day->checkpoint_quiz_id)
            ->where('status', 'published')
            ->whereHas('questions')
            ->first(['id', 'passing_score']);

        if (! $checkpoint) {
            return ['day_completed' => false, 'module_completed' => false, 'was_module_completed' => false];
        }

        $required = Kuis::query()
            ->where('module_day_id', $day->id)
            ->where('type', 'grammar')
            ->where('status', 'published')
            ->whereHas('questions')
            ->get(['id', 'passing_score'])
            ->prepend($checkpoint)
            ->unique('id');

        $allPassed = $required->every(function (Kuis $requiredQuiz) use ($user, $quiz, $score) {
            if ((int) $requiredQuiz->id === (int) $quiz->id) {
                return $score >= (int) ($requiredQuiz->passing_score ?? 70);
            }

            return PengerjaanKuis::query()
                ->where('user_id', $user->id)
                ->where('quiz_id', $requiredQuiz->id)
                ->where('status', 'completed')
                ->where('score', '>=', (int) ($requiredQuiz->passing_score ?? 70))
                ->exists();
        });

        if (! $allPassed) {
            return ['day_completed' => false, 'module_completed' => false, 'was_module_completed' => false];
        }

        return $this->selesaikanHari($user, $day, $score);
    }

    public function selesaikanDariUjianMingguan(Pengguna $user, Kuis $quiz, int $score): array
    {
        return $this->incompleteResult();
    }

    public function selesaikanDariFlashcard(Pengguna $user, SetFlashcard $flashcardSet): array
    {
        $flashcardSet->loadMissing('day.module.programPembelajaran');
        $day = $flashcardSet->day;

        if (! $day || $day->checkpoint_quiz_id) {
            return $this->incompleteResult();
        }

        $cardIds = Flashcard::query()
            ->whereHas('set', fn ($query) => $query
                ->where('module_day_id', $day->id)
                ->where('status', 'published'))
            ->pluck('id');
        $reviewedCount = ReviewFlashcard::query()
            ->where('user_id', $user->id)
            ->where('skill', 'recognition')
            ->whereIn('flashcard_id', $cardIds)
            ->distinct()
            ->count('flashcard_id');

        if ($cardIds->isEmpty() || $reviewedCount < $cardIds->count()) {
            return [
                ...$this->incompleteResult(),
                'flashcards_total' => $cardIds->count(),
                'flashcards_reviewed' => $reviewedCount,
            ];
        }

        return [
            ...$this->selesaikanHari($user, $day),
            'flashcards_total' => $cardIds->count(),
            'flashcards_reviewed' => $reviewedCount,
        ];
    }

    private function selesaikanHari(Pengguna $user, HariModul $day, ?int $score = null): array
    {
        return DB::transaction(function () use ($user, $day, $score) {
            $access = $this->statusAksesHari($user, $day);
            abort_unless($access['allowed'], 403, $access['message']);

            ProgresHariModul::updateOrCreate(
                ['user_id' => $user->id, 'module_day_id' => $day->id],
                ['score' => $score, 'completed_at' => now()]
            );

            $progress = Progres::query()->firstOrNew([
                'user_id' => $user->id,
                'module_id' => $day->module_id,
            ]);
            $wasModuleCompleted = (bool) $progress->completed_at;

            $publishedDayIds = HariModul::query()
                ->where('module_id', $day->module_id)
                ->where('status', 'published')
                ->pluck('id');
            $completedDayCount = ProgresHariModul::query()
                ->where('user_id', $user->id)
                ->whereIn('module_day_id', $publishedDayIds)
                ->whereNotNull('completed_at')
                ->count();
            $allDaysCompleted = $publishedDayIds->isNotEmpty() && $completedDayCount === $publishedDayIds->count();
            $moduleCompleted = $allDaysCompleted;

            if ($moduleCompleted) {
                $progress->score = max((int) ($progress->score ?? 0), (int) ($score ?? 0));
                $progress->completed_at = $progress->completed_at ?: now();
                $progress->save();
            }

            if ($moduleCompleted && ! $wasModuleCompleted) {
                $this->notifyWeekUnlocked($user, $day->module, $score);
            }

            return [
                'day_completed' => true,
                'module_completed' => $moduleCompleted,
                'was_module_completed' => $wasModuleCompleted,
            ];
        });
    }

    public function notifyWeekUnlocked(Pengguna $user, Modul $module, ?int $score = null): void
    {
        $module->loadMissing('programPembelajaran');
        $program = $module->programPembelajaran;
        $nextModule = Modul::query()
            ->where('status', 'published')
            ->when($program, fn ($query) => $query->where('program_pembelajaran_id', $program->id))
            ->where('week_number', '>', (int) ($module->week_number ?? 0))
            ->orderBy('week_number')
            ->first();

        $targetModule = $nextModule ?: $module;
        $url = $program
            ? route('user.modul.program', $program->slug)
            : route('user.kelas.index');
        $title = $nextModule ? 'Minggu berikutnya terbuka' : 'Modul selesai';
        $scoreText = $score !== null ? " dengan skor {$score}" : '';
        $message = $nextModule
            ? "Kamu menyelesaikan Minggu {$module->week_number}{$scoreText}. Minggu {$nextModule->week_number} sudah bisa dilanjutkan."
            : "Kamu menyelesaikan {$module->title}{$scoreText}.";

        $this->notifikasi->kirimKePengguna(
            $user,
            $nextModule ? 'week_unlocked' : 'module_completed',
            $title,
            $message,
            $url,
            [
                'module_id' => $targetModule->id,
                'completed_module_id' => $module->id,
                'score' => $score,
                'dedupe_key' => 'module_completed:'.$module->id,
            ],
            'progress',
            'success',
            false
        );
    }

    private function incompleteResult(): array
    {
        return [
            'day_completed' => false,
            'module_completed' => false,
            'was_module_completed' => false,
        ];
    }
}
