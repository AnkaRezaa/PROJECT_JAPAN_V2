<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Services\BetaAccessService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class BetaWaitingController extends Controller
{
    public function __invoke(Request $request, BetaAccessService $beta)
    {
        if (! $beta->pending($request->user())) {
            return redirect()->route('user.dashboard');
        }

        return Inertia::render('User/Beta/Waiting', ['beta' => $beta->payload()]);
    }
}
