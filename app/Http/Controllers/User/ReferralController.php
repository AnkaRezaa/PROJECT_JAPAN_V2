<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Services\ReferralService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ReferralController extends Controller
{
    public function index(Request $request, ReferralService $referrals)
    {
        abort_unless(config('referrals.enabled') && $referrals->eligible($request->user()), 403);
        $code = $request->user()->referral_code;

        return Inertia::render('User/Referral/Index', [
            'code' => $code,
            'inviteUrl' => $code ? route('register', ['ref' => $code]) : null,
            'summary' => $referrals->summary($request->user()),
        ]);
    }

    public function store(Request $request, ReferralService $referrals)
    {
        $referrals->issue($request->user());

        return redirect()->route('user.referrals.index');
    }
}
