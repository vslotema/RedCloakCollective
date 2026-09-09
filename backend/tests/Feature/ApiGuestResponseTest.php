<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class ApiGuestResponseTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Guest requests to protected /api routes must return a 401 JSON body even
     * without an Accept: application/json header — this is an API-only backend
     * with no "login" route to redirect to.
     */
    #[DataProvider('protectedRoutes')]
    public function test_guest_gets_json_401_without_accept_header(string $method, string $uri): void
    {
        $response = $this->call($method, $uri);

        $response->assertUnauthorized();
        $this->assertSame('Unauthenticated.', $response->json('message'));
    }

    public static function protectedRoutes(): array
    {
        return [
            'GET /api/user' => ['get', '/api/user'],
            'GET /api/onboarding/recommendations' => ['get', '/api/onboarding/recommendations'],
            'POST /api/onboarding/personalize' => ['post', '/api/onboarding/personalize'],
            'POST /api/topics/{slug}/follow' => ['post', '/api/topics/anything/follow'],
            'GET /api/me/articles' => ['get', '/api/me/articles'],
            'POST /api/articles' => ['post', '/api/articles'],
            'PUT /api/articles/{article}' => ['put', '/api/articles/1'],
            'DELETE /api/articles/{article}' => ['delete', '/api/articles/1'],
            'POST /api/articles/{article}/header-image' => ['post', '/api/articles/1/header-image'],
            'DELETE /api/articles/{article}/header-image' => ['delete', '/api/articles/1/header-image'],
            'POST /api/articles/{article}/images' => ['post', '/api/articles/1/images'],
        ];
    }
}
