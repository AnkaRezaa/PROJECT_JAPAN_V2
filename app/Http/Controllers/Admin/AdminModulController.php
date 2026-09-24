<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ModulRequest;
use App\Models\CurriculumTrack;
use App\Models\Kuis;
use App\Models\LevelPembelajaran;
use App\Models\Modul;
use App\Models\ProgramPembelajaran;
use App\Services\KloterBelajarService;
use App\Services\NotifikasiPenggunaService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class AdminModulController extends Controller
{
    public function __construct(private readonly KloterBelajarService $kloterService) {}

    public function programsIndex(Request $request)
    {
        $query = ProgramPembelajaran::with(['level', 'curriculumTrack'])
            ->withCount(['modules' => fn ($query) => $query->where('status', 'published')])
            ->orderBy('sort_order')
            ->orderBy('id');
        $this->kloterService->batasiProgramDikelola($query, $request->user());

        if ($request->filled('search')) {
            $search = $request->string('search')->toString();
            $query->where(function ($query) use ($search) {
                $query->where('title', 'like', "%{$search}%")
                    ->orWhere('instructor_name', 'like', "%{$search}%");
            });
        }

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        return Inertia::render('Admin/ModulMateri/ManajemenKelas', [
            'programs' => $query->paginate(10)->withQueryString(),
            'tracks' => CurriculumTrack::where('status', 'active')->orderBy('sort_order')->get(['id', 'code', 'name']),
            'levels' => LevelPembelajaran::with('curriculumTrack:id,code,name')->orderBy('stage')->get(),
            'filters' => $request->only('search', 'status'),
        ]);
    }

    public function storeProgram(Request $request)
    {
        abort_unless($request->user()->isAdminGlobal(), 403, 'Hanya Admin Global yang dapat membuat kelas.');
        $validated = $this->prepareProgramInput($request);
        $validated['slug'] = $this->uniqueProgramSlug($validated['title']);

        ProgramPembelajaran::create($validated);

        return redirect()->back()->with('success', 'Kelas berhasil dibuat.');
    }

    public function updateProgram(Request $request, ProgramPembelajaran $program)
    {
        abort_unless($request->user()->isAdminGlobal(), 403, 'Hanya Admin Global yang dapat mengubah informasi kelas.');
        $previousThumbnailUrl = $program->thumbnail_url;
        $program->update($this->prepareProgramInput($request, $program));

        if ($previousThumbnailUrl !== $program->thumbnail_url) {
            $this->deleteManagedThumbnail($previousThumbnailUrl);
        }

        return redirect()->back()->with('success', 'Kelas berhasil diperbarui.');
    }

    public function destroyProgram(Request $request, ProgramPembelajaran $program)
    {
        abort_unless($request->user()->isAdminGlobal(), 403, 'Hanya Admin Global yang dapat menghapus kelas.');
        if ($program->modules()->exists()) {
            return redirect()->back()->withErrors([
                'delete' => 'Kelas tidak dapat dihapus karena masih memiliki modul.',
            ]);
        }

        $this->deleteManagedThumbnail($program->thumbnail_url);
        $program->delete();

        return redirect()->back()->with('success', 'Kelas berhasil dihapus.');
    }

    public function index(Request $request)
    {
        $focus = in_array($request->string('focus')->toString(), ['roadmap', 'flashcard', 'presentation'], true)
            ? $request->string('focus')->toString()
            : 'roadmap';

        $query = Modul::with([
            'level',
            'programPembelajaran',
            'presentationDecks' => fn ($resourceQuery) => $resourceQuery
                ->whereIn('week_slot', ['opening', 'after_day', 'closing'])
                ->select(['id', 'module_id', 'module_day_id', 'week_slot', 'sort_order', 'title', 'status'])
                ->with('day:id,module_id,day_number,title')
                ->withCount('slides'),
            'days' => fn ($dayQuery) => $dayQuery
                ->select([
                    'id',
                    'module_id',
                    'day_number',
                    'title',
                    'description',
                    'status',
                    'checkpoint_quiz_id',
                ])
                ->withCount('vocabulary')
                ->with([
                    'flashcardSets' => fn ($resourceQuery) => $resourceQuery
                        ->select(['id', 'module_id', 'module_day_id', 'title', 'status'])
                        ->withCount('flashcards'),
                    'quizzes' => fn ($resourceQuery) => $resourceQuery
                        ->select(['id', 'module_id', 'module_day_id', 'type', 'passing_score', 'status'])
                        ->with(['grammarLesson:id,quiz_id,pattern,title'])
                        ->withCount('questions'),
                    'presentationDecks' => fn ($resourceQuery) => $resourceQuery
                        ->select(['id', 'module_id', 'module_day_id', 'title', 'status'])
                        ->withCount('slides'),
                ])
                ->orderBy('day_number'),
        ])
            ->withCount([
                'days',
                'flashcardSets',
                'quizzes as standard_quizzes_count' => fn ($quizQuery) => $quizQuery->where('type', '!=', 'grammar'),
                'presentationDecks',
            ])
            ->orderBy('program_pembelajaran_id')
            ->orderBy('level_id')
            ->orderBy('week_number');

        if ($request->user()->isMentor()) {
            $query->whereIn('program_pembelajaran_id', $this->kloterService->programIdsDikelola($request->user()));
        }

        if ($request->filled('search')) {
            $query->where('title', 'like', '%'.$request->search.'%');
        }

        if ($request->filled('program_id') && $request->program_id !== 'all') {
            $this->kloterService->abortJikaProgramDiLuarCakupan($request->user(), $request->integer('program_id'));
            $query->where('program_pembelajaran_id', $request->integer('program_id'));
        } else {
            // The roadmap is a class workspace; never mix weeks from multiple classes.
            $query->whereRaw('1 = 0');
        }

        $modules = $query->paginate(10)->through(fn ($module) => [
            'id' => $module->id,
            'title' => $module->title,
            'description' => $module->description,
            'week_number' => $module->week_number,
            'status' => $module->status ?? 'published',
            'level' => $module->level,
            'program' => $module->programPembelajaran,
            'lesson_count' => 0,
            'day_count' => $module->days_count,
            'days_count' => $module->days_count,
            'flashcard_count' => $module->flashcard_sets_count,
            'quiz_count' => $module->standard_quizzes_count,
            'presentation_count' => $module->presentation_decks_count,
            'is_ready' => $module->flashcard_sets_count > 0 && $module->standard_quizzes_count > 0,
            'weekly_presentations' => $module->presentationDecks
                ->map(fn ($deck) => $this->presentationPayload($deck))
                ->values(),
            'weekly_exams' => [],
            'days' => $module->days->map(function ($day) {
                $publishedFlashcardCount = $day->flashcardSets
                    ->where('status', 'published')
                    ->sum('flashcards_count');
                $checkpointQuiz = $day->quizzes->firstWhere('id', $day->checkpoint_quiz_id);
                $hasValidCheckpoint = $checkpointQuiz?->status === 'published'
                    && $checkpointQuiz->questions_count > 0;
                $completionMethod = $hasValidCheckpoint
                    ? 'checkpoint'
                    : ($publishedFlashcardCount > 0 ? 'flashcard' : null);

                return [
                    'id' => $day->id,
                    'day_number' => $day->day_number,
                    'title' => $day->title,
                    'description' => $day->description,
                    'status' => $day->status,
                    'checkpoint_quiz_id' => $day->checkpoint_quiz_id,
                    'completion_method' => $completionMethod,
                    'is_ready' => $completionMethod !== null,
                    'vocabulary_count' => $day->vocabulary_count,
                    'flashcard_sets' => $day->flashcardSets->map(fn ($set) => [
                        'id' => $set->id,
                        'title' => $set->title,
                        'status' => $set->status,
                        'item_count' => $set->flashcards_count,
                    ]),
                    'quizzes' => $day->quizzes->where('type', '!=', 'grammar')->map(fn ($quiz) => [
                        'id' => $quiz->id,
                        'title' => 'Kuis #'.$quiz->id,
                        'type' => $quiz->type,
                        'status' => $quiz->status,
                        'passing_score' => $quiz->passing_score,
                        'item_count' => $quiz->questions_count,
                    ])->values(),
                    'grammar_lesson_count' => $day->quizzes->where('type', 'grammar')->count(),
                    'grammar_quizzes' => $day->quizzes->where('type', 'grammar')->map(fn ($quiz) => [
                        'id' => $quiz->id,
                        'status' => $quiz->status,
                        'pattern' => $quiz->grammarLesson?->pattern,
                        'title' => $quiz->grammarLesson?->title,
                        'item_count' => $quiz->questions_count,
                    ])->values(),
                    'presentation_decks' => $day->presentationDecks->map(fn ($deck) => [
                        'id' => $deck->id,
                        'title' => $deck->title,
                        'status' => $deck->status,
                        'item_count' => $deck->slides_count,
                    ]),
                ];
            }),
        ]);

        return Inertia::render('Admin/ModulMateri/ManajemenModulMateri', [
            'modules' => $modules,
            'levels' => LevelPembelajaran::orderBy('stage')->get(),
            'programs' => ProgramPembelajaran::with(['level', 'curriculumTrack'])->orderBy('sort_order')->orderBy('id')->get(),
            'filters' => [
                ...$request->only('search', 'program_id', 'week_id', 'day_id'),
                'focus' => $focus,
            ],
        ]);
    }

    private function presentationPayload($deck): ?array
    {
        if (! $deck) {
            return null;
        }

        return [
            'id' => $deck->id,
            'title' => $deck->title,
            'week_slot' => $deck->week_slot,
            'sort_order' => $deck->sort_order,
            'day' => $deck->day ? [
                'id' => $deck->day->id,
                'day_number' => $deck->day->day_number,
                'title' => $deck->day->title,
            ] : null,
            'status' => $deck->status,
            'item_count' => $deck->slides_count,
        ];
    }

    public function store(ModulRequest $request, NotifikasiPenggunaService $notifikasi)
    {
        $module = Modul::create($request->validated());

        if ($module->status === 'published') {
            $this->kirimNotifikasiModulTerbit($module, $notifikasi, 'new_module');
        }

        return redirect()->back()->with('success', 'Modul berhasil dibuat');
    }

    public function update(ModulRequest $request, Modul $module, NotifikasiPenggunaService $notifikasi)
    {
        $oldStatus = $module->status;
        $module->update($request->validated());

        if ($oldStatus !== 'published' && $module->status === 'published') {
            $this->kirimNotifikasiModulTerbit($module, $notifikasi, 'new_module');
        }

        return redirect()->back()->with('success', 'Modul berhasil diperbarui');
    }

    public function destroy(Modul $module)
    {
        $flashcardCount = $module->flashcardSets()->count();
        $quizCount = $module->quizzes()->count();

        if ($flashcardCount > 0 || $quizCount > 0) {
            return redirect()->back()->withErrors([
                'delete' => 'Modul tidak dapat dihapus karena masih memiliki konten terkait.',
            ]);
        }

        $module->delete();

        return redirect()->back()->with('success', 'Modul berhasil dihapus');
    }

    private function prepareProgramInput(Request $request, ?ProgramPembelajaran $program = null): array
    {
        $track = CurriculumTrack::whereKey($request->integer('curriculum_track_id'))->first();

        $validated = $request->validate([
            'curriculum_track_id' => ['required', 'exists:curriculum_tracks,id'],
            'level_id' => [
                Rule::requiredIf($track?->code === 'jlpt'),
                'nullable',
                Rule::exists('levels', 'id')->where(
                    fn ($query) => $query->where('curriculum_track_id', $request->integer('curriculum_track_id'))
                ),
            ],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'instructor_name' => ['nullable', 'string', 'max:255'],
            'thumbnail_url' => ['nullable', 'string', 'max:2048'],
            'thumbnail_file' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'status' => ['required', Rule::in(['draft', 'published'])],
            'sort_order' => ['required', 'integer', 'min:1'],
        ]);

        if ($request->hasFile('thumbnail_file')) {
            $thumbnailPath = $request->file('thumbnail_file')->store('kelas-thumbnails', 'public');
            $validated['thumbnail_url'] = Storage::disk('public')->url($thumbnailPath);
        }

        unset($validated['thumbnail_file']);

        return $validated;
    }

    private function deleteManagedThumbnail(?string $thumbnailUrl): void
    {
        if (! $thumbnailUrl) {
            return;
        }

        $path = ltrim(Str::after($thumbnailUrl, '/storage/'), '/');

        if ($path !== ltrim($thumbnailUrl, '/') && str_starts_with($path, 'kelas-thumbnails/')) {
            Storage::disk('public')->delete($path);
        }
    }

    private function uniqueProgramSlug(string $title): string
    {
        $base = Str::slug($title) ?: 'kelas';
        $slug = $base;
        $counter = 2;

        while (ProgramPembelajaran::where('slug', $slug)->exists()) {
            $slug = "{$base}-{$counter}";
            $counter++;
        }

        return $slug;
    }

    private function kirimNotifikasiModulTerbit(Modul $module, NotifikasiPenggunaService $notifikasi, string $jenis): void
    {
        $module->loadMissing('programPembelajaran');

        $url = $module->programPembelajaran
            ? route('user.modul.program', $module->programPembelajaran->slug)
            : route('user.kelas.index');

        $notifikasi->kirimKePenggunaYangBisaAksesModul(
            $module,
            $jenis,
            'Modul baru tersedia',
            "Week {$module->week_number}: {$module->title} sudah bisa dipelajari.",
            $url,
            ['module_id' => $module->id]
        );
    }
}
