<?php

use App\Models\HariModul;
use App\Models\LevelPembelajaran;
use App\Models\Modul;
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

test('public roadmap returns the published Week and Day hierarchy from the default class', function () {
    $program = createSeoProgram();
    $publishedWeek = Modul::create([
        'level_id' => $program->level_id,
        'program_pembelajaran_id' => $program->id,
        'title' => 'Fondasi Kosakata',
        'week_number' => 1,
        'description' => 'Membangun fondasi kelas.',
        'status' => 'published',
    ]);
    $draftWeek = Modul::create([
        'level_id' => $program->level_id,
        'program_pembelajaran_id' => $program->id,
        'title' => 'Week Draft',
        'week_number' => 2,
        'status' => 'draft',
    ]);
    HariModul::create([
        'module_id' => $publishedWeek->id,
        'day_number' => 1,
        'title' => 'Perkenalan Kosakata',
        'description' => 'Ringkasan Hari pertama.',
        'status' => 'published',
    ]);
    HariModul::create([
        'module_id' => $publishedWeek->id,
        'day_number' => 2,
        'title' => 'Hari Draft',
        'status' => 'draft',
    ]);
    HariModul::create([
        'module_id' => $draftWeek->id,
        'day_number' => 1,
        'title' => 'Day dalam Week Draft',
        'status' => 'published',
    ]);

    $this->get(route('roadmap'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Roadmap')
            ->has('roadmapOptions', 1)
            ->where('roadmapOptions.0.slug', $program->slug)
            ->where('roadmapOptions.0.weeks_count', 1)
            ->where('roadmapOptions.0.days_count', 1)
            ->where('selectedRoadmap.slug', $program->slug)
            ->has('selectedRoadmap.weeks', 1)
            ->where('selectedRoadmap.weeks.0.title', 'Fondasi Kosakata')
            ->has('selectedRoadmap.weeks.0.days', 1)
            ->where('selectedRoadmap.weeks.0.days.0.title', 'Perkenalan Kosakata')
        );
});

test('public roadmap can select another published class and rejects an unavailable slug', function () {
    $firstProgram = createSeoProgram();
    Modul::create([
        'level_id' => $firstProgram->level_id,
        'program_pembelajaran_id' => $firstProgram->id,
        'title' => 'Week Pertama',
        'week_number' => 1,
        'status' => 'published',
    ]);
    $secondProgram = ProgramPembelajaran::create([
        'level_id' => $firstProgram->level_id,
        'title' => 'Kelas SSW Terstruktur',
        'slug' => 'kelas-ssw-terstruktur',
        'description' => 'Roadmap persiapan SSW.',
        'status' => 'published',
        'sort_order' => 2,
    ]);
    Modul::create([
        'level_id' => $secondProgram->level_id,
        'program_pembelajaran_id' => $secondProgram->id,
        'title' => 'Pengenalan SSW',
        'week_number' => 1,
        'status' => 'published',
    ]);

    $this->get(route('roadmap', ['kelas' => $secondProgram->slug]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('selectedRoadmap.slug', $secondProgram->slug)
            ->where('selectedRoadmap.weeks.0.title', 'Pengenalan SSW')
        );

    $this->get(route('roadmap', ['kelas' => 'kelas-tidak-tersedia']))->assertNotFound();
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
