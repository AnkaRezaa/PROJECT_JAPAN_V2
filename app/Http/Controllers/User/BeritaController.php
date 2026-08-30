<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Models\Berita;
use Inertia\Inertia;

class BeritaController extends Controller
{
    public function index()
    {
        $featured = $this->publishedNews()
            ->with(['attachments', 'creator:id,username'])
            ->first();

        $news = $this->publishedNews()
            ->with(['attachments', 'creator:id,username'])
            ->paginate(9)
            ->withQueryString()
            ->through(fn (Berita $news) => $this->mapNews($news));

        return Inertia::render('User/Berita/DaftarBerita', [
            'featured' => $featured ? $this->mapNews($featured) : null,
            'news' => $news,
        ]);
    }

    public function show(Berita $news)
    {
        abort_unless($this->isVisibleToStudent($news), 404);

        $related = $this->publishedNews()
            ->with(['attachments', 'creator:id,username'])
            ->whereKeyNot($news->id)
            ->when($news->category, fn ($query, $category) => $query->where('category', $category))
            ->take(4)
            ->get()
            ->map(fn (Berita $item) => $this->mapNews($item));

        return Inertia::render('User/Berita/DetailBerita', [
            'newsItem' => $this->mapNews($news->load(['attachments', 'creator:id,username'])),
            'relatedNews' => $related,
        ]);
    }

    private function publishedNews()
    {
        return Berita::query()
            ->where('status', 'published')
            ->where(function ($query) {
                $query->whereNull('published_at')->orWhere('published_at', '<=', now());
            })
            ->whereIn('audience', ['all', 'students'])
            ->where(function ($query) {
                $query->whereNull('starts_at')->orWhere('starts_at', '<=', now());
            })
            ->where(function ($query) {
                $query->whereNull('ends_at')->orWhere('ends_at', '>=', now());
            })
            ->orderByDesc('is_pinned')
            ->orderByDesc('published_at')
            ->latest();
    }

    private function isVisibleToStudent(Berita $news): bool
    {
        return $news->status === 'published'
            && in_array($news->audience, ['all', 'students'], true)
            && (! $news->published_at || $news->published_at->lte(now()))
            && (! $news->starts_at || $news->starts_at->lte(now()))
            && (! $news->ends_at || $news->ends_at->gte(now()));
    }

    private function mapNews(Berita $news): array
    {
        $thumbnailUrl = $news->thumbnailUrl();

        return [
            'id' => $news->id,
            'slug' => $news->slug,
            'title' => $news->title,
            'excerpt' => $news->excerpt,
            'body' => $news->body,
            'reading_blocks' => $news->reading_blocks ?? [],
            'category' => $news->category,
            'is_pinned' => $news->is_pinned,
            'published_at' => optional($news->published_at)->toIso8601String(),
            'published_label' => optional($news->published_at)->translatedFormat('d F Y'),
            'thumbnail_url' => $thumbnailUrl,
            'cover_url' => $thumbnailUrl,
            'cover_image_alt' => $news->cover_image_alt,
            'cover_image_caption' => $news->cover_image_caption,
            'author_name' => $news->creator?->username ?? 'TOKU-UP',
            'reading_time_minutes' => $news->readingTimeMinutes(),
            'seo_title' => $news->seo_title,
            'seo_description' => $news->seo_description,
            'attachments' => $news->attachments->map(fn ($attachment) => [
                'id' => $attachment->id,
                'file_name' => $attachment->file_name,
                'file_type' => $attachment->file_type,
                'url' => $attachment->file_path ? asset("storage/{$attachment->file_path}") : null,
                'video_embed_url' => $attachment->video_embed_url,
            ])->values(),
        ];
    }
}
