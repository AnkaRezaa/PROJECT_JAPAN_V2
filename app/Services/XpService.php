<?php

namespace App\Services;

use App\Models\LogReward;
use App\Models\Pengguna;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

class XpService
{
    private const LEVEL_THRESHOLDS = [
        1 => 0,
        2 => 100,
        3 => 300,
        4 => 600,
        5 => 1000,
        6 => 1500,
    ];

    /**
     * Award XP to a user and update their level if necessary
     */
    public function awardXP(Pengguna $user, int $amount, string $sourceType, ?int $sourceId = null, string $description = ''): array
    {
        return DB::transaction(function () use ($user, $amount, $sourceType, $sourceId, $description) {
            $lockedUser = Pengguna::query()->lockForUpdate()->findOrFail($user->id);

            if ($amount <= 0) {
                return [
                    'xp_awarded' => 0,
                    'level_up' => false,
                    'new_level' => $lockedUser->level,
                    'duplicate' => false,
                ];
            }

            if ($sourceId !== null) {
                try {
                    LogReward::create([
                        'user_id' => $lockedUser->id,
                        'source_type' => $sourceType,
                        'source_id' => $sourceId,
                        'xp_amount' => $amount,
                        'description' => $description,
                    ]);
                } catch (QueryException $exception) {
                    if (! $this->isDuplicateRewardException($exception)) {
                        throw $exception;
                    }

                    return [
                        'xp_awarded' => 0,
                        'level_up' => false,
                        'new_level' => $lockedUser->level,
                        'duplicate' => true,
                    ];
                }
            } else {
                LogReward::create([
                    'user_id' => $lockedUser->id,
                    'source_type' => $sourceType,
                    'source_id' => null,
                    'xp_amount' => $amount,
                    'description' => $description,
                ]);
            }

            $previousLevel = (int) $lockedUser->level;
            $lockedUser->xp = (int) $lockedUser->xp + $amount;
            $lockedUser->level = $this->calculateLevel((int) $lockedUser->xp);
            $lockedUser->save();

            return [
                'xp_awarded' => $amount,
                'level_up' => $lockedUser->level > $previousLevel,
                'new_level' => $lockedUser->level,
                'duplicate' => false,
            ];
        });
    }

    /**
     * Calculate the level for a given XP total
     */
    public function calculateLevel(int $xp): int
    {
        $level = 1;
        foreach (self::LEVEL_THRESHOLDS as $lvl => $threshold) {
            if ($xp >= $threshold) {
                $level = $lvl;
            } else {
                break;
            }
        }

        return $level;
    }

    private function isDuplicateRewardException(QueryException $exception): bool
    {
        return $exception->getCode() === '23000'
            || (int) ($exception->errorInfo[1] ?? 0) === 1062;
    }

    /**
     * Calculate quiz XP based on score percentage and quiz type (vocabulary, grammar, coming_soon)
     */
    public function calculateQuizXP(float $scorePercentage, ?string $quizType = 'vocabulary'): int
    {
        $config = app(GamifikasiConfigService::class)->quizXp($quizType);

        if ($scorePercentage >= 100) {
            return (int) ($config['perfect'] ?? 50);
        }
        if ($scorePercentage >= 80) {
            return (int) ($config['score_80'] ?? 35);
        }
        if ($scorePercentage >= 60) {
            return (int) ($config['score_60'] ?? 20);
        }

        return (int) ($config['participation'] ?? 0);
    }
}
