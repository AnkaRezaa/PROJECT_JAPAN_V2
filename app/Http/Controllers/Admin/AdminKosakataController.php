<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\HariModul;
use App\Models\Kosakata;
use App\Models\Modul;
use App\Models\ProgramPembelajaran;
use App\Services\ImportSpreadsheetService;
use App\Services\NotifikasiPenggunaService;
use App\Services\SoalKuisService;
use App\Services\TemplateExcelService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class AdminKosakataController extends Controller
{
    public function picker(Request $request, SoalKuisService $questions)
    {
        $validated = $request->validate([
            'module_id' => ['required', 'integer', 'exists:modules,id'],
            'module_day_id' => [
                'nullable',
                'integer',
                Rule::exists('module_days', 'id')
                    ->where('module_id', $request->integer('module_id')),
            ],
            'search' => ['nullable', 'string', 'max:100'],
        ]);

        $items = Kosakata::query()
            ->where(function ($query) use ($validated) {
                $query->whereNull('module_id')->orWhere('module_id', $validated['module_id']);
            })
            ->when($validated['search'] ?? null, function ($query, $search) {
                $query->where(function ($query) use ($search) {
                    $query->where('word', 'like', "%{$search}%")
                        ->orWhere('reading', 'like', "%{$search}%")
                        ->orWhere('meaning_id', 'like', "%{$search}%")
                        ->orWhere('meaning_en', 'like', "%{$search}%");
                });
            })
            ->orderByRaw("case when status = 'published' then 0 else 1 end")
            ->latest('id')
            ->limit(30)
            ->get(['id', 'content_type', 'word', 'reading', 'meaning_id', 'meaning_en'])
            ->map(fn (Kosakata $item) => [
                ...$item->toArray(),
                'writing_characters' => $questions->writingCharacters($item->word, (string) $item->reading),
            ])
            ->filter(fn (array $item) => $item['writing_characters'] !== [])
            ->values();

        return response()->json(['data' => $items]);
    }

    public function index(Request $request)
    {
        $query = Kosakata::with([
            'module:id,program_pembelajaran_id,title,week_number',
            'days:id,module_id,day_number,title',
        ])->latest();

        if ($request->filled('search')) {
            $search = $request->string('search')->toString();
            $query->where(function ($query) use ($search) {
                $query->where('word', 'like', "%{$search}%")
                    ->orWhere('reading', 'like', "%{$search}%")
                    ->orWhere('meaning_id', 'like', "%{$search}%")
                    ->orWhere('meaning_en', 'like', "%{$search}%")
                    ->orWhere('category', 'like', "%{$search}%")
                    ->orWhere('source_title', 'like', "%{$search}%");
            });
        }

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->filled('content_type') && $request->content_type !== 'all') {
            $query->where('content_type', $request->content_type);
        }

        if ($request->filled('module_id') && $request->module_id !== 'all') {
            $query->where('module_id', $request->integer('module_id'));
        }

        if ($request->filled('module_day_id') && $request->module_day_id !== 'all') {
            $query->whereHas('days', fn ($dayQuery) => $dayQuery->whereKey($request->integer('module_day_id')));
        }

        if ($request->filled('program_id')) {
            $query->whereHas('module', fn ($moduleQuery) => $moduleQuery
                ->where('program_pembelajaran_id', $request->integer('program_id')));
        }

        if ($request->filled('jlpt_level') && $request->jlpt_level !== 'all') {
            $query->where('jlpt_level', $request->jlpt_level);
        }

        return Inertia::render('Admin/Kosakata/Kosakata', [
            'vocabulary' => $query->paginate(12)->withQueryString(),
            'filters' => $request->only('search', 'status', 'jlpt_level', 'content_type', 'program_id', 'module_id', 'module_day_id'),
            'programs' => ProgramPembelajaran::with(['level:id,level_name', 'curriculumTrack:id,code,name'])
                ->orderBy('sort_order')
                ->orderBy('id')
                ->get()
                ->map(fn (ProgramPembelajaran $program) => [
                    'id' => $program->id,
                    'title' => $program->title,
                    'status' => $program->status,
                    'level' => $program->level?->level_name,
                    'curriculum_track' => $program->curriculumTrack?->name,
                ]),
            'modules' => Modul::with([
                'programPembelajaran:id,title',
                'days:id,module_id,day_number,title,status',
            ])
                ->when($request->filled('program_id'), fn ($moduleQuery) => $moduleQuery
                    ->where('program_pembelajaran_id', $request->integer('program_id')))
                ->orderBy('program_pembelajaran_id')
                ->orderBy('week_number')
                ->get(['id', 'program_pembelajaran_id', 'title', 'week_number']),
            'importModules' => Modul::with('days:id,module_id,day_number,title,status')
                ->orderBy('program_pembelajaran_id')
                ->orderBy('week_number')
                ->get(['id', 'program_pembelajaran_id', 'title', 'week_number']),
            'contentTypes' => Kosakata::contentTypes(),
            'availableLevels' => Kosakata::query()
                ->whereNotNull('jlpt_level')
                ->distinct()
                ->orderBy('jlpt_level')
                ->pluck('jlpt_level')
                ->values(),
            'program' => $request->filled('program_id')
                ? ProgramPembelajaran::with(['level:id,level_name', 'curriculumTrack:id,code,name'])
                    ->find($request->integer('program_id'))
                : null,
        ]);
    }

    public function store(Request $request, NotifikasiPenggunaService $notifikasi)
    {
        $validated = $this->validateVocabulary($request);
        $dayIds = $validated['module_day_ids'] ?? [];
        unset($validated['module_day_ids']);
        $content = Kosakata::create($validated);
        $content->days()->sync($dayIds);

        if ($content->status === 'published') {
            $this->kirimNotifikasiKosakataTerbit($content, $notifikasi);
        }

        return redirect()->back()->with('success', 'Konten berhasil ditambahkan.');
    }

    public function update(Request $request, Kosakata $vocabulary, NotifikasiPenggunaService $notifikasi)
    {
        $oldStatus = $vocabulary->status;
        $validated = $this->validateVocabulary($request, $vocabulary);
        $dayIds = $validated['module_day_ids'] ?? [];
        unset($validated['module_day_ids']);
        $vocabulary->update($validated);
        $vocabulary->days()->sync($dayIds);
        $this->syncLinkedFlashcards($vocabulary);

        if ($oldStatus !== 'published' && $vocabulary->status === 'published') {
            $this->kirimNotifikasiKosakataTerbit($vocabulary, $notifikasi);
        }

        return redirect()->back()->with('success', 'Konten berhasil diperbarui.');
    }

    public function destroy(Kosakata $vocabulary)
    {
        $vocabulary->delete();

        return redirect()->back()->with('success', 'Konten berhasil dihapus.');
    }

    public function import(Request $request, ImportSpreadsheetService $spreadsheets)
    {
        $validated = $request->validate([
            'import_file' => ['required', 'file', 'max:4096'],
            'content_type' => ['nullable', Rule::in(Kosakata::contentTypes())],
            'program_id' => ['required', 'integer', 'exists:program_pembelajaran,id'],
            'module_id' => [
                'required',
                'integer',
                Rule::exists('modules', 'id')->where('program_pembelajaran_id', $request->integer('program_id')),
            ],
            'module_day_id' => [
                'nullable',
                'integer',
                Rule::exists('module_days', 'id')->where('module_id', $request->integer('module_id')),
            ],
            'source_type' => ['nullable', 'string', 'max:30'],
            'source_title' => ['nullable', 'string', 'max:255'],
        ]);

        $file = $validated['import_file'];
        $extension = strtolower($file->getClientOriginalExtension());

        if (! in_array($extension, ['csv', 'txt', 'xlsx'], true)) {
            return redirect()->back()->withErrors(['import_file' => 'Gunakan CSV atau XLSX untuk import Bank Konten.']);
        }

        $rows = $spreadsheets->rows($file->getRealPath(), $extension);

        if (empty($rows)) {
            return redirect()->back()->withErrors(['import_file' => 'File kosong atau header tidak valid.']);
        }

        $created = DB::transaction(function () use ($rows, $validated, $extension, $file) {
            $imported = 0;

            foreach ($rows as $data) {
                $this->assertImportScope($data, $validated);
                $contentType = $this->normalizeContentType($data['content_type'] ?? $data['tipe_konten'] ?? $validated['content_type'] ?? Kosakata::TYPE_KOSAKATA);
                $word = trim((string) ($data['main_text'] ?? $data['word'] ?? $data['kata'] ?? $data['kanji'] ?? $data['pattern'] ?? $data['pola'] ?? ''));

                if ($word === '') {
                    continue;
                }

                $reading = $data['reading'] ?? $data['kana'] ?? $data['onyomi'] ?? $data['struktur'] ?? null;
                $moduleId = $this->resolveModuleId($data, $validated['module_id']);

                $content = Kosakata::updateOrCreate(
                    [
                        'word' => $word,
                        'reading' => $reading,
                    ],
                    [
                        'content_type' => $contentType,
                        'module_id' => $moduleId,
                        'meaning_id' => $data['meaning_id'] ?? $data['arti_indonesia'] ?? $data['arti'] ?? null,
                        'meaning_en' => $data['meaning_en'] ?? $data['english'] ?? null,
                        'jlpt_level' => $this->resolvedJlptLevel(
                            $moduleId,
                            $data['jlpt_level'] ?? null
                        ),
                        'category' => $data['category'] ?? $data['kategori'] ?? null,
                        'tags' => ! empty($data['tags']) ? preg_split('/\s*\|\s*/', $data['tags']) : null,
                        'example_sentence' => $data['example_sentence'] ?? $data['contoh_kalimat'] ?? null,
                        'example_reading' => $data['example_reading'] ?? $data['reading_contoh'] ?? null,
                        'example_meaning' => $data['example_meaning'] ?? $data['arti_contoh'] ?? null,
                        'audio_url' => $data['audio_url'] ?? null,
                        'source_type' => $data['source_type'] ?? $validated['source_type'] ?? $extension,
                        'source_title' => $data['source_title'] ?? $validated['source_title'] ?? $file->getClientOriginalName(),
                        'metadata' => $this->metadataFromImportRow($data, $contentType),
                        'status' => $data['status'] ?? 'draft',
                    ]
                );

                if (filled($validated['module_day_id'] ?? null)) {
                    $content->days()->syncWithoutDetaching([(int) $validated['module_day_id']]);
                }

                $this->syncLinkedFlashcards($content);
                $imported++;
            }

            return $imported;
        });

        return redirect()->back()->with('success', "{$created} konten berhasil diimport.");
    }

    public function template(Request $request, TemplateExcelService $templates, ?string $format = 'xlsx')
    {
        $format = strtolower($format ?: 'xlsx');

        if (! in_array($format, ['csv', 'xlsx'], true)) {
            abort(404);
        }

        $program = ProgramPembelajaran::with(['level:id,level_name', 'curriculumTrack:id,code,name'])
            ->find($request->integer('program_id'));
        $level = $program?->curriculumTrack?->code === 'jlpt'
            ? $this->normalizeJlptLevel($program->level?->level_name)
            : null;
        $headers = $this->importHeaders();
        $rows = $this->templateRows($level);
        $slug = str($program?->slug ?: 'umum')->slug()->toString();
        $filename = "japanlingo-bank-konten-{$slug}.{$format}";

        if ($format === 'csv') {
            return $templates->csvResponse($headers, $rows, $filename);
        }

        $path = $templates->xlsxPath($headers, $rows, 'Bank Konten', 'japanlingo_bank_konten_template_');

        return response()
            ->download($path, $filename, [
                'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            ])
            ->deleteFileAfterSend(true);
    }

    private function validateVocabulary(Request $request, ?Kosakata $vocabulary = null): array
    {
        $validated = $request->validate([
            'word' => [
                'required',
                'string',
                'max:255',
                Rule::unique('vocabulary_bank', 'word')
                    ->where(fn ($query) => $query->where('reading', $request->input('reading')))
                    ->ignore($vocabulary?->id),
            ],
            'content_type' => ['required', Rule::in(Kosakata::contentTypes())],
            'module_id' => ['nullable', 'integer', 'exists:modules,id'],
            'module_day_ids' => ['nullable', 'array'],
            'module_day_ids.*' => [
                'integer',
                Rule::exists('module_days', 'id')->where('module_id', $request->integer('module_id')),
            ],
            'reading' => ['nullable', 'string', 'max:255'],
            'meaning_id' => ['nullable', 'string'],
            'meaning_en' => ['nullable', 'string'],
            'jlpt_level' => ['nullable', 'string', 'max:8'],
            'category' => ['nullable', 'string', 'max:100'],
            'tags' => ['nullable', 'array'],
            'tags.*' => ['nullable', 'string', 'max:50'],
            'example_sentence' => ['nullable', 'string'],
            'example_reading' => ['nullable', 'string'],
            'example_meaning' => ['nullable', 'string'],
            'audio_url' => ['nullable', 'string', 'max:2048'],
            'source_type' => ['nullable', 'string', 'max:30'],
            'source_title' => ['nullable', 'string', 'max:255'],
            'metadata' => ['nullable', 'array'],
            'metadata.content_type' => ['nullable', Rule::in(Kosakata::contentTypes())],
            'metadata.onyomi' => ['nullable', 'string'],
            'metadata.kunyomi' => ['nullable', 'string'],
            'metadata.radicals' => ['nullable', 'array'],
            'metadata.radicals.*' => ['nullable', 'string', 'max:50'],
            'metadata.stroke_count' => ['nullable', 'integer', 'min:1', 'max:64'],
            'metadata.notes' => ['nullable', 'string'],
            'status' => ['required', 'in:draft,published'],
        ]);

        $validated['jlpt_level'] = $this->resolvedJlptLevel(
            isset($validated['module_id']) ? (int) $validated['module_id'] : null,
            $validated['jlpt_level'] ?? null
        );

        return $validated;
    }

    private function kirimNotifikasiKosakataTerbit(Kosakata $vocabulary, NotifikasiPenggunaService $notifikasi): void
    {
        $notifikasi->kirimKeSemuaPengguna(
            'new_vocabulary',
            'Konten baru tersedia',
            "{$vocabulary->word} sudah masuk ke Bank Konten.",
            route('user.kelas.index'),
            ['vocabulary_id' => $vocabulary->id]
        );
    }

    private function importHeaders(): array
    {
        return ['content_type', 'module_id', 'module_week', 'main_text', 'reading', 'meaning_id', 'meaning_en', 'jlpt_level', 'category', 'tags', 'example_sentence', 'example_reading', 'example_meaning', 'notes', 'onyomi', 'kunyomi', 'source_type', 'source_title', 'audio_url', 'status', 'day_number', 'radicals', 'stroke_count'];
    }

    private function templateRows(?string $level = null): array
    {
        $rows = [
            ['kosakata', '', 1, '会議', 'かいぎ', 'rapat', 'meeting', $level, 'pekerjaan', 'work|office', '今日は一時から会議があります。', 'きょうはいちじからかいぎがあります。', 'Hari ini ada rapat mulai jam satu.', '', '', '', 'xlsx', 'Sumber materi', '', 'draft'],
            ['kanji', '', 1, '割', 'わり', 'membagi, diskon', 'divide, discount', $level, 'belanja', 'kanji|shopping', '割引があります。', 'わりびきがあります。', 'Ada diskon.', 'Contoh kata: 割引', 'カツ', 'わ.る', 'xlsx', 'Sumber materi', '', 'draft'],
            ['bunpo', '', 1, '〜ように', 'Vる/ない + ように', 'agar, supaya', 'so that', $level, 'grammar', 'bunpo|pattern', '忘れないようにメモします。', 'わすれないようにメモします。', 'Saya mencatat supaya tidak lupa.', 'Pakai untuk tujuan atau harapan.', '', '', 'xlsx', 'Sumber materi', '', 'draft'],
        ];

        return array_map(fn (array $row) => [...$row, '', '', ''], $rows);
    }

    private function resolvedJlptLevel(?int $moduleId, mixed $value): ?string
    {
        if (! $moduleId) {
            return filled($value) ? $this->normalizeJlptLevel((string) $value) : null;
        }

        $module = Modul::with(['programPembelajaran.curriculumTrack', 'programPembelajaran.level'])->find($moduleId);
        $program = $module?->programPembelajaran;

        if ($program?->curriculumTrack?->code !== 'jlpt') {
            return null;
        }

        $expected = $this->normalizeJlptLevel($program->level?->level_name);
        $given = filled($value) ? $this->normalizeJlptLevel((string) $value) : $expected;

        if (! $expected || $given !== $expected) {
            throw ValidationException::withMessages([
                'jlpt_level' => 'Level konten harus sama dengan level kelas tujuan.',
            ]);
        }

        return $expected;
    }

    private function normalizeJlptLevel(?string $value): ?string
    {
        return preg_match('/N[1-5]/i', (string) $value, $matches)
            ? strtoupper($matches[0])
            : null;
    }

    private function normalizeContentType(?string $type): string
    {
        $type = str($type)->lower()->trim()->toString();

        return in_array($type, Kosakata::contentTypes(), true)
            ? $type
            : Kosakata::TYPE_KOSAKATA;
    }

    private function resolveModuleId(array $row, ?int $fallback): ?int
    {
        if (! empty($row['module_id']) && is_numeric($row['module_id'])) {
            $moduleId = (int) $row['module_id'];

            if (! Modul::whereKey($moduleId)->exists()) {
                throw ValidationException::withMessages([
                    'import_file' => "Module ID {$moduleId} tidak ditemukan.",
                ]);
            }

            if ($fallback && $moduleId !== $fallback) {
                throw ValidationException::withMessages([
                    'import_file' => "Module ID {$moduleId} tidak sesuai dengan Week yang dipilih.",
                ]);
            }

            return $moduleId;
        }

        if (! empty($row['module_week']) && is_numeric($row['module_week'])) {
            if (! $fallback) {
                throw ValidationException::withMessages([
                    'import_file' => 'Pilih Week tujuan sebelum mengimport file yang memiliki module_week.',
                ]);
            }

            $fallbackWeek = Modul::whereKey($fallback)->value('week_number');
            if ((int) $row['module_week'] !== (int) $fallbackWeek) {
                throw ValidationException::withMessages([
                    'import_file' => "Week {$row['module_week']} di file tidak sesuai dengan Week {$fallbackWeek} yang dipilih.",
                ]);
            }
        }

        return $fallback;
    }

    private function assertImportScope(array $row, array $validated): void
    {
        $dayNumber = $row['day_number'] ?? $row['module_day'] ?? null;

        if (! filled($dayNumber)) {
            return;
        }

        $dayId = $validated['module_day_id'] ?? null;
        if (! $dayId) {
            throw ValidationException::withMessages([
                'import_file' => 'Pilih Day tujuan sebelum mengimport file yang memiliki day_number.',
            ]);
        }

        $selectedDay = HariModul::whereKey($dayId)->value('day_number');
        if ((int) $dayNumber !== (int) $selectedDay) {
            throw ValidationException::withMessages([
                'import_file' => "Day {$dayNumber} di file tidak sesuai dengan Day {$selectedDay} yang dipilih.",
            ]);
        }
    }

    private function metadataFromImportRow(array $row, string $contentType): array
    {
        return array_filter([
            'content_type' => $contentType,
            'notes' => $row['notes'] ?? $row['catatan'] ?? null,
            'onyomi' => $row['onyomi'] ?? null,
            'kunyomi' => $row['kunyomi'] ?? null,
            'radicals' => filled($row['radicals'] ?? $row['radical'] ?? null)
                ? array_values(array_filter(preg_split('/\s*\|\s*/', (string) ($row['radicals'] ?? $row['radical']))))
                : null,
            'stroke_count' => filled($row['stroke_count'] ?? null)
                ? max(1, (int) $row['stroke_count'])
                : null,
            'source_page' => $row['source_page'] ?? $row['halaman'] ?? null,
            'source_day' => $row['source_day'] ?? $row['hari'] ?? null,
        ], fn ($value) => $value !== null && $value !== '');
    }

    private function syncLinkedFlashcards(Kosakata $vocabulary): void
    {
        $vocabulary->flashcards()->update([
            'front_text' => $vocabulary->word,
            'reading' => $vocabulary->reading,
            'back_text' => $vocabulary->meaning_id ?: $vocabulary->meaning_en,
            'hint' => $vocabulary->category,
            'example_sentence' => $vocabulary->example_sentence,
            'example_meaning' => $vocabulary->example_meaning,
            'audio_url' => $vocabulary->audio_url,
        ]);
    }
}
