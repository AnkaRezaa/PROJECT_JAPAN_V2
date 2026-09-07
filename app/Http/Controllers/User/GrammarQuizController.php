<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Models\HariModul;
use App\Models\Kuis;
use App\Services\AksesKuisPenggunaService;
use App\Services\KuisGrammarService;
use Illuminate\Http\Request;

class GrammarQuizController extends Controller
{
    public function index(
        Request $request,
        HariModul $moduleDay,
        AksesKuisPenggunaService $access,
        KuisGrammarService $grammar
    ) {
        $lessons = $moduleDay->quizzes()
            ->where('type', 'grammar')
            ->where('status', 'published')
            ->whereHas('questions')
            ->with(['grammarLesson', 'questions'])
            ->get()
            ->each(fn (Kuis $quiz) => $access->abortJikaTerkunci($request->user(), $quiz))
            ->map(fn (Kuis $quiz) => $grammar->payload($quiz));

        return response()->json(['lessons' => $lessons]);
    }

    public function show(
        Request $request,
        Kuis $quiz,
        AksesKuisPenggunaService $access,
        KuisGrammarService $grammar
    ) {
        abort_unless($quiz->isGrammar() && $quiz->status === 'published', 404);
        $access->abortJikaTerkunci($request->user(), $quiz);

        return response()->json(['lesson' => $grammar->payload($quiz)]);
    }
}
