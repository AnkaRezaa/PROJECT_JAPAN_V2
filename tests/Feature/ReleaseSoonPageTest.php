<?php

use Inertia\Testing\AssertableInertia as Assert;

it('provides a public prelaunch preview without changing the default homepage', function () {
    config(['beta.prelaunch_enabled' => false]);

    $this->get(route('public.release-soon'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Public/ReleaseSoon')
            ->where('seo.title', 'TOKU-UP - Release Soon')
            ->where('seo.robots', 'noindex, nofollow')
            ->missing('programs')
            ->missing('latestNews'));

    $this->get(route('home'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('LandingPage'));
});

it('can display prelaunch at home without replacing authentication routes', function () {
    config(['beta.prelaunch_enabled' => true]);

    $this->get(route('home'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Public/ReleaseSoon')
            ->where('seo.canonical', route('home'))
            ->missing('programs')
            ->missing('activePopup'));

    $this->get(route('login'))->assertOk();
    $this->get(route('admin.programs.index'))->assertRedirect(route('login'));
});
