<?php

use App\Models\Pengguna;
use App\Services\SocialLinksSettings;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;

function emptySocialLinks(): array
{
    return array_fill_keys(array_keys(SocialLinksSettings::HOSTS), null);
}

it('restricts social link management to superadmins', function () {
    $url = route('superadmin.system.social-links.update');
    $this->put($url, ['links' => emptySocialLinks()])->assertRedirect(route('login'));
    foreach ([['role' => 'user'], ['role' => 'admin', 'admin_scope' => 'global'], ['role' => 'admin', 'admin_scope' => 'kloter']] as $role) {
        $this->actingAs(Pengguna::factory()->create($role))->put($url, ['links' => emptySocialLinks()])->assertForbidden();
    }
    expect(DB::table('app_settings')->where('key', 'social_links')->exists())->toBeFalse();
});

it('saves updates and removes social links without changing other settings and invalidates public cache', function () {
    $admin = Pengguna::factory()->create(['role' => 'superadmin']);
    $service = app(SocialLinksSettings::class);
    DB::table('app_settings')->insert(['key' => 'social_test_other', 'value' => json_encode(['keep' => true])]);
    expect($service->all())->toBe([]);
    $links = [...emptySocialLinks(), 'instagram' => 'https://www.instagram.com/tokuup_test', 'threads' => 'https://www.threads.com/@tokuup_test'];
    $url = route('superadmin.system.social-links.update');
    $this->actingAs($admin)->put($url, ['links' => $links])->assertRedirect()->assertSessionHasNoErrors();
    expect($service->all())->toBe(array_filter($links));
    $this->get(route('superadmin.system'))->assertOk()->assertInertia(fn (Assert $page) => $page->where('socialLinks.instagram', $links['instagram']));
    $this->get('/')->assertOk()->assertInertia(fn (Assert $page) => $page
        ->where('socialLinks.instagram', $links['instagram'])->missing('socialLinks.facebook'));
    $this->put($url, ['links' => [...$links, 'instagram' => 'https://instagram.com/new_test']])->assertSessionHasNoErrors();
    expect($service->all()['instagram'])->toBe('https://instagram.com/new_test');
    $this->put($url, ['links' => emptySocialLinks()])->assertSessionHasNoErrors();
    expect($service->all())->toBe([])
        ->and(json_decode(DB::table('app_settings')->where('key', 'social_test_other')->value('value'), true))->toBe(['keep' => true]);
    $this->assertDatabaseHas('activity_logs', ['action' => 'update_social_links', 'actor_id' => $admin->id]);
});

it('rejects unsafe mismatched and unknown social URLs with field errors', function () {
    $this->actingAs(Pengguna::factory()->create(['role' => 'superadmin']));
    $url = route('superadmin.system.social-links.update');
    foreach (['javascript:alert(1)', 'http://instagram.com/test', 'https://instagram.com.evil.test/test', 'https://evil.test/instagram.com', 'https://user:pass@instagram.com/test', 'https://youtube.com/test', 'https://instagram.com:8443/test', str_repeat('x', 501)] as $invalid) {
        $this->putJson($url, ['links' => [...emptySocialLinks(), 'instagram' => $invalid]])
            ->assertUnprocessable()->assertJsonValidationErrors('links.instagram');
    }
    $this->putJson($url, ['links' => [...emptySocialLinks(), 'unknown' => 'https://example.com']])->assertUnprocessable()->assertJsonValidationErrors('links');
    expect(DB::table('app_settings')->where('key', 'social_links')->exists())->toBeFalse();
});

it('does not expose invalid or unknown stored social links and accepts official alternate hosts', function () {
    DB::table('app_settings')->insert(['key' => 'social_links', 'value' => json_encode([
        'instagram' => 'javascript:alert(1)', 'x' => 'https://twitter.com/tokuup_test',
        'threads' => 'https://threads.net/@tokuup_test', 'token' => 'not-public',
    ])]);
    Cache::forget('public_social_links');
    expect(app(SocialLinksSettings::class)->all())->toBe([
        'threads' => 'https://threads.net/@tokuup_test', 'x' => 'https://twitter.com/tokuup_test',
    ]);
});
