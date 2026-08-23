<?php

use App\Models\LevelPembelajaran;
use App\Models\ProgramPembelajaran;
use Inertia\Testing\AssertableInertia as Assert;

function createSeoProgram(array $overrides = []): ProgramPembelajaran
{
    $level = LevelPembelajaran::create([
        'level_name' => 'N3',
        'stage' => 300,
        'is_premium' => false,
    ]);

    return ProgramPembelajaran::create([
        'level_id' => $level->id,
        'title' => 'Kelas JLPT N3 Terstruktur',
        'slug' => 'kelas-jlpt-n3-terstruktur',
        'description' => 'Kelas bahasa Jepang dengan roadmap dan latihan mingguan.',
        'status' => 'published',
        'sort_order' => 1,
        ...$overrides,
    ]);
}

test('public page renders complete metadata in initial html while indexing is disabled', function () {
    config()->set('seo.indexing_enabled', false);

    $this->get('/')
        ->assertOk()
        ->assertHeader('X-Robots-Tag', 'noindex, nofollow')
        ->assertSee('<meta inertia="description"', false)
        ->assertSee('<link inertia="canonical"', false)
        ->assertSee('property="og:title"', false)
        ->assertSee('application/ld+json', false)
        ->assertSee('noindex, nofollow', false);
});

test('published class has an indexable public detail payload', function () {
    config()->set('seo.indexing_enabled', true);
    $program = createSeoProgram();

    $this->get(route('public.classes.show', $program->slug))
        ->assertOk()
        ->assertHeaderMissing('X-Robots-Tag')
        ->assertInertia(fn (Assert $page) => $page
            ->component('Public/Kelas/Show')
            ->where('program.slug', $program->slug)
            ->where('seo.robots', 'index, follow')
            ->where('seo.structured_data.0.@type', 'Course')
        );
});

test('unpublished class is not available publicly', function () {
    $program = createSeoProgram([
        'slug' => 'kelas-draft',
        'status' => 'draft',
    ]);

    $this->get(route('public.classes.show', $program->slug))->assertNotFound();
});

test('robots and sitemap follow the indexing switch', function () {
    $program = createSeoProgram();

    config()->set('seo.indexing_enabled', false);
    $this->get(route('robots'))->assertOk()->assertSee('Disallow: /');
    $this->get(route('sitemap'))->assertNotFound();

    config()->set('seo.indexing_enabled', true);
    $this->get(route('robots'))
        ->assertOk()
        ->assertSee('Sitemap: '.route('sitemap'));
    $this->get(route('sitemap'))
        ->assertOk()
        ->assertHeader('Content-Type', 'application/xml; charset=UTF-8')
        ->assertSee(route('public.classes.show', $program->slug), false);
});

test('private and authentication pages remain noindex after public indexing is enabled', function () {
    config()->set('seo.indexing_enabled', true);

    $this->get(route('login'))
        ->assertOk()
        ->assertHeader('X-Robots-Tag', 'noindex, nofollow');
});
