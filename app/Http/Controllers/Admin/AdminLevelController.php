<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\CurriculumTrack;
use App\Models\LevelPembelajaran;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class AdminLevelController extends Controller
{
    public function index(Request $request)
    {
        abort_unless($request->user()->isAdminGlobal(), 403, 'Hanya Admin Global yang berhak mengelola level kurikulum.');

        return Inertia::render('Admin/Level/ManajemenLevel', [
            'tracks' => CurriculumTrack::query()
                ->withCount(['levels', 'programs'])
                ->orderBy('sort_order')
                ->orderBy('id')
                ->get(),
            'levels' => LevelPembelajaran::with('curriculumTrack:id,code,name')
                ->orderBy('curriculum_track_id')
                ->orderBy('stage')
                ->get(),
        ]);
    }

    public function store(Request $request)
    {
        abort_unless($request->user()->isAdminGlobal(), 403, 'Hanya Admin Global yang berhak mengelola level kurikulum.');
        $validated = $request->validate([
            'curriculum_track_id' => ['required', 'exists:curriculum_tracks,id'],
            'level_name' => ['required', 'string', 'max:50'],
            'stage' => 'required|integer',
        ]);

        LevelPembelajaran::create($validated);

        return redirect()->back()->with('success', 'LevelPembelajaran berhasil ditambahkan');
    }

    public function update(Request $request, LevelPembelajaran $level)
    {
        abort_unless($request->user()->isAdminGlobal(), 403, 'Hanya Admin Global yang berhak mengelola level kurikulum.');
        $validated = $request->validate([
            'curriculum_track_id' => ['required', 'exists:curriculum_tracks,id'],
            'level_name' => ['required', 'string', 'max:50'],
            'stage' => 'required|integer',
        ]);

        $level->update($validated);

        return redirect()->back()->with('success', 'LevelPembelajaran berhasil diperbarui');
    }

    public function destroy(Request $request, LevelPembelajaran $level)
    {
        abort_unless($request->user()->isAdminGlobal(), 403, 'Hanya Admin Global yang berhak mengelola level kurikulum.');
        if ($level->modules()->exists() || $level->programPembelajaran()->exists()) {
            return redirect()->back()->with('error', 'Level tidak dapat dihapus karena masih digunakan oleh kelas atau Week.');
        }

        try {
            $level->delete();

            return redirect()->back()->with('success', 'Level berhasil dihapus');
        } catch (\Throwable $e) {
            return redirect()->back()->with('error', 'Level tidak dapat dihapus karena masih digunakan oleh Bank Soal atau Ujian.');
        }
    }

    public function storeTrack(Request $request)
    {
        abort_unless($request->user()->isAdminGlobal(), 403, 'Hanya Admin Global yang berhak mengelola level kurikulum.');
        CurriculumTrack::create($this->validateTrack($request));

        return redirect()->back()->with('success', 'Jalur kurikulum berhasil ditambahkan.');
    }

    public function updateTrack(Request $request, CurriculumTrack $curriculumTrack)
    {
        abort_unless($request->user()->isAdminGlobal(), 403, 'Hanya Admin Global yang berhak mengelola level kurikulum.');
        $curriculumTrack->update($this->validateTrack($request, $curriculumTrack));

        return redirect()->back()->with('success', 'Jalur kurikulum berhasil diperbarui.');
    }

    public function destroyTrack(Request $request, CurriculumTrack $curriculumTrack)
    {
        abort_unless($request->user()->isAdminGlobal(), 403, 'Hanya Admin Global yang berhak mengelola level kurikulum.');
        if ($curriculumTrack->levels()->exists() || $curriculumTrack->programs()->exists()) {
            return redirect()->back()->with('error', 'Jalur tidak dapat dihapus karena masih memiliki level atau kelas.');
        }

        try {
            $curriculumTrack->delete();

            return redirect()->back()->with('success', 'Jalur kurikulum berhasil dihapus.');
        } catch (\Throwable $e) {
            return redirect()->back()->with('error', 'Jalur kurikulum tidak dapat dihapus karena masih memiliki relasi data.');
        }
    }

    private function validateTrack(Request $request, ?CurriculumTrack $track = null): array
    {
        return $request->validate([
            'code' => [
                'required',
                'string',
                'max:30',
                'regex:/^[a-z0-9-]+$/',
                Rule::unique('curriculum_tracks', 'code')->ignore($track?->id),
            ],
            'name' => ['required', 'string', 'max:100'],
            'status' => ['required', Rule::in(['active', 'inactive'])],
            'sort_order' => ['required', 'integer', 'min:1'],
        ]);
    }
}
