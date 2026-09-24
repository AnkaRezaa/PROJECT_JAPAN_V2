<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Models\Kuis;
use App\Models\UmpanBalikPembelajaran;
use App\Services\AksesKuisPenggunaService;
use App\Services\PembelajaranPenggunaService;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class PembelajaranController extends Controller
{
    public function quizLobby(PembelajaranPenggunaService $learning)
    {
        return Inertia::render('User/Kuis/DaftarKuis', [
            'quizzes' => $learning->quizLobby(Auth::user()),
        ]);
    }

    public function showQuiz($id, PembelajaranPenggunaService $learning, AksesKuisPenggunaService $aksesKuis)
    {
        $quiz = Kuis::with(['module.programPembelajaran', 'questions'])
            ->where('status', 'published')
            ->whereHas('module', fn ($moduleQuery) => $moduleQuery->where('status', 'published'))
            ->find($id);

        if (! $quiz) {
            abort(404, 'Kuis tidak ditemukan.');
        }

        $aksesKuis->abortJikaTerkunci(Auth::user(), $quiz);

        $payload = $learning->quizPayload(Auth::user(), $quiz);
        $roadmapUrl = $quiz->module?->programPembelajaran
            ? route('user.modul.program', $quiz->module->programPembelajaran->slug)
            : route('user.kelas.index');

        return Inertia::render(
            'User/Kuis/KerjakanKuis',
            $payload + [
                'module_flow' => false,
                'back_url' => $roadmapUrl,
                'finish_url' => $roadmapUrl,
                'learning_feedback' => UmpanBalikPembelajaran::query()
                    ->where('user_id', Auth::id())
                    ->where('quiz_id', $quiz->id)
                    ->whereDate('feedback_date', today())
                    ->first(['rating', 'continue_learning']),
            ]
        );
    }
}
