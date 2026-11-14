<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Models\ProgramPembelajaran;
use App\Services\UlasanKelasService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class UlasanKelasController extends Controller
{
    public function index(Request $request, ProgramPembelajaran $program, UlasanKelasService $service)
    {
        abort_unless($program->status === 'published', 404);

        return Inertia::render('Kelas/Ulasan', [
            ...$service->pageData($request, $program),
            'learningContext' => $request->routeIs('user.kelas.reviews.index'),
        ]);
    }

    public function update(Request $request, ProgramPembelajaran $program, UlasanKelasService $service)
    {
        abort_unless($program->status === 'published', 404);
        $data = $request->validate(['rating' => ['required', 'integer', 'between:1,5'], 'comment' => ['nullable', 'string', 'max:1000']]);
        $service->save($request->user(), $program, $data);

        return back()->with('success', 'Ulasan tersimpan.');
    }

    public function destroy(Request $request, ProgramPembelajaran $program, UlasanKelasService $service)
    {
        abort_unless($program->status === 'published', 404);
        $service->remove($request->user(), $program);

        return back()->with('success', 'Ulasan dihapus.');
    }
}
