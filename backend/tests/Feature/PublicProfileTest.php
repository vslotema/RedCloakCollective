<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicProfileTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_sees_no_viewer_relationship(): void
    {
        $author = User::factory()->create();

        $this->getJson("/api/users/{$author->username}")
            ->assertOk()
            ->assertJson(['viewer_is_self' => false, 'viewer_is_following' => false]);
    }

    public function test_token_viewer_sees_their_follow_state(): void
    {
        $author = User::factory()->create();
        $viewer = User::factory()->create();
        $viewer->following()->attach($author);
        $token = $viewer->createToken('test')->plainTextToken;

        $this->withToken($token)
            ->getJson("/api/users/{$author->username}")
            ->assertOk()
            ->assertJson(['viewer_is_self' => false, 'viewer_is_following' => true]);
    }

    public function test_token_viewer_is_recognised_on_their_own_profile(): void
    {
        $author = User::factory()->create();
        $token = $author->createToken('test')->plainTextToken;

        $this->withToken($token)
            ->getJson("/api/users/{$author->username}")
            ->assertOk()
            ->assertJson(['viewer_is_self' => true]);
    }
}
