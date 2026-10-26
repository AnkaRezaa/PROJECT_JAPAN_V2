<?php

use App\Models\Pengguna;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;
use Laravel\Socialite\Contracts\Provider;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\User as SocialiteUser;
use Tests\TestCase;

beforeEach(function () {
    $directory = sys_get_temp_dir().DIRECTORY_SEPARATOR.'tokuup-auth-sessions-'.Str::uuid();
    File::ensureDirectoryExists($directory);
    config(['session.files' => $directory]);

    Route::middleware(['web', 'auth'])->get('/_test/auth-session', function (Request $request) {
        return response()->json(['user_id' => $request->user()->id]);
    });
});

afterEach(function () {
    app('session')->forgetDrivers();
    $directory = realpath(config('session.files'));
    $prefix = rtrim(realpath(sys_get_temp_dir()), '\\/').DIRECTORY_SEPARATOR.'tokuup-auth-sessions-';

    if ($directory && str_starts_with($directory, $prefix)) {
        File::deleteDirectory($directory);
    }
});

function authSecurityBrowserRequest(TestCase $test, string $method, string $uri, array $data = [], array $cookies = []): TestResponse
{
    // Each request must resolve authentication from its own browser cookies.
    Auth::forgetGuards();
    app('session')->forgetDrivers();
    app()->forgetInstance('session.store');
    app()->forgetInstance('cookie');

    return $test->call($method, $uri, $data, $cookies, [], ['HTTP_ACCEPT' => 'application/json']);
}

function authSecurityBrowserCookies(TestResponse $response, array $cookies = []): array
{
    foreach ($response->headers->getCookies() as $cookie) {
        $cookies[$cookie->getName()] = $cookie->getValue();
    }

    return $cookies;
}

test('OTP password reset rejects both existing browser sessions and the old remember cookie', function (string $driver) {
    config(['session.driver' => $driver]);
    $user = Pengguna::factory()->create(['password_login_enabled' => true]);

    $firstLogin = authSecurityBrowserRequest($this, 'POST', '/login', [
        'email' => $user->email, 'password' => 'password', 'remember' => true,
    ])->assertRedirect(route('user.dashboard', absolute: false));
    $firstCookies = authSecurityBrowserCookies($firstLogin);

    $secondLogin = authSecurityBrowserRequest($this, 'POST', '/login', [
        'email' => $user->email, 'password' => 'password',
    ])->assertRedirect(route('user.dashboard', absolute: false));
    $secondCookies = authSecurityBrowserCookies($secondLogin);

    DB::table('password_reset_tokens')->insert([
        'email' => $user->email, 'token' => Hash::make('123456'), 'created_at' => now(),
    ]);

    authSecurityBrowserRequest($this, 'POST', '/reset-password', [
        'email' => $user->email,
        'otp' => '123456',
        'password' => 'replacement-password',
        'password_confirmation' => 'replacement-password',
    ])->assertRedirect(route('login'));

    authSecurityBrowserRequest($this, 'GET', '/_test/auth-session', [], $firstCookies)->assertUnauthorized();
    authSecurityBrowserRequest($this, 'GET', '/_test/auth-session', [], $secondCookies)->assertUnauthorized();

    $rememberCookies = array_filter($firstCookies, fn ($name) => str_starts_with($name, 'remember_web_'), ARRAY_FILTER_USE_KEY);
    expect($rememberCookies)->toHaveCount(1);
    authSecurityBrowserRequest($this, 'GET', '/_test/auth-session', [], $rememberCookies)->assertUnauthorized();

    $newLogin = authSecurityBrowserRequest($this, 'POST', '/login', [
        'email' => $user->email, 'password' => 'replacement-password',
    ])->assertRedirect(route('user.dashboard', absolute: false));
    authSecurityBrowserRequest($this, 'GET', '/_test/auth-session', [], authSecurityBrowserCookies($newLogin))
        ->assertOk()->assertJson(['user_id' => $user->id]);
})->with(['file', 'database']);

test('changing a password preserves the current browser and rejects other sessions', function (string $driver) {
    config(['session.driver' => $driver]);
    $user = Pengguna::factory()->create(['password_login_enabled' => true]);
    $credentials = ['email' => $user->email, 'password' => 'password'];

    $firstLogin = authSecurityBrowserRequest($this, 'POST', '/login', $credentials)->assertRedirect();
    $firstCookies = authSecurityBrowserCookies($firstLogin);
    $secondLogin = authSecurityBrowserRequest($this, 'POST', '/login', $credentials)->assertRedirect();
    $secondCookies = authSecurityBrowserCookies($secondLogin);

    $changed = authSecurityBrowserRequest($this, 'PUT', '/password', [
        'current_password' => 'password',
        'password' => 'replacement-password',
        'password_confirmation' => 'replacement-password',
    ], $firstCookies)->assertRedirect()->assertSessionHasNoErrors();

    authSecurityBrowserRequest($this, 'GET', '/_test/auth-session', [], authSecurityBrowserCookies($changed, $firstCookies))
        ->assertOk()->assertJson(['user_id' => $user->id]);
    authSecurityBrowserRequest($this, 'GET', '/_test/auth-session', [], $secondCookies)->assertUnauthorized();
    expect(Hash::check('replacement-password', $user->refresh()->password))->toBeTrue();
})->with(['file', 'database']);

test('Google recovery rejects the old password session and remember cookie while keeping its new session', function (string $driver) {
    config(['session.driver' => $driver]);
    $user = Pengguna::factory()->unverified()->create([
        'email' => 'recovered@example.test',
        'google_id' => null,
        'password_login_enabled' => true,
    ]);

    $oldLogin = authSecurityBrowserRequest($this, 'POST', '/login', [
        'email' => $user->email, 'password' => 'password', 'remember' => true,
    ])->assertRedirect(route('user.dashboard', absolute: false));
    $oldCookies = authSecurityBrowserCookies($oldLogin);

    $googleUser = SocialiteUser::fake([
        'id' => 'recovered-google-identity',
        'email' => $user->email,
        'name' => 'Recovered User',
        'email_verified' => true,
    ]);
    $provider = Mockery::mock(Provider::class);
    $provider->shouldReceive('with')->once()->with(['prompt' => 'select_account'])->andReturnSelf();
    $provider->shouldReceive('redirect')->once()->andReturn(redirect()->away('https://accounts.google.test/oauth'));
    $provider->shouldReceive('user')->once()->andReturn($googleUser);
    Socialite::shouldReceive('driver')->twice()->with('google')->andReturn($provider);

    $start = authSecurityBrowserRequest($this, 'GET', route('auth.google.redirect'))
        ->assertRedirect('https://accounts.google.test/oauth');
    $callback = authSecurityBrowserRequest($this, 'GET', route('auth.google.callback'), [], authSecurityBrowserCookies($start))
        ->assertRedirect(route('user.dashboard'));
    $newCookies = authSecurityBrowserCookies($callback);

    authSecurityBrowserRequest($this, 'GET', '/_test/auth-session', [], $oldCookies)->assertUnauthorized();
    $rememberCookies = array_filter($oldCookies, fn ($name) => str_starts_with($name, 'remember_web_'), ARRAY_FILTER_USE_KEY);
    expect($rememberCookies)->toHaveCount(1);
    authSecurityBrowserRequest($this, 'GET', '/_test/auth-session', [], $rememberCookies)->assertUnauthorized();

    authSecurityBrowserRequest($this, 'POST', '/login', ['email' => $user->email, 'password' => 'password'])
        ->assertUnprocessable()->assertJsonValidationErrors('email');
    authSecurityBrowserRequest($this, 'GET', '/_test/auth-session', [], $newCookies)
        ->assertOk()->assertJson(['user_id' => $user->id]);
    expect($user->refresh()->password_login_enabled)->toBeFalse();
})->with(['file', 'database']);
