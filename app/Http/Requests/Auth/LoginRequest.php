<?php

namespace App\Http\Requests\Auth;

use App\Models\Pengguna;
use Illuminate\Auth\Events\Lockout;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class LoginRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if (is_string($this->input('email'))) {
            $this->merge(['email' => Str::lower(trim($this->input('email')))]);
        }
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ];
    }

    /**
     * Authenticate the request's credentials.
     *
     * @throws ValidationException
     */
    public function authenticate(): void
    {
        $this->ensureIsNotRateLimited();

        $user = Pengguna::where('email', $this->input('email'))->first();

        if ($user && $user->status === 'suspended' && Hash::check($this->input('password'), $user->password)) {
            $this->recordFailedAttempt();

            $reason = $user->suspended_reason ? " Alasan: {$user->suspended_reason}." : '';
            throw ValidationException::withMessages([
                'email' => "Akun Anda telah ditangguhkan (disuspend).{$reason} Silakan hubungi admin untuk bantuan lebih lanjut.",
            ]);
        }

        if ($user && $user->status === 'anonymized') {
            $this->recordFailedAttempt();

            throw ValidationException::withMessages([
                'email' => 'Akun ini telah dihapus/dianonimkan dan tidak dapat digunakan lagi.',
            ]);
        }

        if (! Auth::attempt([
            ...$this->only('email', 'password'),
            'password_login_enabled' => true,
            'status' => 'active',
        ], $this->boolean('remember'))) {
            $this->recordFailedAttempt();

            throw ValidationException::withMessages([
                'email' => trans('auth.failed'),
            ]);
        }

        foreach ($this->throttleLimits() as $limit) {
            RateLimiter::clear($limit['key']);
        }
    }

    /**
     * Ensure the login request is not rate limited.
     *
     * @throws ValidationException
     */
    public function ensureIsNotRateLimited(): void
    {
        $seconds = 0;

        foreach ($this->throttleLimits() as $limit) {
            if (RateLimiter::tooManyAttempts($limit['key'], $limit['attempts'])) {
                $seconds = max($seconds, 1, RateLimiter::availableIn($limit['key']));
            }
        }

        if ($seconds === 0) {
            return;
        }

        event(new Lockout($this));

        throw ValidationException::withMessages([
            'email' => trans('auth.throttle', [
                'seconds' => $seconds,
                'minutes' => ceil($seconds / 60),
            ]),
        ]);
    }

    /**
     * Get the rate limiting throttle key for the request.
     */
    public function throttleKey(): string
    {
        return 'login:email-ip:'.hash('sha256', $this->input('email').'|'.$this->ip());
    }

    private function throttleLimits(): array
    {
        return [
            [
                'key' => $this->throttleKey(),
                ...config('auth.login_limits.email_ip'),
            ],
            [
                'key' => 'login:account:'.hash('sha256', $this->input('email')),
                ...config('auth.login_limits.account'),
            ],
        ];
    }

    private function recordFailedAttempt(): void
    {
        foreach ($this->throttleLimits() as $limit) {
            RateLimiter::hit($limit['key'], $limit['decay_seconds']);
        }
    }
}
