<?php

use App\Models\Pengguna;
use Inertia\Testing\AssertableInertia as Assert;

it('provides monitoring links with gtm and ga4 in superadmin activity', function () {
    $superadmin = Pengguna::factory()->create(['role' => 'superadmin']);

    $this->actingAs($superadmin)
        ->get(route('superadmin.activity'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('SuperAdmin/Aktivitas/Aktivitas')
            ->has('monitoringLinks')
            ->has('monitoringLinks.gtm')
            ->where('monitoringLinks.gtm.enabled', false)
            ->where('monitoringLinks.gtm.configured', false)
            ->where('monitoringLinks.ga4', null)
        );
});

it('correctly maps gtm and ga4 status when configured in superadmin activity', function () {
    config()->set('beta.google_tag_manager.enabled', true);
    config()->set('beta.google_tag_manager.id', 'GTM-ABC999');
    config()->set('beta.links.ga4', 'https://analytics.google.com/analytics/web/#/p123456');

    $superadmin = Pengguna::factory()->create(['role' => 'superadmin']);

    $this->actingAs($superadmin)
        ->get(route('superadmin.activity'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('SuperAdmin/Aktivitas/Aktivitas')
            ->where('monitoringLinks.gtm.enabled', true)
            ->where('monitoringLinks.gtm.id', 'GTM-ABC999')
            ->where('monitoringLinks.gtm.configured', true)
            ->where('monitoringLinks.ga4', 'https://analytics.google.com/analytics/web/#/p123456')
        );
});

it('provides analytics status in superadmin system', function () {
    config()->set('beta.google_tag_manager.enabled', true);
    config()->set('beta.google_tag_manager.id', 'GTM-XYZ123');
    config()->set('beta.links.ga4', 'https://analytics.google.com/analytics/web/#/p789012');

    $superadmin = Pengguna::factory()->create(['role' => 'superadmin']);

    $this->actingAs($superadmin)
        ->get(route('superadmin.system'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('SuperAdmin/Sistem/Sistem')
            ->where('analyticsStatus.gtm.enabled', true)
            ->where('analyticsStatus.gtm.id', 'GTM-XYZ123')
            ->where('analyticsStatus.ga4.configured', true)
            ->where('analyticsStatus.ga4.url', 'https://analytics.google.com/analytics/web/#/p789012')
        );
});
