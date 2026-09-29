<?php

namespace Tests\Feature;

use App\Models\DeviceLogin;
use App\Models\User;
use App\Services\DeviceLoginService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class DeviceLoginTest extends TestCase
{
    use RefreshDatabase;

    private const FRONTEND = ['Referer' => 'http://localhost:3000/'];

    private function logIn(User $user): TestResponse
    {
        $response = $this->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'password',
        ], self::FRONTEND);

        $this->forgetRequestState();

        return $response;
    }

    private function forgetRequestState(): void
    {
        Auth::forgetGuards();
        $this->app['session']->forgetDrivers();
        $this->app->forgetInstance('session.store');
        $this->app['cookie']->flushQueuedCookies();
    }

    private function deviceCookie(TestResponse $response): string
    {
        return $response->getCookie(DeviceLoginService::COOKIE)->getValue();
    }

    public function test_login_sets_an_http_only_device_cookie_and_returns_no_token(): void
    {
        $user = User::factory()->create();

        $response = $this->logIn($user);

        $response->assertOk()->assertJsonMissingPath('token');
        $cookie = $response->getCookie(DeviceLoginService::COOKIE, decrypt: false);
        $this->assertTrue($cookie->isHttpOnly());
        $this->assertSame(1, $user->deviceLogins()->count());
    }

    public function test_device_cookie_restores_the_login_once_the_session_is_gone(): void
    {
        $user = User::factory()->create();
        $cookie = $this->deviceCookie($this->logIn($user));

        $this->withCredentials()->withCookie(DeviceLoginService::COOKIE, $cookie)
            ->getJson('/api/user', self::FRONTEND)
            ->assertOk()
            ->assertJsonPath('id', $user->id)
            ->assertCookie(DeviceLoginService::COOKIE)
            ->assertSessionHas('device_login_id');
    }

    private function restoreWith(string $cookie): TestResponse
    {
        $response = $this->withCredentials()
            ->withCookie(DeviceLoginService::COOKIE, $cookie)
            ->getJson('/api/user', self::FRONTEND);

        $this->forgetRequestState();

        return $response;
    }

    public function test_restoring_rotates_the_device_token(): void
    {
        $user = User::factory()->create();
        $original = $this->deviceCookie($this->logIn($user));

        $rotated = $this->deviceCookie($this->restoreWith($original)->assertOk());

        $this->assertNotSame($original, $rotated);
        $this->restoreWith($rotated)->assertOk();
    }

    public function test_previous_token_still_restores_during_the_grace_period_without_reissuing(): void
    {
        $user = User::factory()->create();
        $original = $this->deviceCookie($this->logIn($user));
        $rotated = $this->deviceCookie($this->restoreWith($original));

        $this->travel(DeviceLoginService::TOKEN_GRACE_SECONDS - 5)->seconds();

        $this->restoreWith($original)
            ->assertOk()
            ->assertCookieMissing(DeviceLoginService::COOKIE);
        $this->restoreWith($rotated)->assertOk();
    }

    public function test_reusing_a_previous_token_after_the_grace_period_revokes_the_device(): void
    {
        $user = User::factory()->create();
        $stolen = $this->deviceCookie($this->logIn($user));
        $rotated = $this->deviceCookie($this->restoreWith($stolen));

        $this->travel(DeviceLoginService::TOKEN_GRACE_SECONDS + 1)->seconds();

        $this->restoreWith($stolen)
            ->assertUnauthorized()
            ->assertCookieExpired(DeviceLoginService::COOKIE);
        $this->restoreWith($rotated)->assertUnauthorized();
        $this->assertSame(0, $user->deviceLogins()->count());
    }

    public function test_invalid_device_cookie_is_rejected_and_cleared(): void
    {
        $user = User::factory()->create();
        $cookie = $this->deviceCookie($this->logIn($user));
        [$id] = explode('|', $cookie);

        $this->withCredentials()->withCookie(DeviceLoginService::COOKIE, "{$id}|not-the-token")
            ->getJson('/api/user', self::FRONTEND)
            ->assertUnauthorized()
            ->assertCookieExpired(DeviceLoginService::COOKIE);
    }

    public function test_logout_only_ends_the_current_device(): void
    {
        $user = User::factory()->create();
        $laptop = $this->deviceCookie($this->logIn($user));
        $phone = $this->deviceCookie($this->logIn($user));

        $this->withCredentials()->withCookie(DeviceLoginService::COOKIE, $laptop)
            ->postJson('/api/logout', [], self::FRONTEND)
            ->assertNoContent()
            ->assertCookieExpired(DeviceLoginService::COOKIE);
        $this->forgetRequestState();

        $this->withCredentials()->withCookie(DeviceLoginService::COOKIE, $laptop)
            ->getJson('/api/user', self::FRONTEND)
            ->assertUnauthorized();
        $this->forgetRequestState();

        $this->withCredentials()->withCookie(DeviceLoginService::COOKIE, $phone)
            ->getJson('/api/user', self::FRONTEND)
            ->assertOk();
        $this->assertSame(1, $user->deviceLogins()->count());
    }

    public function test_session_id_is_rotated_after_two_hours(): void
    {
        $this->freezeTime();
        $user = User::factory()->create();
        $deviceLogin = $user->deviceLogins()->create(['token_hash' => str_repeat('a', 64)]);

        $this->actingAs($user, 'web')
            ->withSession([
                'device_login_id' => $deviceLogin->id,
                'device_login_rotated_at' => now()->subSeconds(DeviceLoginService::ROTATE_AFTER_SECONDS)->timestamp,
            ])
            ->getJson('/api/user', self::FRONTEND)
            ->assertOk()
            ->assertSessionHas('device_login_rotated_at', now()->timestamp);

        $this->assertNotNull($deviceLogin->fresh()->last_used_at);
    }

    public function test_session_ends_at_rotation_when_the_device_login_was_revoked(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'web')
            ->withSession([
                'device_login_id' => 999,
                'device_login_rotated_at' => now()->subHours(3)->timestamp,
            ])
            ->getJson('/api/user', self::FRONTEND)
            ->assertUnauthorized();
    }

    public function test_stale_device_logins_are_pruned(): void
    {
        $user = User::factory()->create();
        $stale = $user->deviceLogins()->create([
            'token_hash' => str_repeat('a', 64),
            'last_used_at' => now()->subMinutes(DeviceLoginService::COOKIE_MINUTES + 1),
        ]);
        $fresh = $user->deviceLogins()->create([
            'token_hash' => str_repeat('b', 64),
            'last_used_at' => now(),
        ]);

        $this->artisan('model:prune', ['--model' => [DeviceLogin::class]])->assertSuccessful();

        $this->assertModelMissing($stale);
        $this->assertModelExists($fresh);
    }
}
