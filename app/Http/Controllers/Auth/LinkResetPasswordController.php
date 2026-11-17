<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Services\PasswordResetOtpService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class LinkResetPasswordController extends Controller
{
    public function create(Request $request): Response
    {
        return Inertia::render('Auth/PasswordResetOtp', [
            'mode' => 'request',
            'email' => $request->query('email', ''),
            'status' => session('status'),
            'sentAt' => session('password_reset_otp_sent_at'),
        ]);
    }

    public function store(Request $request, PasswordResetOtpService $otp): RedirectResponse
    {
        $request->validate([
            'email' => ['required', 'email'],
        ]);

        $email = strtolower(trim($request->string('email')->toString()));
        $otp->request($email, $request->ip());

        return redirect()->route('password.reset', ['email' => $email])
            ->with('status', 'Jika alamat email tersebut dapat menggunakan kata sandi, Anda akan menerima kode OTP. Jika email belum diterima, silakan coba lagi nanti atau hubungi admin melalui chat.')
            ->with('password_reset_otp_sent_at', now()->toIso8601String());
    }
}
