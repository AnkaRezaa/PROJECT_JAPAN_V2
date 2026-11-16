<?php

use App\Models\Pengguna;
use App\Services\BetaAccessService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;
use Laravel\Socialite\Contracts\Provider;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\User as GoogleUser;
use Symfony\Component\Process\Process;

beforeEach(function () {
    Notification::fake();
});

function configureBeta(array $extra = []): void
{
    DB::table('app_settings')->where('key', 'beta_access')->update(['value' => json_encode(array_merge([
        'enabled' => true, 'registration_open' => true, 'opens_at' => null, 'opened_at' => null,
    ], $extra))]);
}

test('beta takes final slot and rejects next email signup without creating account', function () {
    configureBeta();
    Pengguna::factory()->count(49)->create(['beta_registered_at' => now()]);
    $payload = ['name' => 'Last beta', 'email' => 'lastbeta@example.com', 'password' => 'password', 'password_confirmation' => 'password'];
    $this->post('/register', $payload)->assertSessionHasNoErrors();
    expect(app(BetaAccessService::class)->count())->toBe(50);
    $this->assertDatabaseHas('users', ['email' => 'lastbeta@example.com', 'email_verified_at' => null]);
    auth()->logout();
    $this->post('/register', [...$payload, 'email' => 'overflowbeta@example.com'])->assertSessionHasErrors('beta');
    $this->assertDatabaseMissing('users', ['email' => 'overflowbeta@example.com']);
});

test('mode inactive preserves ordinary registration and closed registration rejects new users', function () {
    configureBeta(['registration_open' => false]);
    $payload = ['name' => 'Beta', 'email' => 'closedbeta@example.com', 'password' => 'password', 'password_confirmation' => 'password'];
    $this->post('/register', $payload)->assertSessionHasErrors('beta');
    configureBeta(['enabled' => false]);
    $this->post('/register', $payload)->assertSessionHasNoErrors();
    expect(Pengguna::where('email', $payload['email'])->firstOrFail()->beta_registered_at)->toBeNull();
});

test('waiting beta cannot read application or mutate learning payments and live endpoints', function () {
    configureBeta();
    $student = Pengguna::factory()->create(['beta_registered_at' => now()]);
    $this->actingAs($student)->get('/user/dashboard')->assertRedirect(route('user.beta.waiting'));
    foreach (['/user/exams/library', '/user/kelas', '/notifications/page'] as $url) {
        $this->getJson($url)->assertStatus(423);
    }
    foreach (['/payments/midtrans/checkout', '/user/quick-quiz/start', '/profile/access-keys/redeem'] as $url) {
        $this->postJson($url)->assertStatus(423);
    }
    $this->get(route('user.beta.waiting'))->assertInertia(fn (Assert $page) => $page->component('User/Beta/Waiting'));
    $this->get(route('profile.edit'))->assertOk();
    $this->get(route('roadmap'))->assertOk();
    expect($student->fresh()->subscription_status)->toBe($student->subscription_status);
});

test('old accounts and staff are not pending while email verification still required', function () {
    configureBeta();
    foreach (['user', 'admin', 'superadmin'] as $role) {
        $user = Pengguna::factory()->create(['role' => $role]);
        expect(app(BetaAccessService::class)->pending($user))->toBeFalse();
    }
    $pending = Pengguna::factory()->unverified()->create(['beta_registered_at' => now()]);
    $this->actingAs($pending)->get(route('user.beta.waiting'))->assertRedirect(route('verification.notice'));
});

test('schedule opens exactly at boundary and cannot be moved back to relock', function () {
    $this->travelTo(now()->startOfMinute());
    configureBeta(['opens_at' => now()->addMinute()->toIso8601String()]);
    $student = Pengguna::factory()->create(['beta_registered_at' => now()]);
    expect(app(BetaAccessService::class)->pending($student))->toBeTrue();
    $this->travel(1)->minutes();
    expect(app(BetaAccessService::class)->pending($student))->toBeFalse();
    app(BetaAccessService::class)->update(['enabled' => true, 'registration_open' => false, 'opens_at' => now()->addDay()->setTimezone('Asia/Jakarta')->format('Y-m-d\TH:i')]);
    expect(app(BetaAccessService::class)->pending($student))->toBeFalse();
    $this->actingAs($student)->get(route('user.beta.waiting'))->assertRedirect(route('user.dashboard'));
});

test('only superadmin can update beta and disabling needs confirmation', function () {
    configureBeta();
    $payload = ['enabled' => false, 'registration_open' => false, 'opens_at' => null];
    $this->actingAs(Pengguna::factory()->create(['role' => 'admin']))->put('/superadmin/system/beta', $payload)->assertForbidden();
    $this->actingAs(Pengguna::factory()->create(['role' => 'superadmin']))->put('/superadmin/system/beta', $payload)->assertSessionHasErrors('enabled');
    $this->put('/superadmin/system/beta', [...$payload, 'confirm_disable' => true])->assertSessionHasNoErrors();
    expect(app(BetaAccessService::class)->settings()['enabled'])->toBeFalse();
    $this->put('/superadmin/system/beta', ['enabled' => true, 'registration_open' => false, 'opens_at' => '2026-12-01T09:00'])->assertSessionHasNoErrors();
    expect(app(BetaAccessService::class)->settings()['opens_at'])->toBe('2026-12-01T02:00:00+00:00');
    $this->put('/superadmin/system/beta', ['enabled' => true, 'registration_open' => false, 'opens_at' => null, 'open_now' => true])->assertSessionHasNoErrors();
    expect(app(BetaAccessService::class)->settings()['opened_at'])->not->toBeNull();
});

test('google new accounts honor beta quota but existing login still works', function () {
    configureBeta(['registration_open' => false]);
    $google = GoogleUser::fake(['id' => 'beta-google', 'name' => 'Beta Google', 'email' => 'beta-google@example.com', 'email_verified' => true]);
    $provider = Mockery::mock(Provider::class);
    $provider->shouldReceive('user')->twice()->andReturn($google);
    Socialite::shouldReceive('driver')->with('google')->twice()->andReturn($provider);
    $this->withSession(['auth.google.intent' => 'login'])->get(route('auth.google.callback'))->assertSessionHasErrors('beta');
    $this->assertDatabaseMissing('users', ['email' => 'beta-google@example.com']);
    $old = Pengguna::factory()->create(['email' => 'beta-google@example.com']);
    $this->withSession(['auth.google.intent' => 'login'])->get(route('auth.google.callback'))->assertRedirect(route('user.dashboard'));
    expect($old->fresh()->beta_registered_at)->toBeNull();
});

test('missing settings fails closed instead of allowing pending users', function () {
    $student = Pengguna::factory()->create(['beta_registered_at' => now()]);
    DB::table('app_settings')->where('key', 'beta_access')->delete();
    expect(fn () => app(BetaAccessService::class)->pending($student))->toThrow(RuntimeException::class);
});

test('two committed parallel registrations compete safely for the final slot', function () {
    expect(DB::connection()->getDatabaseName())->toBe('Project_japan_test');
    $old = app(BetaAccessService::class)->settings();
    configureBeta();
    $users = Pengguna::factory()->count(49)->create(['beta_registered_at' => now()]);
    DB::commit();
    $emails = ['beta-concurrency-'.bin2hex(random_bytes(6)).'@example.com', 'beta-concurrency-'.bin2hex(random_bytes(6)).'@example.com'];
    try {
        $processes = array_map(fn ($email) => new Process([PHP_BINARY, base_path('tests/Support/beta-registration-worker.php'), $email], base_path(), ['APP_ENV' => 'testing', 'NIGHTWATCH_ENABLED' => 'false', 'TELESCOPE_ENABLED' => 'false']), $emails);
        foreach ($processes as $process) {
            $process->start();
        }
        foreach ($processes as $process) {
            $process->wait();
            expect($process->isSuccessful())->toBeTrue($process->getErrorOutput());
        }
        $results = array_map(fn ($process) => trim($process->getOutput()), $processes);
        sort($results);
        expect($results)->toBe(['created', 'full'])->and(app(BetaAccessService::class)->count())->toBe(50);
    } finally {
        Pengguna::whereIn('email', $emails)->delete();
        Pengguna::whereIn('id', $users->modelKeys())->delete();
        DB::table('app_settings')->where('key', 'beta_access')->update(['value' => json_encode($old)]);
        DB::beginTransaction();
    }
});
