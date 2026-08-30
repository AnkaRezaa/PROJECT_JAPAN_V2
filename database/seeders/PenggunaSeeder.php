<?php

namespace Database\Seeders;

use App\Models\Pengguna;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class PenggunaSeeder extends Seeder
{
    public const DEMO_PASSWORD = 'TOKU-UP#2026';

    public function run(): void
    {
        $this->seedAccount('admin@toku-up.com', [
            'username' => 'Admin Global TOKU-UP',
            'email_verified_at' => now(),
            'password_login_enabled' => true,
            'role' => 'admin',
            'admin_scope' => Pengguna::ADMIN_SCOPE_GLOBAL,
            'status' => 'active',
        ]);

        $this->seedAccount('admin.kloter@toku-up.com', [
            'username' => 'Mentor TOKU-UP',
            'email_verified_at' => now(),
            'password_login_enabled' => true,
            'role' => 'admin',
            'admin_scope' => Pengguna::ADMIN_SCOPE_KLOTER,
            'status' => 'active',
        ]);

        $this->seedAccount('superadmin@toku-up.com', [
            'username' => 'Superadmin TOKU-UP',
            'email_verified_at' => now(),
            'password_login_enabled' => true,
            'role' => 'superadmin',
            'admin_scope' => null,
            'status' => 'active',
        ]);

        $this->seedAccount('student@toku-up.com', [
            'username' => 'Siswa Mandiri Demo',
            'email_verified_at' => now(),
            'password_login_enabled' => true,
            'role' => 'user',
            'subscription_status' => 'premium',
            'status' => 'active',
            'xp' => 0,
            'level' => 1,
            'streak_count' => 0,
            'last_activity_date' => null,
        ]);

        $this->seedAccount('student2@toku-up.com', [
            'username' => 'Siswa Mentor Demo',
            'email_verified_at' => now(),
            'password_login_enabled' => true,
            'role' => 'user',
            'subscription_status' => 'premium',
            'status' => 'active',
            'xp' => 0,
            'level' => 1,
            'streak_count' => 0,
            'last_activity_date' => null,
        ]);
    }

    private function seedAccount(string $email, array $attributes): Pengguna
    {
        $user = Pengguna::firstOrNew(['email' => $email]);

        $user->password = Hash::make(self::DEMO_PASSWORD);
        $user->fill($attributes)->save();

        return $user;
    }
}
