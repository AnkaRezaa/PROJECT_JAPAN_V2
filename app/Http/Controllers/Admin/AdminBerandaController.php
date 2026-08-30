<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AnggotaKloter;
use App\Models\Kosakata;
use App\Models\Kuis;
use App\Models\Modul;
use App\Models\PengerjaanKuis;
use App\Models\Pengguna;
use App\Models\Progres;
use App\Services\ChartDataService;
use App\Services\KloterBelajarService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class AdminBerandaController extends Controller
{
    public function index(
        Request $request,
        KloterBelajarService $kloterService,
        ChartDataService $chartData
    ): Response {
        /** @var Pengguna $admin */
        $admin = $request->user();
        $selectedKloter = $kloterService->resolveKloterDikelola($admin, $request->integer('kloter') ?: null);
        $programIds = $kloterService->programIdsDikelola($admin, $selectedKloter);
        $period = $chartData->resolvePeriod($request);

        $payload = [
            'adminScope' => $admin->isMentor() ? Pengguna::ADMIN_SCOPE_KLOTER : Pengguna::ADMIN_SCOPE_GLOBAL,
            'kloters' => $kloterService->pilihanKloterAdmin($admin),
            'filters' => ['kloter' => $selectedKloter?->id, 'period' => $period],
        ];

        if ($admin->isMentor()) {
            $payload = [...$payload, ...$this->kloterWorkspace($admin, $selectedKloter, $programIds, $period, $chartData, $kloterService)];
        } else {
            $payload = [...$payload, ...$this->contentWorkspace($programIds)];
        }

        return Inertia::render('Admin/Beranda/Beranda', $payload);
    }

    /**
     * @param Collection<int, int>|null $programIds
     * @return array<string, mixed>
     */
    private function kloterWorkspace(
        Pengguna $admin,
        $selectedKloter,
        ?Collection $programIds,
        int $period,
        ChartDataService $chartData,
        KloterBelajarService $kloterService
    ): array {
        $studentsQuery = $kloterService->batasiSiswaDikelola(
            Pengguna::query()->where('role', 'user'),
            $admin,
            $selectedKloter
        );
        $studentIds = (clone $studentsQuery)->select('users.id');
        $attemptsQuery = $this->attemptsInPrograms($studentIds, $programIds);
        $progressQuery = $this->progressInPrograms($studentIds, $programIds);
        $fromDate = $chartData->fromDate($period);

        $attemptsByDay = (clone $attemptsQuery)
            ->where('attempted_at', '>=', $fromDate)
            ->selectRaw('DATE(attempted_at) as day, COUNT(*) as total')
            ->groupBy('day')
            ->pluck('total', 'day');
        $modulesByDay = (clone $progressQuery)
            ->whereNotNull('completed_at')
            ->where('completed_at', '>=', $fromDate)
            ->selectRaw('DATE(completed_at) as day, COUNT(*) as total')
            ->groupBy('day')
            ->pluck('total', 'day');
        $activityEvents = (clone $progressQuery)
            ->where('updated_at', '>=', $fromDate)
            ->selectRaw('DATE(updated_at) as day, user_id')
            ->union(
                (clone $attemptsQuery)
                    ->where('attempted_at', '>=', $fromDate)
                    ->selectRaw('DATE(attempted_at) as day, user_id')
            );
        $activeStudentsByDay = DB::query()
            ->fromSub($activityEvents, 'activity_events')
            ->selectRaw('day, COUNT(DISTINCT user_id) as total')
            ->groupBy('day')
            ->pluck('total', 'day');
        $activeStudentIds = DB::query()
            ->fromSub((clone $activityEvents), 'activity_events')
            ->distinct()
            ->pluck('user_id');

        $atRiskStudents = (clone $studentsQuery)
            ->when($activeStudentIds->isNotEmpty(), fn (Builder $query) => $query->whereNotIn('users.id', $activeStudentIds))
            ->when($activeStudentIds->isEmpty(), fn (Builder $query) => $query)
            ->orderByRaw('last_activity_date IS NULL DESC')
            ->orderBy('last_activity_date')
            ->take(5)
            ->get(['id', 'username', 'avatar', 'last_activity_date'])
            ->map(fn (Pengguna $student) => [
                'id' => $student->id,
                'name' => $student->username,
                'avatar' => $student->avatar,
                'detail' => $student->last_activity_date
                    ? 'Terakhir aktif '.$student->last_activity_date->diffForHumans()
                    : 'Belum ada aktivitas belajar',
            ]);

        $lowScoreRows = (clone $attemptsQuery)
            ->selectRaw('user_id, ROUND(AVG(score), 1) as average_score, MAX(attempted_at) as last_attempted_at')
            ->groupBy('user_id')
            ->havingRaw('AVG(score) < ?', [60])
            ->orderBy('average_score')
            ->take(5)
            ->get();
        $lowScoreUsers = Pengguna::query()
            ->whereIn('id', $lowScoreRows->pluck('user_id'))
            ->get(['id', 'username', 'avatar'])
            ->keyBy('id');
        $lowScoreStudents = $lowScoreRows->map(fn ($row) => [
            'id' => (int) $row->user_id,
            'name' => $lowScoreUsers->get($row->user_id)?->username ?? 'Siswa',
            'avatar' => $lowScoreUsers->get($row->user_id)?->avatar,
            'detail' => 'Rata-rata kuis '.number_format((float) $row->average_score, 1).'% ',
        ])->values();

        $pendingEnrollments = AnggotaKloter::query()
            ->whereIn('kloter_belajar_id', $this->managedKloterIds($admin, $selectedKloter, $kloterService))
            ->where('status', 'paid_pending_approval')
            ->count();
        $cohorts = $kloterService->pilihanKloterAdmin($admin)
            ->when($selectedKloter, fn (Collection $items) => $items->where('id', $selectedKloter->id)->values())
            ->take(4)
            ->map(function (array $kloter) use ($kloterService, $admin) {
                $model = $kloterService->kloterDikelola($admin)->find($kloter['id']);
                $week = $kloterService->mingguAktif($model);

                return [
                    ...$kloter,
                    'week_label' => $week === 0 ? 'Belum mulai' : ($week ? "Minggu {$week}" : 'Jadwal belum ditetapkan'),
                    'capacity_label' => $kloter['max_siswa']
                        ? "{$kloter['anggota_aktif_count']} / {$kloter['max_siswa']} siswa"
                        : "{$kloter['anggota_aktif_count']} siswa",
                ];
            })
            ->values();

        return [
            'workspace' => 'kloter',
            'workspaceTitle' => $selectedKloter?->nama ?? 'Ruang Pendampingan Kelas',
            'workspaceDescription' => $selectedKloter
                ? 'Pantau perkembangan siswa dan tindak lanjuti kebutuhan kloter terpilih.'
                : 'Pilih kloter untuk melihat siswa yang perlu ditindaklanjuti dan aktivitas kelas.',
            'stats' => [
                $this->stat('Siswa dalam cakupan', (clone $studentsQuery)->count(), 'groups'),
                $this->stat("Aktif {$period} hari", $activeStudentIds->count(), 'active'),
                $this->stat('Modul selesai', (clone $progressQuery)->whereNotNull('completed_at')->count(), 'complete'),
                $this->stat('Rata-rata skor', round((float) (clone $attemptsQuery)->avg('score'), 1).'%', 'score'),
            ],
            'actionItems' => [
                $this->actionItem('Menunggu persetujuan', $pendingEnrollments, 'Pembayaran sudah sukses dan perlu dimasukkan ke kelas.', 'warning', route('admin.users', array_filter(['kloter' => $selectedKloter?->id]))),
                $this->actionItem('Siswa belum aktif', (clone $studentsQuery)->count() - $activeStudentIds->count(), "Belum ada aktivitas pada {$period} hari terakhir.", 'danger', route('admin.users', array_filter(['kloter' => $selectedKloter?->id]))),
                $this->actionItem('Nilai perlu dibantu', $lowScoreRows->count(), 'Rata-rata nilai kuis di bawah 60%.', 'info', route('admin.analytics', array_filter(['kloter' => $selectedKloter?->id]))),
            ],
            'cohorts' => $cohorts,
            'activitySeries' => $chartData->dailySeries($period, [
                'active_students' => $activeStudentsByDay,
                'quiz_attempts' => $attemptsByDay,
                'modules_completed' => $modulesByDay,
            ]),
            'atRiskStudents' => $atRiskStudents,
            'lowScoreStudents' => $lowScoreStudents,
            'recentAttempts' => (clone $attemptsQuery)
                ->with(['user:id,username,avatar', 'quiz.module:id,title'])
                ->latest('attempted_at')
                ->take(6)
                ->get()
                ->map(fn (PengerjaanKuis $attempt) => [
                    'id' => $attempt->id,
                    'student_id' => $attempt->user_id,
                    'student' => $attempt->user?->username ?? 'Siswa',
                    'avatar' => $attempt->user?->avatar,
                    'module' => $attempt->quiz?->module?->title ?? 'Kuis',
                    'score' => number_format((float) $attempt->score, 1).'%',
                    'attempted_at' => $attempt->attempted_at?->diffForHumans() ?? '-',
                ]),
        ];
    }

    /**
     * @param Collection<int, int>|null $programIds
     * @return array<string, mixed>
     */
    private function contentWorkspace(?Collection $programIds): array
    {
        $modulesQuery = Modul::query()
            ->with('programPembelajaran:id,title')
            ->when($programIds !== null, fn (Builder $query) => $query->whereIn('program_pembelajaran_id', $programIds));
        $modules = (clone $modulesQuery)
            ->withCount([
                'presentationDecks as presentation_ready_count' => fn (Builder $query) => $query->where('status', 'published'),
                'flashcardSets as flashcard_ready_count' => fn (Builder $query) => $query
                    ->where('status', 'published')
                    ->whereHas('flashcards'),
                'quizzes as quiz_ready_count' => fn (Builder $query) => $query
                    ->where('status', 'published')
                    ->whereHas('questions'),
            ])
            ->orderBy('program_pembelajaran_id')
            ->orderBy('week_number')
            ->take(8)
            ->get(['id', 'program_pembelajaran_id', 'title', 'week_number', 'status']);
        $vocabularyCounts = Kosakata::query()
            ->whereIn('module_id', $modules->pluck('id'))
            ->where('status', 'published')
            ->selectRaw('module_id, COUNT(*) as total')
            ->groupBy('module_id')
            ->pluck('total', 'module_id');
        $coverage = $modules->map(function (Modul $module) use ($vocabularyCounts) {
            $items = [
                ['label' => 'PPT', 'ready' => $module->presentation_ready_count > 0],
                ['label' => 'Kosakata', 'ready' => (int) ($vocabularyCounts->get($module->id) ?? 0) > 0],
                ['label' => 'Flashcard', 'ready' => $module->flashcard_ready_count > 0],
                ['label' => 'Kuis', 'ready' => $module->quiz_ready_count > 0],
            ];

            return [
                'id' => $module->id,
                'title' => $module->title,
                'program' => $module->programPembelajaran?->title ?? 'Tanpa kelas',
                'week' => "Minggu {$module->week_number}",
                'status' => $module->status,
                'ready_count' => collect($items)->where('ready', true)->count(),
                'items' => $items,
                'href' => route('admin.modules.index', ['program_id' => $module->program_pembelajaran_id]),
            ];
        })->values();
        $incompleteModules = $coverage->filter(fn (array $module) => $module['ready_count'] < 4)->count();

        return [
            'workspace' => 'content',
            'workspaceTitle' => 'Ruang Kerja Konten',
            'workspaceDescription' => 'Pastikan setiap minggu memiliki PPT, kosakata, flashcard, dan kuis sebelum dipublikasikan.',
            'stats' => [
                $this->stat('Modul dipublikasikan', (clone $modulesQuery)->where('status', 'published')->count(), 'module'),
                $this->stat('Minggu perlu dilengkapi', $incompleteModules, 'warning'),
                $this->stat('Kuis belum siap', (clone Kuis::query())->whereHas('module', fn (Builder $query) => $this->scopePrograms($query, $programIds))->whereDoesntHave('questions')->count(), 'quiz'),
                $this->stat('Kosakata siap pakai', (clone Kosakata::query())->when($programIds !== null, fn (Builder $query) => $query->whereHas('module', fn (Builder $module) => $module->whereIn('program_pembelajaran_id', $programIds)))->where('status', 'published')->count(), 'vocabulary'),
            ],
            'actionItems' => [
                $this->actionItem('Modul belum lengkap', $incompleteModules, 'Lengkapi komponen belajar sebelum status publish.', 'warning', route('admin.modules.index')),
                $this->actionItem('Kuis tanpa soal', (clone Kuis::query())->whereHas('module', fn (Builder $query) => $this->scopePrograms($query, $programIds))->whereDoesntHave('questions')->count(), 'Masuk ke roadmap kelas untuk menambahkan soal.', 'danger', route('admin.programs.index')),
                $this->actionItem('Presentasi belum publish', (clone $modulesQuery)->whereDoesntHave('presentationDecks', fn (Builder $query) => $query->where('status', 'published'))->count(), 'Buka kelas dan lengkapi presentasi pada Week terkait.', 'info', route('admin.programs.index')),
            ],
            'coverage' => $coverage,
        ];
    }

    /** @param Collection<int, int>|null $programIds */
    private function attemptsInPrograms(Builder $studentIds, ?Collection $programIds): Builder
    {
        return PengerjaanKuis::query()
            ->whereIn('user_id', clone $studentIds)
            ->when($programIds !== null, fn (Builder $query) => $query
                ->whereHas('quiz.module', fn (Builder $module) => $module->whereIn('program_pembelajaran_id', $programIds)));
    }

    /** @param Collection<int, int>|null $programIds */
    private function progressInPrograms(Builder $studentIds, ?Collection $programIds): Builder
    {
        return Progres::query()
            ->whereIn('user_id', clone $studentIds)
            ->when($programIds !== null, fn (Builder $query) => $query
                ->whereHas('module', fn (Builder $module) => $module->whereIn('program_pembelajaran_id', $programIds)));
    }

    /** @param Collection<int, int>|null $programIds */
    private function scopePrograms(Builder $query, ?Collection $programIds): Builder
    {
        return $programIds === null ? $query : $query->whereIn('program_pembelajaran_id', $programIds);
    }

    private function managedKloterIds(Pengguna $admin, $selectedKloter, KloterBelajarService $service): Collection
    {
        return $selectedKloter
            ? collect([$selectedKloter->id])
            : $service->kloterDikelola($admin)->pluck('id');
    }

    /** @return array{title:string,value:string,icon:string} */
    private function stat(string $title, int|float|string $value, string $icon): array
    {
        return compact('title', 'value', 'icon');
    }

    /** @return array{label:string,value:int,description:string,tone:string,href:string} */
    private function actionItem(string $label, int $value, string $description, string $tone, string $href): array
    {
        return compact('label', 'value', 'description', 'tone', 'href');
    }
}
