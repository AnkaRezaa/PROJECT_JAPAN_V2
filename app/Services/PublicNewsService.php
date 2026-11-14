<?php

namespace App\Services;

use App\Models\Berita;
use App\Models\LampiranBerita;
use Illuminate\Database\Eloquent\Builder;

class PublicNewsService
{
    public function summariesQuery(): Builder
    {
        return Berita::query()->publiclyVisible()
            ->select(['id', 'slug', 'title', 'excerpt', 'category', 'published_at', 'is_pinned', 'cover_image_path', 'cover_image_alt'])
            ->addSelect(['preview_image_path' => LampiranBerita::query()
                ->select('file_path')->whereColumn('news_id', 'news.id')->where('file_type', 'image')
                ->orderBy('sort_order')->orderBy('id')->limit(1)])
            ->orderByDesc('is_pinned')->orderByDesc('published_at')->orderByDesc('id');
    }

    public function summary(Berita $news): array
    {
        $imagePath = $news->cover_image_path ?: $news->getAttribute('preview_image_path');

        return [
            'id' => $news->id,
            'slug' => $news->slug,
            'title' => $news->title,
            'excerpt' => $news->excerpt,
            'category' => $news->category,
            'published_label' => $news->published_at?->translatedFormat('d F Y'),
            'thumbnail_url' => $imagePath ? asset("storage/{$imagePath}") : null,
            'cover_image_alt' => $news->cover_image_alt,
            'url' => route('public.news.show', $news->getRouteKey()),
        ];
    }

    public function detail(Berita $news): array
    {
        $news->loadMissing(['attachments', 'creator:id,username']);

        return [
            ...$this->summary($news),
            'thumbnail_url' => $news->thumbnailUrl(),
            'body' => app(HtmlSanitizerService::class)->clean($news->body),
            'reading_blocks' => $news->reading_blocks ?? [],
            'cover_image_caption' => $news->cover_image_caption,
            'author_name' => $news->creator?->username ?? config('seo.site_name'),
            'reading_time_minutes' => $news->readingTimeMinutes(),
            'attachments' => $news->attachments->map(fn (LampiranBerita $attachment) => [
                'id' => $attachment->id,
                'file_name' => $attachment->file_name,
                'file_type' => $attachment->file_type,
                'url' => $attachment->file_path ? asset("storage/{$attachment->file_path}") : null,
                'video_embed_url' => $attachment->video_embed_url,
            ])->values(),
        ];
    }
}
