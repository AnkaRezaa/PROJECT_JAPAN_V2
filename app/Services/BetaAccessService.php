<?php

namespace App\Services;

use App\Models\Pengguna;
use Carbon\CarbonImmutable;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class BetaAccessService
{
    public const LIMIT = 50;

    public function settings(bool $lock = false): array
    {
        $query = DB::table('app_settings')->where('key', 'beta_access');
        $row = ($lock ? $query->lockForUpdate() : $query)->first();
        if (! $row) {
            throw new \RuntimeException('Pengaturan beta tidak tersedia. Jalankan migrasi.');
        }
        $data = json_decode($row->value, true, 512, JSON_THROW_ON_ERROR);
        if (! is_array($data) || ! array_key_exists('enabled', $data) || ! array_key_exists('registration_open', $data)) {
            throw new \RuntimeException('Pengaturan beta tidak valid.');
        }

        return $data;
    }

    public function released(array $settings): bool
    {
        return ! empty($settings['opened_at']) || (! empty($settings['opens_at']) && CarbonImmutable::parse($settings['opens_at'])->lte(now()));
    }

    public function count(): int
    {
        return Pengguna::whereNotNull('beta_registered_at')->count();
    }

    // Must be called inside the same transaction that creates the user.
    public function registrationTimestamp(): ?Carbon
    {
        $settings = $this->settings(true);
        if (! $settings['enabled']) {
            return null;
        }
        if (! $settings['registration_open'] || $this->count() >= self::LIMIT) {
            throw ValidationException::withMessages(['beta' => $this->count() >= self::LIMIT ? 'Kuota beta penuh.' : 'Pendaftaran beta belum dibuka.']);
        }

        return now();
    }

    public function pending(?Pengguna $user): bool
    {
        if (! $user || $user->role !== 'user' || ! $user->beta_registered_at) {
            return false;
        }
        $settings = $this->settings();

        return $settings['enabled'] && ! $this->released($settings);
    }

    public function payload(): array
    {
        $settings = $this->settings();

        return [...$settings, 'released' => $this->released($settings), 'participants' => $this->count(), 'limit' => self::LIMIT];
    }

    public function update(array $input): void
    {
        DB::transaction(function () use ($input) {
            $old = $this->settings(true);
            $opensAt = empty($input['opens_at']) ? null : CarbonImmutable::createFromFormat('!Y-m-d\TH:i', $input['opens_at'], 'Asia/Jakarta')->utc()->toIso8601String();
            if ($this->released($old) && ! $old['opened_at']) {
                $old['opened_at'] = now()->toIso8601String();
            }
            if (($input['open_now'] ?? false) || ($old['enabled'] && ! $input['enabled'])) {
                $old['opened_at'] = now()->toIso8601String();
            }
            $data = ['enabled' => $input['enabled'], 'registration_open' => $input['registration_open'], 'opens_at' => $opensAt, 'opened_at' => $old['opened_at']];
            DB::table('app_settings')->where('key', 'beta_access')->update(['value' => json_encode($data), 'updated_at' => now()]);
        });
    }
}
