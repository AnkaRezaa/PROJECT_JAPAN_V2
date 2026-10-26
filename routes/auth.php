<?php

use App\Http\Controllers\Auth\KataSandiController;
use App\Http\Controllers\Auth\KonfirmasiPasswordController;
use App\Http\Controllers\Auth\LinkResetPasswordController;
use App\Http\Controllers\Auth\LoginSosialController;
use App\Http\Controllers\Auth\NotifikasiVerifikasiEmailController;
use App\Http\Controllers\Auth\PasswordBaruController;
use App\Http\Controllers\Auth\PromptVerifikasiEmailController;
use App\Http\Controllers\Auth\RegistrasiPenggunaController;
use App\Http\Controllers\Auth\SesiAutentikasiController;
use App\Http\Controllers\Auth\VerifikasiEmailController;
use Illuminate\Support\Facades\Route;

Route::middleware('guest')->group(function () {
    Route::get('register', [RegistrasiPenggunaController::class, 'create'])
        ->name('register');

    Route::post('register', [RegistrasiPenggunaController::class, 'store'])->middleware('throttle:guest-sensitive');

    Route::get('login', [SesiAutentikasiController::class, 'create'])
        ->name('login');

    Route::post('login', [SesiAutentikasiController::class, 'store'])
        ->middleware('throttle:login');

    Route::get('auth/google/redirect', [LoginSosialController::class, 'redirectToGoogle'])
        ->name('auth.google.redirect');

    Route::get('forgot-password', [LinkResetPasswordController::class, 'create'])
        ->name('password.request');

    Route::post('forgot-password', [LinkResetPasswordController::class, 'store'])
        ->middleware('throttle:guest-sensitive')
        ->name('password.email');

    Route::get('reset-password', [PasswordBaruController::class, 'create'])
        ->name('password.reset');

    Route::post('reset-password', [PasswordBaruController::class, 'store'])
        ->middleware('throttle:guest-sensitive')
        ->name('password.store');
});

Route::get('auth/google/callback', [LoginSosialController::class, 'handleGoogleCallback'])
    ->name('auth.google.callback');

Route::middleware('auth')->group(function () {
    Route::get('verify-email', PromptVerifikasiEmailController::class)
        ->name('verification.notice');

    Route::get('verify-email/{id}/{hash}', VerifikasiEmailController::class)
        ->middleware(['signed', 'throttle:6,1'])
        ->name('verification.verify');

    Route::post('email/verification-notification', [NotifikasiVerifikasiEmailController::class, 'store'])
        ->middleware('throttle:6,1')
        ->name('verification.send');

    Route::get('profile/delete/google/redirect', [LoginSosialController::class, 'redirectForAccountDeletion'])
        ->middleware(['verified', 'throttle:5,1'])
        ->name('profile.delete.google.redirect');

    Route::get('confirm-password', [KonfirmasiPasswordController::class, 'show'])
        ->name('password.confirm');

    Route::post('confirm-password', [KonfirmasiPasswordController::class, 'store']);

    Route::put('password', [KataSandiController::class, 'update'])->name('password.update');

    Route::post('logout', [SesiAutentikasiController::class, 'destroy'])
        ->name('logout');
});
