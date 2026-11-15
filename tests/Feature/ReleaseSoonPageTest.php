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
            ->where('seo.canonical', route('public.release-soon'))
            ->missing('programs')
            ->missing('latestNews'));

    $this->get(route('home'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('LandingPage'));
});

it('shows coming soon at home while keeping a public landing preview and authentication available', function () {
    config(['beta.prelaunch_enabled' => true]);

    $this->get(route('home'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Public/ReleaseSoon')
            ->where('seo.canonical', route('home'))
            ->missing('programs'));

    $this->get(route('public.landing-preview'))->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('LandingPage')
            ->where('seo.canonical', route('public.landing-preview'))
            ->where('seo.robots', 'noindex, nofollow')->has('programs')->has('latestNews'));

    $this->get(route('public.release-soon'))->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('Public/ReleaseSoon'));

    $this->get(route('login'))->assertOk();
    $this->get(route('admin.programs.index'))->assertRedirect(route('login'));
});

it('temporarily redirects the preview to the real homepage after prelaunch ends', function () {
    config(['beta.prelaunch_enabled' => false]);
    $this->get(route('public.landing-preview'))->assertStatus(302)->assertRedirect(route('home'));
    $this->get(route('home'))->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('LandingPage')->where('seo.canonical', route('home')));
    $this->get(route('public.release-soon'))->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('Public/ReleaseSoon')->where('seo.canonical', route('public.release-soon')));
});

it('switches both routes without leaving a permanent redirect behind', function () {
    config(['beta.prelaunch_enabled' => false]);
    $this->get(route('public.landing-preview'))->assertStatus(302);
    config(['beta.prelaunch_enabled' => true]);
    $this->get(route('public.landing-preview'))->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('LandingPage'));
    $this->get(route('home'))->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('Public/ReleaseSoon'));
});
