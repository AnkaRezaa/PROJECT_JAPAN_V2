<?php

use Inertia\Testing\AssertableInertia as Assert;

it('provides a public prelaunch preview without changing the default homepage', function () {
    $this->get(route('public.release-soon'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Public/ReleaseSoon')
            ->where('seo.title', 'TOKU-UP - Release Soon')
            ->where('seo.robots', 'noindex, nofollow')
            ->where('seo.canonical', route('public.release-soon'))
            ->missing('programs')
            ->missing('latestNews'));

    $this->get(route('home'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('LandingPage'));
});

it('keeps the two pages separate even if obsolete cached configuration is enabled', function () {
    config(['beta.prelaunch_enabled' => true]);

    $this->get(route('home'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('LandingPage')
            ->where('seo.canonical', route('home'))
            ->has('programs'));

    $this->get(route('public.release-soon'))->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('Public/ReleaseSoon'));

    $this->get(route('login'))->assertOk();
    $this->get(route('admin.programs.index'))->assertRedirect(route('login'));
});
