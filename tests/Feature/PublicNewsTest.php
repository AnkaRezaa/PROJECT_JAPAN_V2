<?php

use App\Models\Berita;
use App\Models\Pengguna;
use App\Services\PublicNewsService;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;

function publicNewsFixture(array $attributes = []): Berita
{
    return Berita::create(array_merge([
        'title' => 'Belajar Bahasa Jepang',
        'slug' => 'berita-'.Illuminate\Support\Str::uuid(),
        'excerpt' => 'Panduan belajar mandiri.',
        'body' => '<p>Isi artikel.</p>',
        'status' => 'published',
        'audience' => 'all',
        'is_public' => true,
        'category' => 'tips-belajar',
        'published_at' => now()->subHour(),
    ], $attributes));
}

it('only exposes currently published public news across guest surfaces and sitemap', function () {
    config(['seo.indexing_enabled' => true]);
    $visible = publicNewsFixture();
    $hidden = collect([
        ['is_public' => false], ['audience' => 'students'], ['audience' => 'admins'],
        ['status' => 'draft'], ['status' => 'archived'], ['status' => 'scheduled'],
        ['published_at' => now()->addDay()], ['starts_at' => now()->addDay()], ['ends_at' => now()->subDay()],
    ])->map(fn ($attributes) => publicNewsFixture($attributes));

    $this->get('/berita')->assertOk()->assertHeaderMissing('X-Robots-Tag')->assertInertia(fn (Assert $page) => $page
        ->component('Public/Berita/Index')->has('news.data', 1)->where('news.data.0.id', $visible->id)
        ->missing('news.data.0.body')->missing('news.data.0.attachments')->missing('news.data.0.created_by'));
    $this->get('/')->assertOk()->assertInertia(fn (Assert $page) => $page
        ->has('latestNews', 1)->where('latestNews.0.id', $visible->id)->missing('latestNews.0.body'));
    $this->get(route('public.news.show', $visible))->assertOk()->assertHeaderMissing('X-Robots-Tag')->assertInertia(fn (Assert $page) => $page
        ->component('User/Berita/DetailBerita')->where('publicView', true)->where('seo.type', 'article')
        ->where('seo.canonical', route('public.news.show', $visible))->has('relatedNews', 0));
    $sitemap = $this->get('/sitemap.xml')->assertOk()->assertSee(route('public.news.show', $visible));
    foreach ($hidden as $news) {
        $this->get(route('public.news.show', $news))->assertNotFound();
        $sitemap->assertDontSee(route('public.news.show', $news));
    }
    $this->actingAs(Pengguna::factory()->create(['role' => 'user']))
        ->get(route('public.news.show', $hidden->first()))->assertNotFound();
});

it('keeps internal student news accessible to students without making it public', function () {
    $news = publicNewsFixture(['is_public' => false, 'audience' => 'students']);
    $this->get(route('user.news.show', $news))->assertRedirect(route('login'));
    $this->actingAs(Pengguna::factory()->create(['role' => 'user']))
        ->get(route('user.news.show', $news))->assertOk();
    $this->get(route('public.news.show', $news))->assertNotFound();
});

it('saves public defaults, hides and restores news while retaining omitted visibility on legacy updates', function () {
    $admin = Pengguna::factory()->create(['role' => 'superadmin']);
    $this->actingAs($admin);
    $payload = ['title' => 'Berita Publik', 'status' => 'published', 'audience' => 'all', 'category' => 'platform'];
    $this->post(route('superadmin.content.news.store'), $payload)->assertRedirect()->assertSessionHasNoErrors();
    $news = Berita::where('title', $payload['title'])->firstOrFail();
    expect($news->is_public)->toBeTrue();
    $url = route('superadmin.content.news.update', $news);
    $this->put($url, [...$payload, 'is_public' => false])->assertSessionHasNoErrors();
    expect($news->fresh()->is_public)->toBeFalse();
    $this->get(route('public.news.show', $news))->assertNotFound();
    $this->put($url, $payload)->assertSessionHasNoErrors();
    expect($news->fresh()->is_public)->toBeFalse();
    $this->put($url, [...$payload, 'is_public' => true])->assertSessionHasNoErrors();
    $this->get(route('public.news.show', $news))->assertOk();
    $this->put($url, [...$payload, 'audience' => 'admins', 'is_public' => true])->assertSessionHasNoErrors();
    expect($news->fresh()->is_public)->toBeFalse();
    $this->putJson($url, [...$payload, 'is_public' => 'invalid'])->assertUnprocessable()->assertJsonValidationErrors('is_public');
    $this->actingAs(Pengguna::factory()->create(['role' => 'user']))->put($url, $payload)->assertForbidden();
});

it('filters and paginates public news without loading full articles and limits the landing to three', function () {
    for ($i = 0; $i < 12; $i++) {
        publicNewsFixture(['title' => 'Artikel '.$i, 'category' => $i % 2 ? 'platform' : 'tips-belajar']);
    }
    $pinned = publicNewsFixture(['title' => 'Panduan Unggulan', 'is_pinned' => true, 'published_at' => now()->subYear()]);
    $this->get('/')->assertOk()->assertInertia(fn (Assert $page) => $page
        ->has('latestNews', 3)->where('latestNews.0.id', $pinned->id));
    $this->get('/berita')->assertOk()->assertInertia(fn (Assert $page) => $page->has('news.data', 9)->where('news.total', 13));
    $this->get('/berita?page=2')->assertOk()->assertInertia(fn (Assert $page) => $page->has('news.data', 4));
    $this->get('/berita?search=Unggulan&category=tips-belajar')->assertOk()->assertInertia(fn (Assert $page) => $page
        ->has('news.data', 1)->where('news.data.0.id', $pinned->id));
    $this->get('/berita?search=tidak-ada')->assertOk()->assertInertia(fn (Assert $page) => $page->has('news.data', 0));
    $this->get('/berita?category=platform')->assertOk()->assertInertia(fn (Assert $page) => $page->has('news.data', 6));
});

it('sanitizes legacy HTML and only recommends visible news in the same category', function () {
    $article = publicNewsFixture(['body' => '<p onclick="alert(1)">Isi<img src="x" onerror="alert(2)"></p><a href="javascript:alert(3)">Tautan</a>']);
    for ($i = 0; $i < 5; $i++) publicNewsFixture();
    publicNewsFixture(['category' => 'platform']);
    publicNewsFixture(['is_public' => false]);
    $this->get(route('public.news.show', $article))->assertOk()->assertInertia(fn (Assert $page) => $page
        ->has('relatedNews', 3)->where('newsItem.body', fn ($body) => ! str_contains($body, 'onclick')
            && ! str_contains($body, 'onerror') && ! str_contains($body, 'javascript:')));
});

it('loads summary images without per-article queries and respects empty and indexing-disabled states', function () {
    $this->get('/')->assertOk()->assertInertia(fn (Assert $page) => $page->has('latestNews', 0));
    $this->get('/berita')->assertOk()->assertInertia(fn (Assert $page) => $page->has('news.data', 0));
    config(['seo.indexing_enabled' => false]);
    $this->get('/sitemap.xml')->assertNotFound();
    for ($i = 0; $i < 4; $i++) {
        $news = publicNewsFixture();
        $news->attachments()->create(['file_name' => 'cover.jpg', 'file_type' => 'image', 'file_path' => 'news/cover.jpg', 'sort_order' => 0]);
    }
    DB::enableQueryLog();
    DB::flushQueryLog();
    $service = app(PublicNewsService::class);
    $items = $service->summariesQuery()->get()->map($service->summary(...));
    $queries = DB::getQueryLog();
    DB::disableQueryLog();
    expect($queries)->toHaveCount(1)->and($items)->toHaveCount(4)
        ->and($items->first()['thumbnail_url'])->toBe(asset('storage/news/cover.jpg'));
});
