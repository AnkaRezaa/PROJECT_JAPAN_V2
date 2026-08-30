<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Kosakata;
use App\Models\Kuis;
use App\Models\SetFlashcard;
use App\Models\Soal;
use App\Services\ImportSpreadsheetService;
use App\Services\NotifikasiPenggunaService;
use App\Services\TemplateExcelService;
use App\Services\KloterBelajarService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class AdminFlashcardController extends Controller
{
    public function __construct(private readonly KloterBelajarService $kloterService)
    {
    }

    public function store(Request $request, NotifikasiPenggunaService $notifikasi)
    {
        $validated = $this->validateSet($request);
        $this->kloterService->abortJikaModulDiLuarCakupan($request->user(), (int) $validated['module_id']);
        $set = SetFlashcard::create($validated + ['source_type' => 'vocabulary']);

        if ($set->status === 'published') {
            $this->kirimNotifikasiFlashcardTerbit($set, $notifikasi);
        }

        return redirect()->route('admin.flashcards.builder', $set)->with('success', 'Flashcard set berhasil dibuat.');
    }

    public function update(Request $request, SetFlashcard $flashcardSet, NotifikasiPenggunaService $notifikasi)
    {
        $this->kloterService->abortJikaModulDiLuarCakupan($request->user(), (int) $flashcardSet->module_id);
        $oldStatus = $flashcardSet->status;
        $flashcardSet->update($this->validateSet($request));

        if ($oldStatus !== 'published' && $flashcardSet->status === 'published') {
            $this->kirimNotifikasiFlashcardTerbit($flashcardSet, $notifikasi);
        }

        return redirect()->back()->with('success', 'Flashcard set berhasil diperbarui.');
    }

    public function destroy(Request $request, SetFlashcard $flashcardSet)
    {
        $this->kloterService->abortJikaModulDiLuarCakupan($request->user(), (int) $flashcardSet->module_id);
        $module = $flashcardSet->module()->first(['id', 'program_pembelajaran_id']);
        $dayId = $flashcardSet->module_day_id;
        $flashcardSet->delete();

        return $module
            ? redirect()->route('admin.modules.index', [
                'program_id' => $module->program_pembelajaran_id,
                'week_id' => $module->id,
                'day_id' => $dayId,
                'focus' => 'roadmap',
            ])->with('success', 'Flashcard set berhasil dihapus.')
            : redirect()->route('admin.programs.index')->with('success', 'Flashcard set berhasil dihapus.');
    }

    public function builder(SetFlashcard $flashcardSet, Request $request)
    {
        $this->kloterService->abortJikaModulDiLuarCakupan($request->user(), (int) $flashcardSet->module_id);
        $flashcardSet->load([
            'level:id,level_name',
            'module:id,program_pembelajaran_id,title,week_number,level_id',
            'module.level:id,level_name',
            'module.programPembelajaran:id,curriculum_track_id,level_id,title',
            'module.programPembelajaran.curriculumTrack:id,code,name',
            'day:id,module_id,day_number,title',
            'flashcards.vocabulary',
        ]);

        $vocabularyQuery = Kosakata::query()
            ->where(function ($query) use ($flashcardSet) {
                $query->whereNull('module_id')
                    ->orWhere('module_id', $flashcardSet->module_id);
            })
            ->orderBy('word');

        if ($request->filled('search')) {
            $search = $request->string('search')->toString();
            $vocabularyQuery->where(function ($query) use ($search) {
                $query->where('word', 'like', "%{$search}%")
                    ->orWhere('reading', 'like', "%{$search}%")
                    ->orWhere('meaning_id', 'like', "%{$search}%")
                    ->orWhere('category', 'like', "%{$search}%");
            });
        }

        if ($request->filled('status') && $request->status !== 'all') {
            $vocabularyQuery->where('status', $request->status);
        }

        if ($request->filled('content_type') && $request->content_type !== 'all') {
            $vocabularyQuery->where('content_type', $request->content_type);
        }

        return Inertia::render('Admin/Flashcard/BuilderFlashcard', [
            'set' => $flashcardSet,
            'vocabulary' => $vocabularyQuery->paginate(12)->withQueryString(),
            'filters' => $request->only('search', 'status', 'content_type'),
            'quizzes' => Kuis::with('module:id,title,week_number')
                ->where('module_id', $flashcardSet->module_id)
                ->where('module_day_id', $flashcardSet->module_day_id)
                ->orderByDesc('id')
                ->get(['id', 'module_id', 'module_day_id', 'type', 'status']),
        ]);
    }

    public function updateCards(Request $request, SetFlashcard $flashcardSet, NotifikasiPenggunaService $notifikasi)
    {
        $validated = $request->validate([
            'status' => ['required', 'in:draft,published'],
            'cards' => ['present', 'array'],
            'cards.*.id' => ['nullable', 'integer'],
            'cards.*.vocabulary_id' => [
                'nullable',
                'integer',
                Rule::exists('vocabulary_bank', 'id')->where(
                    fn ($query) => $query
                        ->whereNull('module_id')
                        ->orWhere('module_id', $flashcardSet->module_id)
                ),
            ],
            'cards.*.front_text' => ['required', 'string', 'max:255'],
            'cards.*.reading' => ['nullable', 'string', 'max:255'],
            'cards.*.back_text' => ['nullable', 'string'],
            'cards.*.hint' => ['nullable', 'string'],
            'cards.*.example_sentence' => ['nullable', 'string'],
            'cards.*.example_reading' => ['nullable', 'string'],
            'cards.*.example_meaning' => ['nullable', 'string'],
            'cards.*.audio_url' => ['nullable', 'string', 'max:2048'],
            'cards.*.content_type' => ['nullable', Rule::in(Kosakata::contentTypes())],
            'cards.*.meaning_en' => ['nullable', 'string'],
            'cards.*.jlpt_level' => ['nullable', 'string', 'max:8'],
            'cards.*.onyomi' => ['nullable', 'string'],
            'cards.*.kunyomi' => ['nullable', 'string'],
            'cards.*.radicals' => ['nullable', 'array'],
            'cards.*.radicals.*' => ['nullable', 'string', 'max:50'],
            'cards.*.stroke_count' => ['nullable', 'integer', 'min:1', 'max:64'],
            'cards.*.notes' => ['nullable', 'string'],
        ]);

        $ids = [];
        $oldStatus = $flashcardSet->status;

        DB::transaction(function () use ($flashcardSet, $validated, &$ids) {
            $flashcardSet->update(['status' => $validated['status']]);

            foreach ($validated['cards'] as $index => $card) {
                $vocabulary = $this->syncVocabulary($card, $flashcardSet);
                $model = $flashcardSet->flashcards()->updateOrCreate(
                    ['id' => $card['id'] ?? null],
                    [
                        'vocabulary_id' => $vocabulary->id,
                        ...$this->flashcardAttributes($vocabulary),
                        'order' => $index,
                    ]
                );

                $ids[] = $model->id;
            }

            $flashcardSet->flashcards()->whereNotIn('id', $ids)->delete();
        });

        if ($oldStatus !== 'published' && $flashcardSet->fresh()->status === 'published') {
            $this->kirimNotifikasiFlashcardTerbit($flashcardSet, $notifikasi);
        }

        return redirect()->back()->with('success', 'Flashcard berhasil disimpan.');
    }

    public function importCards(
        Request $request,
        SetFlashcard $flashcardSet,
        ImportSpreadsheetService $spreadsheets
    ) {
        $validated = $request->validate([
            'import_file' => ['required', 'file', 'max:4096'],
        ]);

        $file = $validated['import_file'];
        $extension = strtolower($file->getClientOriginalExtension());

        if (! in_array($extension, ['csv', 'txt', 'xlsx'], true)) {
            return redirect()->back()->withErrors(['import_file' => 'Gunakan CSV atau XLSX untuk import flashcard.']);
        }

        $rows = $spreadsheets->rows($file->getRealPath(), $extension);

        if (empty($rows)) {
            return redirect()->back()->withErrors(['import_file' => 'File kosong atau header tidak valid.']);
        }

        $flashcardSet->loadMissing([
            'module:id,program_pembelajaran_id,week_number',
            'module.programPembelajaran:id,level_id,curriculum_track_id',
            'module.programPembelajaran.level:id,level_name',
            'module.programPembelajaran.curriculumTrack:id,code,name',
            'day:id,module_id,day_number',
        ]);
        abort_unless(
            $flashcardSet->module
            && $flashcardSet->day
            && (int) $flashcardSet->day->module_id === (int) $flashcardSet->module_id,
            422,
            'Flashcard set belum memiliki konteks Week dan Day yang valid.'
        );

        $nextOrder = (int) $flashcardSet->flashcards()->max('order') + 1;
        $processed = 0;

        DB::transaction(function () use ($flashcardSet, $rows, $nextOrder, &$processed) {
            foreach ($rows as $index => $row) {
                $this->assertImportScope($row, $flashcardSet, $index + 2);
                $frontText = trim((string) ($row['front_text'] ?? $row['word'] ?? $row['kata'] ?? ''));

                if ($frontText === '') {
                    continue;
                }

                $reading = trim((string) ($row['reading'] ?? $row['kana'] ?? ''));
                $vocabulary = $this->syncVocabulary([
                    'vocabulary_id' => $row['vocabulary_id'] ?? null,
                    'front_text' => $frontText,
                    'reading' => $reading,
                    'back_text' => $row['back_text'] ?? $row['meaning_id'] ?? $row['arti'] ?? null,
                    'meaning_en' => $row['meaning_en'] ?? $row['english'] ?? null,
                    'hint' => $row['hint'] ?? $row['category'] ?? $row['kategori'] ?? null,
                    'example_sentence' => $row['example_sentence'] ?? $row['contoh_kalimat'] ?? null,
                    'example_reading' => $row['example_reading'] ?? $row['reading_contoh'] ?? null,
                    'example_meaning' => $row['example_meaning'] ?? $row['arti_contoh'] ?? null,
                    'audio_url' => $row['audio_url'] ?? null,
                    'content_type' => $row['content_type'] ?? null,
                    'jlpt_level' => $row['jlpt_level'] ?? null,
                    'onyomi' => $row['onyomi'] ?? null,
                    'kunyomi' => $row['kunyomi'] ?? null,
                    'radicals' => $this->parseList($row['radicals'] ?? $row['radical'] ?? null),
                    'stroke_count' => $row['stroke_count'] ?? null,
                    'notes' => $row['notes'] ?? $row['catatan'] ?? null,
                ], $flashcardSet);

                $existing = $flashcardSet->flashcards()
                    ->where('vocabulary_id', $vocabulary->id)
                    ->first();
                $flashcardSet->flashcards()->updateOrCreate(
                    ['id' => $existing?->id],
                    [
                        'vocabulary_id' => $vocabulary->id,
                        ...$this->flashcardAttributes($vocabulary),
                        'order' => $existing?->order ?? ($nextOrder + $index),
                    ]
                );

                $processed++;
            }
        });

        if ($processed === 0) {
            return redirect()->back()->withErrors(['import_file' => 'Tidak ada kartu valid. Pastikan kolom front_text atau word terisi.']);
        }

        return redirect()->back()->with('success', "{$processed} flashcard berhasil disinkronkan dengan Bank Konten.");
    }

    public function downloadImportTemplate(
        SetFlashcard $flashcardSet,
        TemplateExcelService $templates,
        ?string $format = 'xlsx'
    ) {
        $format = strtolower($format ?: 'xlsx');

        if (! in_array($format, ['csv', 'xlsx'], true)) {
            abort(404);
        }

        $headers = $this->flashcardImportHeaders();
        $rows = $this->flashcardTemplateRows($flashcardSet);
        $filename = 'toku-up-flashcard-template.'.$format;

        if ($format === 'csv') {
            return $templates->csvResponse($headers, $rows, $filename);
        }

        $path = $templates->xlsxPath($headers, $rows, 'Flashcard Import', 'toku_up_flashcard_template_');

        return response()
            ->download($path, $filename, [
                'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            ])
            ->deleteFileAfterSend(true);
    }

    public function generateQuiz(Request $request, SetFlashcard $flashcardSet)
    {
        $validated = $request->validate([
            'quiz_id' => [
                'required',
                'integer',
                Rule::exists('quizzes', 'id')->where(
                    fn ($query) => $query
                        ->where('module_id', $flashcardSet->module_id)
                        ->where('module_day_id', $flashcardSet->module_day_id)
                ),
            ],
            'mode' => ['required', Rule::in(['word_to_meaning', 'meaning_to_word', 'reading_to_word'])],
            'count' => ['required', 'integer', 'min:1', 'max:50'],
        ]);

        $quiz = Kuis::query()
            ->where('module_id', $flashcardSet->module_id)
            ->where('module_day_id', $flashcardSet->module_day_id)
            ->findOrFail($validated['quiz_id']);
        $cards = $flashcardSet->flashcards()->whereNotNull('back_text')->inRandomOrder()->take($validated['count'])->get();

        if ($cards->count() < 2) {
            return redirect()->back()->withErrors(['generate' => 'Minimal butuh 2 kartu dengan arti untuk membuat soal pilihan ganda.']);
        }

        $nextOrder = (int) $quiz->questions()->max('order') + 1;

        DB::transaction(function () use ($quiz, $cards, $validated, $nextOrder) {
            foreach ($cards as $index => $card) {
                $question = $this->buildQuestion($card, $cards, $validated['mode']);

                Soal::create([
                    'quiz_id' => $quiz->id,
                    'type' => 'multiple_choice',
                    'question_text' => $question['question_text'],
                    'correct_answer' => $question['correct_answer'],
                    'options' => $question['options'],
                    'explanation' => $question['explanation'],
                    'order' => $nextOrder + $index,
                ]);
            }
        });

        return redirect()->back()->with('success', $cards->count().' soal berhasil dibuat dari flashcard.');
    }

    private function validateSet(Request $request): array
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'level_id' => ['nullable', 'integer', 'exists:levels,id'],
            'module_id' => ['required', 'integer', 'exists:modules,id'],
            'module_day_id' => [
                'required',
                'integer',
                Rule::exists('module_days', 'id')->where('module_id', $request->integer('module_id')),
            ],
            'status' => ['required', 'in:draft,published'],
        ]);

        return $validated;
    }

    private function kirimNotifikasiFlashcardTerbit(SetFlashcard $flashcardSet, NotifikasiPenggunaService $notifikasi): void
    {
        $flashcardSet->loadMissing('module.programPembelajaran');

        if (! $flashcardSet->module) {
            return;
        }

        $url = $flashcardSet->module->programPembelajaran
            ? route('user.modul.program', $flashcardSet->module->programPembelajaran->slug)
            : route('user.kelas.index');

        $notifikasi->kirimKePenggunaYangBisaAksesModul(
            $flashcardSet->module,
            'new_flashcard',
            'Flashcard baru tersedia',
            "{$flashcardSet->title} sudah bisa dipelajari.",
            $url,
            ['flashcard_set_id' => $flashcardSet->id, 'module_id' => $flashcardSet->module_id]
        );
    }

    private function buildQuestion($card, $pool, string $mode): array
    {
        if ($mode === 'meaning_to_word') {
            $correct = $card->front_text;
            $options = $this->options($correct, $pool->pluck('front_text')->all());

            return [
                'question_text' => 'Pilih kosakata Jepang untuk arti: '.$card->back_text,
                'correct_answer' => $correct,
                'options' => $options,
                'explanation' => trim(($card->front_text ?? '').' / '.($card->reading ?? '').' = '.($card->back_text ?? '')),
            ];
        }

        if ($mode === 'reading_to_word') {
            $correct = $card->front_text;
            $options = $this->options($correct, $pool->pluck('front_text')->all());

            return [
                'question_text' => 'Pilih kosakata untuk reading: '.($card->reading ?: $card->hint ?: $card->back_text),
                'correct_answer' => $correct,
                'options' => $options,
                'explanation' => trim(($card->front_text ?? '').' / '.($card->reading ?? '').' = '.($card->back_text ?? '')),
            ];
        }

        $correct = $card->back_text;
        $options = $this->options($correct, $pool->pluck('back_text')->filter()->all());

        return [
            'question_text' => 'Apa arti dari '.$card->front_text.($card->reading ? " ({$card->reading})" : '').'?',
            'correct_answer' => $correct,
            'options' => $options,
            'explanation' => trim(($card->front_text ?? '').' / '.($card->reading ?? '').' = '.($card->back_text ?? '')),
        ];
    }

    private function options(string $correct, array $pool): array
    {
        $options = collect($pool)
            ->filter(fn ($item) => trim((string) $item) !== '' && $item !== $correct)
            ->unique()
            ->shuffle()
            ->take(3)
            ->push($correct)
            ->shuffle()
            ->values()
            ->all();

        return count($options) >= 2 ? $options : [$correct];
    }

    private function syncVocabulary(array $data, SetFlashcard $flashcardSet): Kosakata
    {
        $frontText = trim((string) ($data['front_text'] ?? ''));
        $reading = trim((string) ($data['reading'] ?? ''));
        $vocabulary = null;

        if (! empty($data['vocabulary_id']) && is_numeric($data['vocabulary_id'])) {
            $vocabulary = Kosakata::query()
                ->whereKey((int) $data['vocabulary_id'])
                ->where(function ($query) use ($flashcardSet) {
                    $query->whereNull('module_id')
                        ->orWhere('module_id', $flashcardSet->module_id);
                })
                ->first();

            if (! $vocabulary) {
                throw ValidationException::withMessages([
                    'cards' => "Vocabulary ID {$data['vocabulary_id']} tidak berasal dari Week flashcard ini.",
                ]);
            }
        }

        $vocabulary ??= Kosakata::query()
            ->where('word', $frontText)
            ->where(function ($query) use ($flashcardSet) {
                $query->whereNull('module_id')
                    ->orWhere('module_id', $flashcardSet->module_id);
            })
            ->when(
                $reading !== '',
                fn ($query) => $query->where('reading', $reading),
                fn ($query) => $query->whereNull('reading')
            )
            ->first();

        // word + reading is globally unique; reuse the canonical bank record
        // when the same item was already introduced by another Week.
        $vocabulary ??= Kosakata::query()
            ->where('word', $frontText)
            ->when(
                $reading !== '',
                fn ($query) => $query->where('reading', $reading),
                fn ($query) => $query->whereNull('reading')
            )
            ->first();

        $metadata = array_replace($vocabulary?->metadata ?? [], array_filter([
            'content_type' => $data['content_type'] ?? $vocabulary?->content_type,
            'notes' => $data['notes'] ?? null,
            'onyomi' => $data['onyomi'] ?? null,
            'kunyomi' => $data['kunyomi'] ?? null,
            'radicals' => $data['radicals'] ?? null,
            'stroke_count' => filled($data['stroke_count'] ?? null)
                ? max(1, (int) $data['stroke_count'])
                : null,
        ], fn ($value) => $value !== null && $value !== '' && $value !== []));
        $contentType = in_array($data['content_type'] ?? null, Kosakata::contentTypes(), true)
            ? $data['content_type']
            : ($vocabulary?->content_type ?? Kosakata::TYPE_KOSAKATA);
        $payload = [
            'content_type' => $contentType,
            'module_id' => $vocabulary?->module_id ?? $flashcardSet->module_id,
            'word' => $frontText,
            'reading' => $reading !== '' ? $reading : null,
            'meaning_id' => $data['back_text'] ?? $vocabulary?->meaning_id,
            'meaning_en' => $data['meaning_en'] ?? $vocabulary?->meaning_en,
            'jlpt_level' => $this->resolvedJlptLevel($flashcardSet, $data['jlpt_level'] ?? $vocabulary?->jlpt_level),
            'category' => $data['hint'] ?? $vocabulary?->category,
            'example_sentence' => $data['example_sentence'] ?? $vocabulary?->example_sentence,
            'example_reading' => $data['example_reading'] ?? $vocabulary?->example_reading,
            'example_meaning' => $data['example_meaning'] ?? $vocabulary?->example_meaning,
            'audio_url' => $data['audio_url'] ?? $vocabulary?->audio_url,
            'metadata' => $metadata ?: null,
            'status' => $vocabulary?->status ?? 'draft',
        ];

        if ($vocabulary) {
            $vocabulary->update($payload);
        } else {
            $vocabulary = Kosakata::create($payload);
        }

        if ($flashcardSet->module_day_id) {
            $vocabulary->days()->syncWithoutDetaching([
                (int) $flashcardSet->module_day_id => [
                    'sort_order' => (int) ($flashcardSet->flashcards()->max('order') ?? 0),
                ],
            ]);
        }

        return $vocabulary->refresh();
    }

    private function flashcardAttributes(Kosakata $vocabulary): array
    {
        return [
            'front_text' => $vocabulary->word,
            'reading' => $vocabulary->reading,
            'back_text' => $vocabulary->meaning_id ?: $vocabulary->meaning_en,
            'hint' => $vocabulary->category,
            'example_sentence' => $vocabulary->example_sentence,
            'example_meaning' => $vocabulary->example_meaning,
            'audio_url' => $vocabulary->audio_url,
        ];
    }

    private function assertImportScope(array $row, SetFlashcard $flashcardSet, int $rowNumber): void
    {
        $week = $row['module_week'] ?? $row['week_number'] ?? null;
        $day = $row['day_number'] ?? $row['module_day'] ?? null;

        if (filled($week) && (int) $week !== (int) $flashcardSet->module?->week_number) {
            throw ValidationException::withMessages([
                'import_file' => "Baris {$rowNumber}: Week {$week} tidak sesuai dengan Week {$flashcardSet->module?->week_number}.",
            ]);
        }

        if (filled($day) && (int) $day !== (int) $flashcardSet->day?->day_number) {
            throw ValidationException::withMessages([
                'import_file' => "Baris {$rowNumber}: Day {$day} tidak sesuai dengan Day {$flashcardSet->day?->day_number}.",
            ]);
        }
    }

    private function parseList(mixed $value): array
    {
        if (is_array($value)) {
            return array_values(array_filter(array_map('trim', $value)));
        }

        return filled($value)
            ? array_values(array_filter(preg_split('/\s*\|\s*/', (string) $value)))
            : [];
    }

    private function flashcardImportHeaders(): array
    {
        return [
            'module_week',
            'day_number',
            'vocabulary_id',
            'front_text',
            'reading',
            'back_text',
            'meaning_en',
            'hint',
            'example_sentence',
            'example_reading',
            'example_meaning',
            'audio_url',
            'content_type',
            'jlpt_level',
            'onyomi',
            'kunyomi',
            'radicals',
            'stroke_count',
            'notes',
        ];
    }

    private function flashcardTemplateRows(SetFlashcard $flashcardSet): array
    {
        $flashcardSet->loadMissing([
            'module:id,program_pembelajaran_id,week_number',
            'module.programPembelajaran:id,level_id,curriculum_track_id',
            'module.programPembelajaran.level:id,level_name',
            'module.programPembelajaran.curriculumTrack:id,code,name',
            'day:id,day_number',
        ]);
        $week = $flashcardSet->module?->week_number;
        $day = $flashcardSet->day?->day_number;
        $level = $this->resolvedJlptLevel($flashcardSet, null);
        $rows = [
            ['', '会議', 'かいぎ', 'rapat', 'noun / kantor', '今日は一時から会議があります。', 'Hari ini ada rapat mulai jam satu.', ''],
            ['', '一つ', 'ひとつ', 'satu buah', 'counter', '机の上にりんごが一つあります。', 'Ada satu apel di atas meja.', ''],
        ];

        return array_map(
            fn (array $row) => [
                $week,
                $day,
                $row[0],
                $row[1],
                $row[2],
                $row[3],
                '',
                $row[4],
                $row[5],
                '',
                $row[6],
                $row[7],
                'kosakata',
                $level,
                '',
                '',
                '',
                '',
                '',
            ],
            $rows
        );
    }

    private function resolvedJlptLevel(SetFlashcard $flashcardSet, mixed $value): ?string
    {
        $flashcardSet->loadMissing([
            'module.programPembelajaran.level:id,level_name',
            'module.programPembelajaran.curriculumTrack:id,code,name',
        ]);
        $program = $flashcardSet->module?->programPembelajaran;

        if ($program?->curriculumTrack?->code !== 'jlpt') {
            return null;
        }

        preg_match('/N[1-5]/i', (string) $program->level?->level_name, $expectedMatch);
        preg_match('/N[1-5]/i', (string) $value, $givenMatch);
        $expected = isset($expectedMatch[0]) ? strtoupper($expectedMatch[0]) : null;
        $given = isset($givenMatch[0]) ? strtoupper($givenMatch[0]) : $expected;

        if (! $expected || $given !== $expected) {
            throw ValidationException::withMessages([
                'jlpt_level' => 'Level flashcard harus sama dengan level kelas tujuan.',
            ]);
        }

        return $expected;
    }
}
