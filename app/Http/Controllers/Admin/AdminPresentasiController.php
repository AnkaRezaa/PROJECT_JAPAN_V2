<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\DeckPresentasi;
use App\Models\LogAktivitas;
use App\Models\Modul;
use App\Models\Pengguna;
use App\Models\SlidePresentasi;
use App\Services\AksesPremiumService;
use App\Services\ImportPresentasiGambarService;
use App\Services\ImportPresentasiPdfService;
use App\Services\ImportPresentasiPptxService;
use App\Services\NotifikasiPenggunaService;
use App\Services\PresentasiStorageService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class AdminPresentasiController extends Controller
{
    public function store(Request $request, NotifikasiPenggunaService $notifikasi)
    {
        $validated = $this->validateDeck($request);
        $context = $request->validate([
            'audience_scope' => ['nullable', Rule::in([DeckPresentasi::AUDIENCE_SHARED, DeckPresentasi::AUDIENCE_MENTOR_SESSION])],
            'source_deck_id' => ['nullable', 'integer', 'exists:presentation_decks,id'],
            'return_context' => ['nullable', Rule::in(['live_class'])],
            'kloter_belajar_id' => ['nullable', 'integer', 'exists:kloter_belajar,id'],
        ]);
        $user = $request->user();
        $module = Modul::query()
            ->with('programPembelajaran:id')
            ->findOrFail($validated['module_id']);
        $audienceScope = $context['audience_scope'] ?? DeckPresentasi::AUDIENCE_SHARED;

        $this->assertCanCreateDeck($user, $module, $audienceScope);

        $sourceDeck = filled($context['source_deck_id'] ?? null)
            ? DeckPresentasi::query()->with('slides')->findOrFail($context['source_deck_id'])
            : null;

        if ($sourceDeck) {
            $this->assertCanViewDeck($user, $sourceDeck);
            abort_unless($sourceDeck->module_id === $module->id, 422, 'Presentasi sumber harus berasal dari Week yang dipilih.');
        }

        $validated['created_by'] = $user->id;
        $validated['audience_scope'] = $audienceScope;

        if ($audienceScope === DeckPresentasi::AUDIENCE_MENTOR_SESSION) {
            $validated['status'] = 'draft';
        }

        $deck = DB::transaction(function () use ($validated, $sourceDeck) {
            Modul::query()->lockForUpdate()->findOrFail($validated['module_id']);
            $slotQuery = DeckPresentasi::query()
                ->where('module_id', $validated['module_id'])
                ->where('audience_scope', $validated['audience_scope'])
                ->where('week_slot', $validated['week_slot'])
                ->when(
                    $validated['week_slot'] === 'after_day',
                    fn ($query) => $query->where('module_day_id', $validated['module_day_id']),
                    fn ($query) => $query->whereNull('module_day_id')
                );

            if (array_key_exists('sort_order', $validated) && $validated['sort_order'] !== null) {
                $validated['sort_order'] = max(0, (int) $validated['sort_order']);
                (clone $slotQuery)
                    ->where('sort_order', '>=', $validated['sort_order'])
                    ->increment('sort_order');
            } else {
                $validated['sort_order'] = ((int) (clone $slotQuery)->max('sort_order')) + 1;
            }

            $deck = DeckPresentasi::create($validated);
            if ($sourceDeck) {
                foreach ($sourceDeck->slides as $slide) {
                    $deck->slides()->create($slide->only([
                        'title', 'layout', 'content', 'media_url', 'background', 'accent_color',
                        'speaker_notes', 'order', 'source_type', 'canvas_json', 'jamboard_data',
                        'jamboard_snapshot', 'snapshot_url', 'source_meta',
                    ]));
                }
            } else {
                $deck->slides()->create([
                    'title' => $deck->title,
                    'layout' => 'title',
                    'content' => $deck->description ?: 'Tulis pembuka presentasi di sini.',
                    'background' => 'sunrise',
                    'accent_color' => '#E64A19',
                    'order' => 0,
                ]);
            }

            return $deck;
        });

        if ($deck->status === 'published' && $deck->module_id) {
            $this->kirimNotifikasiPresentasiTerbit($deck, $notifikasi);
        }

        $builderParameters = ['presentationDeck' => $deck];

        if (($context['return_context'] ?? null) === 'live_class') {
            $builderParameters += [
                'return_context' => 'live_class',
                'program_id' => $module->program_pembelajaran_id,
                'kloter_id' => $context['kloter_belajar_id'] ?? null,
                'week_id' => $module->id,
                'deck_id' => $deck->id,
            ];
        }

        return redirect()->route('admin.presentations.builder', $builderParameters)->with('success', 'Presentasi berhasil dibuat.');
    }

    public function update(Request $request, DeckPresentasi $presentationDeck, NotifikasiPenggunaService $notifikasi)
    {
        $this->assertCanEditDeck($request->user(), $presentationDeck);
        $oldStatus = $presentationDeck->status;
        $validated = $this->validateDeck($request, $presentationDeck);

        if ($presentationDeck->isMentorSession()) {
            $validated['status'] = 'draft';
        }

        $presentationDeck->update($validated);

        if ($oldStatus !== 'published' && $presentationDeck->status === 'published' && $presentationDeck->module_id) {
            $this->kirimNotifikasiPresentasiTerbit($presentationDeck, $notifikasi);
        }

        return redirect()->back()->with('success', 'Presentasi berhasil diperbarui.');
    }

    public function destroy(
        Request $request,
        DeckPresentasi $presentationDeck,
        PresentasiStorageService $storage
    ) {
        $this->assertCanEditDeck($request->user(), $presentationDeck);
        $moduleId = $presentationDeck->module_id;
        $deckId = $presentationDeck->id;

        DB::transaction(fn () => $presentationDeck->delete());

        try {
            $storage->deleteManagedDeckFiles($deckId);
        } catch (\Throwable $exception) {
            report($exception);
        }

        if ($request->boolean('workspace') && $moduleId) {
            return redirect()
                ->route('admin.modules.presentations.builder', [
                    'module' => $moduleId,
                ])
                ->with('success', 'Presentasi berhasil dihapus.');
        }

        return redirect()->back()->with('success', 'Presentasi berhasil dihapus.');
    }

    public function workspace(Request $request, Modul $module)
    {
        return $this->renderWorkspace(
            $module,
            $request->integer('deck_id'),
            $request->boolean('create'),
            $request->string('placement')->toString(),
            $request->string('audience_scope')->toString(),
            $request
        );
    }

    public function builder(Request $request, DeckPresentasi $presentationDeck)
    {
        abort_unless($presentationDeck->module_id, 404);
        $this->assertCanViewDeck($request->user(), $presentationDeck);

        return $this->renderWorkspace(
            $presentationDeck->module()->firstOrFail(),
            $presentationDeck->id,
            false,
            $presentationDeck->week_slot,
            $presentationDeck->audience_scope,
            $request
        );
    }

    public function reorder(Request $request, Modul $module)
    {
        abort_unless($request->user()->isAdminGlobal(), 403, 'Hanya admin global yang dapat mengatur materi kelas.');
        $validated = $request->validate([
            'positions' => ['required', 'array', 'max:500'],
            'positions.*.deck_id' => [
                'required',
                'integer',
                'distinct',
                Rule::exists('presentation_decks', 'id')->where('module_id', $module->id),
            ],
            'positions.*.week_slot' => ['required', Rule::in(['opening', 'after_day', 'closing'])],
            'positions.*.module_day_id' => [
                'nullable',
                'integer',
                Rule::exists('module_days', 'id')->where('module_id', $module->id),
            ],
            'positions.*.sort_order' => ['required', 'integer', 'min:0', 'max:65535'],
        ]);

        foreach ($validated['positions'] as $index => $position) {
            if ($position['week_slot'] === 'after_day' && empty($position['module_day_id'])) {
                throw ValidationException::withMessages([
                    "positions.{$index}.module_day_id" => 'Day tujuan wajib dipilih.',
                ]);
            }
        }

        $expectedDeckIds = DeckPresentasi::query()
            ->where('module_id', $module->id)
            ->shared()
            ->whereIn('week_slot', ['opening', 'after_day', 'closing'])
            ->pluck('id')
            ->sort()
            ->values();
        $providedDeckIds = collect($validated['positions'])
            ->pluck('deck_id')
            ->sort()
            ->values();

        if ($expectedDeckIds->all() !== $providedDeckIds->all()) {
            throw ValidationException::withMessages([
                'positions' => 'Daftar presentasi tidak lengkap. Muat ulang halaman lalu coba kembali.',
            ]);
        }

        DB::transaction(function () use ($module, $validated) {
            $module->newQuery()->lockForUpdate()->findOrFail($module->id);
            $decks = DeckPresentasi::query()
                ->where('module_id', $module->id)
                ->shared()
                ->whereIn('id', collect($validated['positions'])->pluck('deck_id'))
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            foreach ($validated['positions'] as $position) {
                $decks->get($position['deck_id'])->update([
                    'week_slot' => $position['week_slot'],
                    'module_day_id' => $position['week_slot'] === 'after_day'
                        ? $position['module_day_id']
                        : null,
                    'sort_order' => $position['sort_order'],
                ]);
            }
        });

        return response()->json([
            'message' => 'Urutan presentasi berhasil disimpan.',
        ]);
    }

    public function updateSlides(Request $request, DeckPresentasi $presentationDeck, NotifikasiPenggunaService $notifikasi, PresentasiStorageService $storage)
    {
        $this->assertCanEditDeck($request->user(), $presentationDeck);
        $validated = $request->validate([
            'status' => ['required', 'in:draft,published'],
            'week_slot' => ['required', Rule::in(['opening', 'after_day', 'closing'])],
            'module_day_id' => [
                'nullable',
                'integer',
                Rule::exists('module_days', 'id')->where('module_id', $presentationDeck->module_id),
            ],
            'sort_order' => ['required', 'integer', 'min:0', 'max:65535'],
            'slides' => ['present', 'array'],
            'slides.*.id' => ['nullable', 'integer'],
            'slides.*.title' => ['nullable', 'string', 'max:255'],
            'slides.*.layout' => ['required', Rule::in(['title', 'content', 'vocabulary', 'kanji', 'media', 'question', 'board', 'canvas', 'pdf'])],
            'slides.*.content' => ['nullable', 'string'],
            'slides.*.media_url' => ['nullable', 'string', 'max:2048'],
            'slides.*.background' => ['required', Rule::in(['light', 'dark', 'sunrise', 'sakura', 'ocean', 'forest', 'paper', 'grid', 'indigo', 'matcha', 'rose'])],
            'slides.*.accent_color' => ['nullable', 'string', 'max:20'],
            'slides.*.speaker_notes' => ['nullable', 'string'],
            'slides.*.board_data' => ['nullable', 'array'],
            'slides.*.snapshot_data' => ['nullable', 'string'],
            'slides.*.jamboard_data' => ['nullable', 'array'],
            'slides.*.jamboard_snapshot' => ['nullable', 'string'],
            'slides.*.snapshot_url' => ['nullable', 'string', 'max:2048'],
            'slides.*.canvas_json' => ['nullable', 'array'],
            'slides.*.source_type' => ['nullable', 'string', 'max:30'],
            'slides.*.source_meta' => ['nullable', 'array'],
        ]);

        if ($validated['week_slot'] === 'after_day' && empty($validated['module_day_id'])) {
            throw ValidationException::withMessages([
                'module_day_id' => 'Pilih Day tempat presentasi ditampilkan.',
            ]);
        }

        $ids = [];
        $oldStatus = $presentationDeck->status;

        if ($presentationDeck->isMentorSession()) {
            $validated['status'] = 'draft';
        }

        DB::transaction(function () use ($presentationDeck, $validated, $storage, &$ids) {
            $presentationDeck->update([
                'status' => $validated['status'],
                'week_slot' => $validated['week_slot'],
                'module_day_id' => $validated['week_slot'] === 'after_day'
                    ? $validated['module_day_id']
                    : null,
                'sort_order' => $validated['sort_order'],
            ]);

            foreach ($validated['slides'] as $index => $slide) {
                $snapshotUrl = $storage->storeSnapshotDataUrl($slide['snapshot_data'] ?? null, $presentationDeck->id)
                    ?: ($slide['snapshot_url'] ?? null);

                $model = $presentationDeck->slides()->updateOrCreate(
                    ['id' => $slide['id'] ?? null],
                    [
                        'title' => $slide['title'] ?? null,
                        'layout' => $slide['layout'],
                        'content' => $slide['content'] ?? null,
                        'media_url' => $slide['media_url'] ?? null,
                        'background' => $slide['background'],
                        'accent_color' => $slide['accent_color'] ?? '#E64A19',
                        'speaker_notes' => $slide['speaker_notes'] ?? null,
                        'order' => $index,
                        'source_type' => $slide['source_type'] ?? 'manual',
                        'canvas_json' => $slide['canvas_json'] ?? null,
                        'jamboard_data' => $slide['jamboard_data'] ?? $slide['board_data'] ?? null,
                        'jamboard_snapshot' => $slide['jamboard_snapshot'] ?? null,
                        'snapshot_url' => $snapshotUrl,
                        'source_meta' => $slide['source_meta'] ?? null,
                    ]
                );

                $ids[] = $model->id;
            }

            if (empty($ids)) {
                $presentationDeck->slides()->delete();
            } else {
                $presentationDeck->slides()->whereNotIn('id', $ids)->delete();
            }
        });

        if ($oldStatus !== 'published' && $presentationDeck->fresh()->status === 'published' && $presentationDeck->module_id) {
            $this->kirimNotifikasiPresentasiTerbit($presentationDeck, $notifikasi);
        }

        return redirect()->back()->with('success', 'Slide presentasi berhasil disimpan.');
    }

    public function importPptx(Request $request, DeckPresentasi $presentationDeck, ImportPresentasiPptxService $importer)
    {
        $this->assertCanEditDeck($request->user(), $presentationDeck);
        $validated = $request->validate([
            'pptx_file' => ['required', 'file', 'mimes:pptx', 'max:25600'],
        ]);

        $count = $importer->import($presentationDeck, $validated['pptx_file']);

        return redirect()->back()->with('success', "{$count} slide draft berhasil diimport dari PPTX. Ini bukan convert PDF otomatis; cek ulang layout sebelum publish.");
    }

    public function importImages(Request $request, DeckPresentasi $presentationDeck, ImportPresentasiGambarService $importer)
    {
        $this->assertCanEditDeck($request->user(), $presentationDeck);
        $validated = $request->validate([
            'image_files' => ['required', 'array', 'min:1', 'max:60'],
            'image_files.*' => ['required', 'file', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ]);

        $count = $importer->import($presentationDeck, $validated['image_files']);

        return redirect()->back()->with('success', "{$count} gambar berhasil diimport menjadi slide.");
    }

    public function importPdf(Request $request, DeckPresentasi $presentationDeck, ImportPresentasiPdfService $importer)
    {
        $this->assertCanEditDeck($request->user(), $presentationDeck);
        $validated = $request->validate([
            'pdf_file' => ['required', 'file', 'mimes:pdf', 'max:51200'],
        ]);

        $count = $importer->import($presentationDeck, $validated['pdf_file']);

        return redirect()->back()->with('success', "{$count} PDF final berhasil diimport. User akan melihatnya lewat canvas viewer tanpa tombol download.");
    }

    public function pdfContent(Request $request, DeckPresentasi $presentationDeck, AksesPremiumService $aksesPremium)
    {
        $presentationDeck->loadMissing('module');

        abort_unless($this->bolehAksesPdf($request, $presentationDeck, $aksesPremium), 403);

        $pdfPath = $presentationDeck->finalPdfPath();

        abort_unless($pdfPath, 404);

        abort_unless(Storage::disk('local')->exists($pdfPath), 404);

        $path = Storage::disk('local')->path($pdfPath);

        $this->catatAksesPdf($request, $presentationDeck);

        return response()->stream(function () use ($path) {
            $handle = fopen($path, 'rb');

            if ($handle === false) {
                return;
            }

            $offset = 0;

            while (! feof($handle)) {
                $chunk = fread($handle, 8192);

                if ($chunk === false || $chunk === '') {
                    break;
                }

                echo $this->xorPdfChunk($chunk, $offset);
                $offset += strlen($chunk);
            }

            fclose($handle);
        }, 200, [
            'Content-Type' => 'application/octet-stream',
            'Content-Disposition' => 'inline',
            'Cache-Control' => 'private, no-store, max-age=0',
            'Pragma' => 'no-cache',
            'X-Content-Type-Options' => 'nosniff',
            'X-Toku-Up-Pdf-Transport' => 'xor-v1',
            'X-Toku-Up-Pdf-Size' => (string) filesize($path),
        ]);
    }

    public function uploadBackgroundImage(Request $request, DeckPresentasi $presentationDeck, PresentasiStorageService $storage)
    {
        $this->assertCanEditDeck($request->user(), $presentationDeck);
        $validated = $request->validate([
            'background_image' => ['required', 'file', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ]);

        $file = $validated['background_image'];
        $extension = strtolower($file->getClientOriginalExtension());
        $path = $storage->storePublicUpload($file, "presentations/assets/{$presentationDeck->id}/backgrounds", $extension);

        return response()->json([
            'url' => $storage->publicUrl($path),
            'name' => $file->getClientOriginalName(),
            'size' => $file->getSize(),
        ]);
    }

    public function uploadMedia(Request $request, DeckPresentasi $presentationDeck, PresentasiStorageService $storage)
    {
        $this->assertCanEditDeck($request->user(), $presentationDeck);
        $validated = $request->validate([
            'media' => ['required', 'file', 'mimes:mp4', 'mimetypes:video/mp4', 'max:51200'],
        ]);

        $file = $validated['media'];
        $path = $storage->storePublicUpload(
            $file,
            "presentations/assets/{$presentationDeck->id}/media",
            'mp4'
        );

        return response()->json([
            'url' => $storage->publicUrl($path),
            'name' => $file->getClientOriginalName(),
            'size' => $file->getSize(),
            'type' => 'video/mp4',
        ]);
    }

    public function saveSlideBoard(Request $request, DeckPresentasi $presentationDeck, SlidePresentasi $presentationSlide)
    {
        $this->assertCanEditDeck($request->user(), $presentationDeck);
        abort_unless($presentationSlide->presentation_deck_id === $presentationDeck->id, 404);

        $validated = $request->validate([
            'status' => ['required', 'in:draft,published'],
            'board_data' => ['nullable', 'array'],
            'snapshot_data' => ['nullable', 'string'],
        ]);

        $presentationSlide->update([
            'jamboard_data' => $validated['board_data'] ?? ['strokes' => []],
            'jamboard_snapshot' => $validated['snapshot_data'] ?? null,
        ]);

        $presentationDeck->update([
            'status' => $presentationDeck->isMentorSession() ? 'draft' : $validated['status'],
        ]);

        return redirect()->back()->with('success', 'Jamboard presentasi berhasil disimpan.');
    }

    public function presenter(Request $request, DeckPresentasi $presentationDeck)
    {
        $this->assertCanViewDeck($request->user(), $presentationDeck);
        $presentationDeck->load(['module:id,title', 'slides']);

        return Inertia::render('Admin/Presentasi/ModePresentasi', [
            'deck' => $presentationDeck,
        ]);
    }

    private function validateDeck(Request $request, ?DeckPresentasi $deck = null): array
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'level_id' => ['nullable', 'integer', 'exists:levels,id'],
            'module_id' => ['required', 'integer', 'exists:modules,id'],
            'module_day_id' => [
                'nullable',
                'integer',
                Rule::exists('module_days', 'id')->where('module_id', $request->integer('module_id')),
            ],
            'week_slot' => [
                'required',
                Rule::in(['opening', 'after_day', 'closing']),
            ],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:65535'],
            'status' => ['required', 'in:draft,published'],
        ]);

        if ($validated['week_slot'] === 'after_day') {
            if (empty($validated['module_day_id'])) {
                throw ValidationException::withMessages([
                    'module_day_id' => 'Pilih Day tempat presentasi ditampilkan.',
                ]);
            }
        } else {
            $validated['module_day_id'] = null;
        }

        return $validated;
    }

    private function renderWorkspace(
        Modul $module,
        int $activeDeckId = 0,
        bool $createMode = false,
        string $placement = 'opening',
        string $audienceScope = '',
        ?Request $request = null
    ) {
        $request ??= request();
        $user = $request->user();
        $placement = in_array($placement, ['opening', 'after_day', 'closing'], true)
            ? $placement
            : 'opening';
        $requestedScope = in_array($audienceScope, [DeckPresentasi::AUDIENCE_SHARED, DeckPresentasi::AUDIENCE_MENTOR_SESSION], true)
            ? $audienceScope
            : DeckPresentasi::AUDIENCE_SHARED;

        $module->loadMissing([
            'level:id,level_name',
            'programPembelajaran:id,title,slug',
            'days:id,module_id,day_number,title',
        ]);

        $decks = DeckPresentasi::query()
            ->where('module_id', $module->id)
            ->where('audience_scope', $requestedScope)
            ->when(
                $requestedScope === DeckPresentasi::AUDIENCE_MENTOR_SESSION && ! $user->isAdminGlobal(),
                fn ($query) => $query->where('created_by', $user->id)
            )
            ->whereIn('week_slot', ['opening', 'after_day', 'closing'])
            ->with([
                'level:id,level_name',
                'module:id,program_pembelajaran_id,title,week_number',
                'day:id,module_id,day_number,title',
                'creator:id,username',
                'slides',
            ])
            ->withCount('slides')
            ->get()
            ->sortBy(fn (DeckPresentasi $deck) => [
                ['opening' => 0, 'after_day' => 1, 'closing' => 2][$deck->week_slot] ?? 3,
                $deck->day?->day_number ?? 0,
                $deck->sort_order,
                $deck->id,
            ])
            ->values();

        $activeDeck = $createMode
            ? null
            : ($decks->firstWhere('id', $activeDeckId) ?? $decks->first());

        if ($activeDeck) {
            $this->assertCanViewDeck($user, $activeDeck);
        }

        $canCreate = $requestedScope === DeckPresentasi::AUDIENCE_MENTOR_SESSION
            ? $this->canCreateMentorDeck($user, $module)
            : $user->isAdminGlobal();
        $canEdit = $activeDeck ? $this->canEditDeck($user, $activeDeck) : $canCreate;
        $returnToLiveClass = $request->string('return_context')->toString() === 'live_class';
        $returnUrl = $returnToLiveClass
            ? route('admin.live-classes.create', array_filter([
                'program_id' => $module->program_pembelajaran_id,
                'kloter_id' => $request->integer('kloter_id') ?: null,
                'week_id' => $module->id,
                'deck_id' => $activeDeck?->id ?? ($request->integer('deck_id') ?: null),
            ]), absolute: false)
            : null;

        return Inertia::render('Admin/Presentasi/BuilderPresentasi', [
            'module' => [
                'id' => $module->id,
                'level_id' => $module->level_id,
                'title' => $module->title,
                'week_number' => $module->week_number,
                'level' => $module->level,
                'program' => $module->programPembelajaran,
            ],
            'deck' => $activeDeck,
            'decks' => $decks->map(fn (DeckPresentasi $deck) => [
                'id' => $deck->id,
                'title' => $deck->title,
                'status' => $deck->status,
                'audience_scope' => $deck->audience_scope,
                'creator_name' => $deck->creator?->username,
                'slides_count' => $deck->slides_count,
                'week_slot' => $deck->week_slot,
                'module_day_id' => $deck->module_day_id,
                'sort_order' => $deck->sort_order,
                'day' => $deck->day,
            ]),
            'days' => $module->days->sortBy('day_number')->values(),
            'createMode' => $canCreate && ($createMode || $decks->isEmpty()),
            'activePlacement' => $createMode ? $placement : ($activeDeck?->week_slot ?? $placement),
            'audienceScope' => $requestedScope,
            'canEdit' => $canEdit,
            'canCreate' => $canCreate,
            'returnUrl' => $returnUrl,
            'returnContext' => $returnToLiveClass ? [
                'type' => 'live_class',
                'kloter_id' => $request->integer('kloter_id') ?: null,
            ] : null,
        ]);
    }

    private function kirimNotifikasiPresentasiTerbit(DeckPresentasi $deck, NotifikasiPenggunaService $notifikasi): void
    {
        if ($deck->audience_scope !== DeckPresentasi::AUDIENCE_SHARED) {
            return;
        }

        $deck->loadMissing('module.programPembelajaran');

        if (! $deck->module) {
            return;
        }

        $url = $deck->module->programPembelajaran
            ? route('user.modul.program.presentasi', $deck->module->programPembelajaran->slug)
            : route('user.kelas.index');

        $notifikasi->kirimKePenggunaYangBisaAksesModul(
            $deck->module,
            'new_presentation',
            'PPT baru tersedia',
            "Presentasi {$deck->title} sudah bisa dibuka.",
            $url,
            ['presentation_deck_id' => $deck->id, 'module_id' => $deck->module_id]
        );
    }

    private function assertCanCreateDeck(Pengguna $user, Modul $module, string $audienceScope): void
    {
        $allowed = $audienceScope === DeckPresentasi::AUDIENCE_SHARED
            ? $user->isAdminGlobal()
            : $this->canCreateMentorDeck($user, $module);

        abort_unless($allowed, 403, $audienceScope === DeckPresentasi::AUDIENCE_SHARED
            ? 'Hanya admin global yang dapat membuat materi kelas.'
            : 'Anda tidak mengampu kelas ini.');
    }

    private function canCreateMentorDeck(Pengguna $user, Modul $module): bool
    {
        if ($user->isAdminGlobal()) {
            return true;
        }

        return $user->isMentor()
            && $user->kloterDikelola()
                ->where('program_pembelajaran_id', $module->program_pembelajaran_id)
                ->exists();
    }

    private function canViewDeck(Pengguna $user, DeckPresentasi $deck): bool
    {
        if ($deck->audience_scope === DeckPresentasi::AUDIENCE_SHARED) {
            return $user->role === 'admin';
        }

        return $user->isAdminGlobal() || $deck->created_by === $user->id;
    }

    private function assertCanViewDeck(Pengguna $user, DeckPresentasi $deck): void
    {
        abort_unless($this->canViewDeck($user, $deck), 403, 'Presentasi ini berada di luar cakupan akun Anda.');
    }

    private function canEditDeck(Pengguna $user, DeckPresentasi $deck): bool
    {
        if ($deck->audience_scope === DeckPresentasi::AUDIENCE_SHARED) {
            return $user->isAdminGlobal();
        }

        return $deck->created_by === $user->id;
    }

    private function assertCanEditDeck(Pengguna $user, DeckPresentasi $deck): void
    {
        abort_unless($this->canEditDeck($user, $deck), 403, $deck->isMentorSession()
            ? 'PPT sesi ini hanya dapat diubah oleh mentor pembuatnya.'
            : 'Materi kelas hanya dapat diubah oleh admin global.');
    }

    private function bolehAksesPdf(Request $request, DeckPresentasi $deck, AksesPremiumService $aksesPremium): bool
    {
        $user = $request->user();

        if (! $user) {
            return false;
        }

        if ($user->role === 'admin') {
            return $this->canViewDeck($user, $deck);
        }

        if ($user->role === 'superadmin') {
            return true;
        }

        if ($user->role !== 'user' || $deck->audience_scope !== DeckPresentasi::AUDIENCE_SHARED || $deck->status !== 'published' || ! $deck->module) {
            return false;
        }

        return $aksesPremium->bolehAksesModul($user, $deck->module);
    }

    private function catatAksesPdf(Request $request, DeckPresentasi $deck): void
    {
        $user = $request->user();

        if (! $user || $user->role !== 'user') {
            return;
        }

        $recentExists = LogAktivitas::where('actor_id', $user->id)
            ->where('action', 'presentation_pdf_view')
            ->where('target_type', 'presentation_deck')
            ->where('target_id', $deck->id)
            ->where('created_at', '>=', now()->subMinutes(10))
            ->exists();

        if ($recentExists) {
            return;
        }

        LogAktivitas::create([
            'actor_id' => $user->id,
            'action' => 'presentation_pdf_view',
            'target_type' => 'presentation_deck',
            'target_id' => $deck->id,
            'description' => "Membuka PDF presentasi {$deck->title}.",
            'metadata' => [
                'module_id' => $deck->module_id,
                'file_name' => $deck->finalPdfName(),
            ],
            'ip_address' => $request->ip(),
            'user_agent' => substr((string) $request->userAgent(), 0, 1000),
        ]);
    }

    private function xorPdfChunk(string $chunk, int $offset = 0): string
    {
        $key = 'toku-up-pdf-viewer';
        $keyLength = strlen($key);
        $length = strlen($chunk);
        $encoded = '';

        for ($index = 0; $index < $length; $index++) {
            $encoded .= $chunk[$index] ^ $key[($offset + $index) % $keyLength];
        }

        return $encoded;
    }
}
