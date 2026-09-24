<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Models\LogAktivitas;
use App\Models\Modul as LearningModule;
use App\Models\Berita;
use App\Models\BroadcastPopup;
use App\Models\DeckPresentasi;
use App\Models\LampiranBerita;
use App\Models\Kuis;
use App\Services\HtmlSanitizerService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class SuperAdminKontenController extends SuperAdminDasarController
{
    public function __invoke(Request $request)
    {
        $filters = [
            'search' => (string) $request->string('search'),
            'status' => $request->string('status')->value() ?: 'all',
            'audience' => $request->string('audience')->value() ?: 'all',
            'pinned' => $request->string('pinned')->value() ?: 'all',
        ];

        $news = Berita::with(['creator:id,username', 'attachments'])
            ->when($filters['search'], fn ($query, $search) => $query->where('title', 'like', "%{$search}%"))
            ->when($filters['status'] !== 'all', fn ($query) => $query->where('status', $filters['status']))
            ->when($filters['audience'] !== 'all', fn ($query) => $query->where('audience', $filters['audience']))
            ->when($filters['pinned'] !== 'all', fn ($query) => $query->where('is_pinned', $filters['pinned'] === 'yes'))
            ->latest()
            ->paginate(8)
            ->withQueryString()
            ->through(fn (Berita $item) => $this->mapNews($item));

        $popups = BroadcastPopup::with('creator:id,username')
            ->latest()
            ->get()
            ->map(fn (BroadcastPopup $popup) => [
                'id' => $popup->id,
                'title' => $popup->title,
                'description' => $popup->description,
                'type' => $popup->type,
                'badge' => $popup->badge,
                'image_url' => $popup->imageUrl(),
                'cta_label' => $popup->cta_label,
                'cta_url' => $popup->cta_url,
                'target_page' => $popup->target_page,
                'target_audience' => $popup->target_audience,
                'is_active' => (bool) $popup->is_active,
                'starts_at' => $popup->starts_at?->format('Y-m-d\TH:i'),
                'ends_at' => $popup->ends_at?->format('Y-m-d\TH:i'),
                'creator' => $popup->creator?->username,
                'created_at' => optional($popup->created_at)->toIso8601String(),
            ]);

        return Inertia::render('SuperAdmin/Konten/Konten', [
            'stats' => [
                $this->stat('Modul Aktif', number_format(LearningModule::count()), 'M'),
                $this->stat('PPT Publish', number_format(DeckPresentasi::where('status', 'published')->count()), 'P'),
                $this->stat('Kuis Siap Pakai', number_format(Kuis::count()), 'Q'),
                $this->stat('Berita Aktif', number_format(Berita::where('status', 'published')->count()), 'N'),
                $this->stat('Pop-up Aktif', number_format(BroadcastPopup::where('is_active', true)->count()), 'B'),
            ],
            'contentStatusByType' => [
                $this->contentStatus(LearningModule::class, 'Modul'),
                $this->contentStatus(Kuis::class, 'Kuis'),
                $this->contentStatus(DeckPresentasi::class, 'Presentasi'),
                $this->contentStatus(Berita::class, 'Berita'),
            ],
            'news' => $news,
            'popups' => $popups,
            'categories' => $this->categories(),
            'filters' => $filters,
            'updates' => LogAktivitas::with('actor:id,username')
                ->whereIn('target_type', ['module', 'lesson', 'quiz', 'news', 'popup'])
                ->latest()
                ->take(4)
                ->get()
                ->map(fn (LogAktivitas $log) => [
                    'id' => $log->id,
                    'item' => $log->target_type ? ucfirst($log->target_type) . ' #' . $log->target_id : $log->action,
                    'by' => $log->actor?->username ?? 'System',
                    'state' => 'Updated',
                    'created_at' => optional($log->created_at)->toIso8601String(),
                ]),
        ]);
    }

    /**
     * @param class-string<\Illuminate\Database\Eloquent\Model> $model
     */
    private function contentStatus(string $model, string $label): array
    {
        $counts = $model::query()
            ->selectRaw("COALESCE(status, 'draft') as content_status, COUNT(*) as total")
            ->groupBy('content_status')
            ->pluck('total', 'content_status');
        $published = (int) ($counts->get('published') ?? 0);

        return [
            'label' => $label,
            'published' => $published,
            'draft' => max(0, (int) $counts->sum() - $published),
        ];
    }

    public function store(Request $request)
    {
        $validated = $this->validateNews($request);
        $coverImagePath = $this->storeCover($request);

        $news = Berita::create([
            ...$this->prepareNewsAttributes($validated),
            'slug' => $this->uniqueSlug($validated['slug'] ?: $validated['title']),
            'cover_image_path' => $coverImagePath,
            'created_by' => $request->user()->id,
            'updated_by' => $request->user()->id,
        ]);

        $this->logActivity($request, 'news.created', 'news', $news->id, "Membuat news {$news->title}");

        return redirect()->back()->with('success', 'Berita berhasil dibuat');
    }

    public function update(Request $request, Berita $news)
    {
        $validated = $this->validateNews($request);
        $coverImagePath = $this->storeCover($request, $news);

        $news->update([
            ...$this->prepareNewsAttributes($validated, $news),
            'slug' => $this->uniqueSlug($validated['slug'] ?: $validated['title'], $news),
            'cover_image_path' => $coverImagePath,
            'updated_by' => $request->user()->id,
        ]);

        $this->logActivity($request, 'news.updated', 'news', $news->id, "Memperbarui news {$news->title}");

        return redirect()->back()->with('success', 'Berita berhasil diperbarui');
    }

    public function destroy(Request $request, Berita $news)
    {
        if ($news->cover_image_path) {
            Storage::disk('public')->delete($news->cover_image_path);
        }

        foreach ($news->attachments as $attachment) {
            if ($attachment->file_path) {
                Storage::disk('public')->delete($attachment->file_path);
            }
        }

        $title = $news->title;
        $id = $news->id;
        $news->delete();

        $this->logActivity($request, 'news.deleted', 'news', $id, "Menghapus news {$title}");

        return redirect()->back()->with('success', 'Berita berhasil dihapus');
    }

    public function storeAttachment(Request $request, Berita $news)
    {
        $validated = $request->validate([
            'type' => ['required', 'in:image,document,video_embed'],
            'file' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp,pdf,doc,docx', 'max:8192'],
            'video_embed_url' => ['nullable', 'url', 'max:500'],
        ]);

        if ($validated['type'] === 'video_embed') {
            abort_unless(! empty($validated['video_embed_url']), 422, 'URL video wajib diisi.');

            $attachment = $news->attachments()->create([
                'file_name' => 'Video Embed',
                'file_type' => 'video_embed',
                'video_embed_url' => $validated['video_embed_url'],
                'sort_order' => ($news->attachments()->max('sort_order') ?? -1) + 1,
            ]);

            $this->logActivity($request, 'news.attachment_added', 'news', $news->id, "Menambah video embed ke news {$news->title}");

            return redirect()->back()->with('success', 'Video embed berhasil ditambahkan');
        }

        abort_unless($request->hasFile('file'), 422, 'File wajib diunggah.');

        $file = $request->file('file');
        $folder = $validated['type'] === 'image' ? 'images' : 'documents';
        $path = $file->store("uploads/news/{$folder}", 'public');

        $attachment = $news->attachments()->create([
            'file_name' => $file->getClientOriginalName(),
            'file_path' => $path,
            'file_type' => $validated['type'],
            'mime_type' => $file->getClientMimeType(),
            'file_size' => $file->getSize(),
            'sort_order' => ($news->attachments()->max('sort_order') ?? -1) + 1,
        ]);

        $this->logActivity($request, 'news.attachment_added', 'news', $news->id, "Menambah attachment {$attachment->file_name} ke news {$news->title}");

        return redirect()->back()->with('success', 'Attachment berhasil ditambahkan');
    }

    public function storeEditorImage(Request $request)
    {
        $validated = $request->validate([
            'image' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
        ]);

        $path = $validated['image']->store('uploads/news/editor', 'public');

        return response()->json([
            'url' => asset("storage/{$path}"),
        ]);
    }

    public function destroyAttachment(Request $request, Berita $news, LampiranBerita $attachment)
    {
        abort_unless($attachment->news_id === $news->id, 404);

        if ($attachment->file_path) {
            Storage::disk('public')->delete($attachment->file_path);
        }

        $fileName = $attachment->file_name;
        $attachment->delete();

        $this->logActivity($request, 'news.attachment_deleted', 'news', $news->id, "Menghapus attachment {$fileName} dari news {$news->title}");

        return redirect()->back()->with('success', 'Attachment berhasil dihapus');
    }

    private function validateNews(Request $request): array
    {
        if ($request->has('reading_blocks') && is_array($request->input('reading_blocks'))) {
            $cleaned = collect($request->input('reading_blocks'))
                ->filter(fn ($b) => is_array($b) && (! empty(trim((string) ($b['japanese'] ?? ''))) || ! empty(trim((string) ($b['reading'] ?? '')))))
                ->values()
                ->all();
            $request->merge(['reading_blocks' => $cleaned]);
        }

        if ($request->input('status') !== 'scheduled') {
            $request->merge(['scheduled_at' => null]);
        }

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255'],
            'excerpt' => ['nullable', 'string', 'max:500'],
            'body' => ['nullable', 'string'],
            'reading_blocks' => ['nullable', 'array', 'max:100'],
            'reading_blocks.*.japanese' => ['required', 'string', 'max:1000'],
            'reading_blocks.*.reading' => ['required', 'string', 'max:1000'],
            'reading_blocks.*.translation' => ['nullable', 'string', 'max:2000'],
            'status' => ['required', 'in:draft,scheduled,published,archived'],
            'audience' => ['required', 'in:students,admins,all'],
            'category' => ['required', 'in:'.implode(',', $this->categories())],
            'is_pinned' => ['boolean'],
            'scheduled_at' => ['nullable', 'required_if:status,scheduled', 'date'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', Rule::when($request->filled('starts_at'), ['after_or_equal:starts_at'])],
            'cover_image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
            'cover_image_alt' => ['nullable', 'string', 'max:160', 'required_with:cover_image'],
            'cover_image_caption' => ['nullable', 'string', 'max:255'],
            'seo_title' => ['nullable', 'string', 'max:70'],
            'seo_description' => ['nullable', 'string', 'max:160'],
        ], [
            'title.required' => 'Judul berita wajib diisi.',
            'category.required' => 'Kategori berita wajib dipilih.',
            'cover_image.image' => 'File gambar utama harus berupa gambar.',
            'cover_image.mimes' => 'Format gambar utama harus JPG, JPEG, PNG, atau WebP.',
            'cover_image.max' => 'Ukuran gambar utama maksimal 4 MB.',
            'cover_image_alt.required_with' => 'Alt gambar wajib diisi jika mengunggah gambar utama.',
            'scheduled_at.required_if' => 'Waktu jadwal terbit wajib diisi jika status Terjadwal.',
            'ends_at.after_or_equal' => 'Tanggal berhenti tampil harus setelah atau sama dengan tanggal mulai.',
            'reading_blocks.*.japanese.required' => 'Teks Jepang pada bagian bantuan baca wajib diisi.',
            'reading_blocks.*.reading.required' => 'Reading kana pada bagian bantuan baca wajib diisi.',
        ]);

        $validated['body'] = app(HtmlSanitizerService::class)->clean($validated['body'] ?? '');
        $validated['reading_blocks'] = collect($validated['reading_blocks'] ?? [])
            ->map(fn (array $block) => [
                'japanese' => trim($block['japanese']),
                'reading' => trim($block['reading']),
                'translation' => trim($block['translation'] ?? ''),
            ])
            ->filter(fn (array $block) => $block['japanese'] !== '' && $block['reading'] !== '')
            ->values()
            ->all();

        return $validated;
    }

    private function prepareNewsAttributes(array $validated, ?Berita $news = null): array
    {
        unset($validated['cover_image']);

        if ($validated['status'] === 'scheduled') {
            $validated['published_at'] = null;
        } elseif ($validated['status'] === 'published') {
            $validated['published_at'] = $news?->published_at ?? now();
            $validated['scheduled_at'] = null;
        } else {
            $validated['scheduled_at'] = null;

            if ($validated['status'] !== 'published') {
                $validated['published_at'] = null;
            }
        }

        return $validated;
    }

    private function storeCover(Request $request, ?Berita $news = null): ?string
    {
        if (! $request->hasFile('cover_image')) {
            return $news?->cover_image_path;
        }

        if ($news?->cover_image_path) {
            Storage::disk('public')->delete($news->cover_image_path);
        }

        return $request->file('cover_image')->store('uploads/news/covers', 'public');
    }

    private function uniqueSlug(string $value, ?Berita $news = null): string
    {
        $base = Str::slug($value) ?: 'news';
        $slug = $base;
        $suffix = 2;

        while (Berita::query()
            ->where('slug', $slug)
            ->when($news, fn ($query) => $query->whereKeyNot($news->id))
            ->exists()) {
            $slug = "{$base}-{$suffix}";
            $suffix++;
        }

        return $slug;
    }

    private function categories(): array
    {
        return ['platform', 'materi-belajar', 'tips-belajar', 'budaya-jepang', 'pengumuman'];
    }

    private function mapNews(Berita $news): array
    {
        return [
            'id' => $news->id,
            'title' => $news->title,
            'slug' => $news->slug,
            'excerpt' => $news->excerpt,
            'body' => $news->body,
            'reading_blocks' => $news->reading_blocks ?? [],
            'raw_status' => $news->status,
            'raw_audience' => $news->audience,
            'category' => $news->category,
            'is_pinned' => $news->is_pinned,
            'thumbnail_url' => $news->thumbnailUrl(),
            'cover_url' => $news->thumbnailUrl(),
            'cover_image_alt' => $news->cover_image_alt,
            'cover_image_caption' => $news->cover_image_caption,
            'published_at' => optional($news->published_at)->format('Y-m-d\TH:i'),
            'scheduled_at' => optional($news->scheduled_at)->format('Y-m-d\TH:i'),
            'starts_at' => optional($news->starts_at)->format('Y-m-d\TH:i'),
            'ends_at' => optional($news->ends_at)->format('Y-m-d\TH:i'),
            'seo_title' => $news->seo_title,
            'seo_description' => $news->seo_description,
            'status' => $news->is_pinned ? 'Pinned' : ucfirst($news->status),
            'audience' => ucfirst($news->audience),
            'schedule' => $news->published_at ? $news->published_at->diffForHumans() : 'Belum publish',
            'attachments' => $news->attachments->map(fn (LampiranBerita $attachment) => [
                'id' => $attachment->id,
                'file_name' => $attachment->file_name,
                'file_type' => $attachment->file_type,
                'url' => $attachment->file_path ? asset("storage/{$attachment->file_path}") : null,
                'video_embed_url' => $attachment->video_embed_url,
                'size' => $attachment->file_size,
            ])->values(),
        ];
    }

    public function storePopup(Request $request)
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'type' => ['required', 'in:promo,announcement,event,maintenance'],
            'badge' => ['nullable', 'string', 'max:50'],
            'cta_label' => ['nullable', 'string', 'max:100'],
            'cta_url' => ['nullable', 'string', 'max:255'],
            'target_page' => ['required', 'in:all,landing_page,dashboard'],
            'target_audience' => ['required', 'in:all,guest,user,free_user'],
            'is_active' => ['boolean'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
            'image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
        ]);

        $imagePath = null;
        if ($request->hasFile('image')) {
            $imagePath = $request->file('image')->store('uploads/popups', 'public');
        }

        $popup = BroadcastPopup::create([
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'type' => $validated['type'],
            'badge' => $validated['badge'] ?? null,
            'cta_label' => $validated['cta_label'] ?? null,
            'cta_url' => $validated['cta_url'] ?? null,
            'target_page' => $validated['target_page'],
            'target_audience' => $validated['target_audience'],
            'is_active' => $request->boolean('is_active', true),
            'starts_at' => $validated['starts_at'] ?? null,
            'ends_at' => $validated['ends_at'] ?? null,
            'image_path' => $imagePath,
            'created_by' => $request->user()->id,
        ]);

        $this->logActivity($request, 'popup.created', 'popup', $popup->id, "Membuat popup {$popup->title}");

        return redirect()->back()->with('success', 'Pop-up broadcast berhasil dibuat');
    }

    public function updatePopup(Request $request, BroadcastPopup $popup)
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'type' => ['required', 'in:promo,announcement,event,maintenance'],
            'badge' => ['nullable', 'string', 'max:50'],
            'cta_label' => ['nullable', 'string', 'max:100'],
            'cta_url' => ['nullable', 'string', 'max:255'],
            'target_page' => ['required', 'in:all,landing_page,dashboard'],
            'target_audience' => ['required', 'in:all,guest,user,free_user'],
            'is_active' => ['boolean'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
            'image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
            'remove_image' => ['nullable', 'boolean'],
        ]);

        $imagePath = $popup->image_path;
        if ($request->boolean('remove_image')) {
            if ($popup->image_path) {
                Storage::disk('public')->delete($popup->image_path);
            }
            $imagePath = null;
        } elseif ($request->hasFile('image')) {
            if ($popup->image_path) {
                Storage::disk('public')->delete($popup->image_path);
            }
            $imagePath = $request->file('image')->store('uploads/popups', 'public');
        }

        $popup->update([
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'type' => $validated['type'],
            'badge' => $validated['badge'] ?? null,
            'cta_label' => $validated['cta_label'] ?? null,
            'cta_url' => $validated['cta_url'] ?? null,
            'target_page' => $validated['target_page'],
            'target_audience' => $validated['target_audience'],
            'is_active' => $request->boolean('is_active', true),
            'starts_at' => $validated['starts_at'] ?? null,
            'ends_at' => $validated['ends_at'] ?? null,
            'image_path' => $imagePath,
        ]);

        $this->logActivity($request, 'popup.updated', 'popup', $popup->id, "Memperbarui popup {$popup->title}");

        return redirect()->back()->with('success', 'Pop-up broadcast berhasil diperbarui');
    }

    public function togglePopup(Request $request, BroadcastPopup $popup)
    {
        $popup->update(['is_active' => ! $popup->is_active]);

        $this->logActivity(
            $request,
            'popup.status_updated',
            'popup',
            $popup->id,
            "Mengubah status popup {$popup->title} menjadi ".($popup->is_active ? 'aktif' : 'nonaktif')
        );

        return redirect()->back()->with('success', 'Status pop-up berhasil diubah');
    }

    public function destroyPopup(Request $request, BroadcastPopup $popup)
    {
        if ($popup->image_path) {
            Storage::disk('public')->delete($popup->image_path);
        }

        $title = $popup->title;
        $id = $popup->id;
        $popup->delete();

        $this->logActivity($request, 'popup.deleted', 'popup', $id, "Menghapus popup {$title}");

        return redirect()->back()->with('success', 'Pop-up broadcast berhasil dihapus');
    }
}
