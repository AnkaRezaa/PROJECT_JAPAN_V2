<?php

namespace App\Services;

use App\Models\Pengguna;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;

class BetaBackupExcelService
{
    public const DISK = 'local';

    public const RELATIVE_PATH = 'backups/peserta-beta.xlsx';

    private const LOCK_KEY = 'beta:excel-backup';

    public function __construct(private readonly TemplateExcelService $excel) {}

    public function sync(): string
    {
        return Cache::lock(self::LOCK_KEY, 10)->block(5, fn (): string => $this->writeWorkbook());
    }

    public function syncSafely(): void
    {
        try {
            $this->sync();
        } catch (\Throwable $exception) {
            report($exception);
        }
    }

    public function metadata(): array
    {
        $disk = Storage::disk(self::DISK);

        if (! $disk->exists(self::RELATIVE_PATH)) {
            return [
                'exists' => false,
                'updated_at' => null,
            ];
        }

        return [
            'exists' => true,
            'updated_at' => now()
                ->setTimestamp($disk->lastModified(self::RELATIVE_PATH))
                ->timezone('Asia/Jakarta')
                ->format('d M Y H:i').' WIB',
        ];
    }

    public function headers(): array
    {
        return [
            'No',
            'User ID',
            'Nama / Username',
            'Email',
            'Metode Daftar',
            'Status Verifikasi',
            'Waktu Verifikasi (WIB)',
            'Status Akun',
            'Waktu Daftar Beta (WIB)',
            'Direferensikan Oleh',
        ];
    }

    private function writeWorkbook(): string
    {
        $participants = Pengguna::query()
            ->whereNotNull('beta_registered_at')
            ->orderBy('beta_registered_at')
            ->orderBy('id')
            ->get([
                'id',
                'username',
                'email',
                'auth_provider',
                'email_verified_at',
                'status',
                'beta_registered_at',
                'referred_by_user_id',
            ]);

        $referrerIds = $participants->pluck('referred_by_user_id')->filter()->unique()->values();
        $referrers = $referrerIds->isNotEmpty()
            ? Pengguna::query()
                ->whereIn('id', $referrerIds)
                ->get(['id', 'username', 'referral_code'])
                ->keyBy('id')
            : collect();

        $rows = [];
        foreach ($participants as $index => $user) {
            $referrer = $user->referred_by_user_id ? $referrers->get($user->referred_by_user_id) : null;
            $referrerLabel = $referrer
                ? trim($referrer->username.($referrer->referral_code ? " ({$referrer->referral_code})" : ''))
                : '-';

            $rows[] = array_map(
                [$this, 'safeCell'],
                [
                    $index + 1,
                    $user->id,
                    $user->username ?? '-',
                    $user->email ?? '-',
                    $user->auth_provider === 'google' ? 'Google' : 'Email',
                    $user->email_verified_at ? 'Terverifikasi' : 'Belum Verifikasi',
                    $user->email_verified_at
                        ? $user->email_verified_at->copy()->timezone('Asia/Jakarta')->format('Y-m-d H:i:s')
                        : '-',
                    $user->status ?? 'active',
                    $user->beta_registered_at
                        ? $user->beta_registered_at->copy()->timezone('Asia/Jakarta')->format('Y-m-d H:i:s')
                        : '-',
                    $referrerLabel,
                ]
            );
        }

        $tempPath = $this->excel->xlsxPath($this->headers(), $rows, 'Peserta Beta', 'beta-backup-');

        try {
            $contents = file_get_contents($tempPath);
            if ($contents === false) {
                throw new \RuntimeException('Gagal membaca file sementara backup Excel beta.');
            }

            $disk = Storage::disk(self::DISK);
            $targetPath = $disk->path(self::RELATIVE_PATH);
            $directory = dirname($targetPath);

            if (! is_dir($directory) && ! mkdir($directory, 0755, true) && ! is_dir($directory)) {
                throw new \RuntimeException('Gagal membuat direktori backup beta.');
            }

            $stagedPath = $targetPath.'.tmp.'.bin2hex(random_bytes(4));
            if (file_put_contents($stagedPath, $contents, LOCK_EX) === false) {
                throw new \RuntimeException('Gagal menulis file backup Excel beta.');
            }

            if (! @rename($stagedPath, $targetPath)) {
                @unlink($targetPath);
                if (! rename($stagedPath, $targetPath)) {
                    @unlink($stagedPath);
                    throw new \RuntimeException('Gagal mengganti file backup Excel beta.');
                }
            }

            return $targetPath;
        } finally {
            if (is_file($tempPath)) {
                @unlink($tempPath);
            }
        }
    }

    private function safeCell(mixed $value): string
    {
        $text = (string) ($value ?? '');

        return preg_match('/^[=+\-@\t\r]/', $text) ? "'".$text : $text;
    }
}
