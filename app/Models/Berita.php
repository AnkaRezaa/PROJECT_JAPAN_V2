<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Berita extends Model
{
    use HasFactory;

    protected $table = 'news';

    protected $fillable = [
        'created_by',
        'updated_by',
        'title',
        'slug',
        'excerpt',
        'body',
        'reading_blocks',
        'status',
        'audience',
        'category',
        'is_pinned',
        'published_at',
        'scheduled_at',
        'starts_at',
        'ends_at',
        'cover_image_path',
        'cover_image_alt',
        'cover_image_caption',
        'seo_title',
        'seo_description',
    ];

    protected $casts = [
        'is_pinned' => 'boolean',
        'reading_blocks' => 'array',
        'published_at' => 'datetime',
        'scheduled_at' => 'datetime',
        'starts_at' => 'datetime',
        'ends_at' => 'datetime',
    ];

    public function creator()
    {
        return $this->belongsTo(Pengguna::class, 'created_by');
    }

    public function updater()
    {
        return $this->belongsTo(Pengguna::class, 'updated_by');
    }

    public function attachments()
    {
        return $this->hasMany(LampiranBerita::class, 'news_id')->orderBy('sort_order');
    }

    public function thumbnailUrl(): ?string
    {
        if ($this->cover_image_path) {
            return asset("storage/{$this->cover_image_path}");
        }

        $attachment = $this->relationLoaded('attachments')
            ? $this->attachments->firstWhere('file_type', 'image')
            : $this->attachments()->where('file_type', 'image')->first();

        if ($attachment?->file_path) {
            return asset("storage/{$attachment->file_path}");
        }

        if (! $this->body || ! preg_match('/<img[^>]+src=["\']([^"\']+)["\']/i', $this->body, $matches)) {
            return null;
        }

        $src = html_entity_decode($matches[1]);

        if (str_starts_with($src, 'http://') || str_starts_with($src, 'https://')) {
            return $src;
        }

        if (str_starts_with($src, 'data:image')) {
            return null;
        }

        return url($src);
    }

    public function getRouteKey(): mixed
    {
        return $this->slug ?: $this->getKey();
    }

    public function resolveRouteBinding($value, $field = null): ?Model
    {
        if ($field !== null) {
            return parent::resolveRouteBinding($value, $field);
        }

        return static::query()
            ->where('slug', $value)
            ->when(ctype_digit((string) $value), fn ($query) => $query->orWhere($this->getKeyName(), $value))
            ->first();
    }

    public function readingTimeMinutes(): int
    {
        $words = str_word_count(strip_tags((string) $this->body));

        return max(1, (int) ceil($words / 200));
    }
}
