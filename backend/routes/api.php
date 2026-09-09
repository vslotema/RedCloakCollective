<?php

use App\Http\Controllers\ArticleController as AuthoredArticleController;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\FollowController;
use App\Http\Controllers\OnboardingController;
use App\Http\Controllers\Public\ArticleController;
use App\Http\Controllers\Public\EquipmentListController;
use App\Http\Controllers\Public\ProfileController;
use App\Http\Controllers\Public\SitemapController;
use App\Http\Controllers\TopicFollowController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/health', function () {
    return response()->json(['status' => 'ok']);
});

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/auth/google', [AuthController::class, 'loginWithGoogle']);

// Public, read-only endpoints for the SEO'd content surface (Nuxt app).
// Not wrapped in auth:sanctum — guests must be able to hit these — but
// statefulApi() still lets $request->user() resolve for logged-in viewers.
Route::get('/articles', [ArticleController::class, 'index']);
Route::get('/articles/{article:slug}', [ArticleController::class, 'show']);
Route::get('/lists', [EquipmentListController::class, 'index']);
Route::get('/lists/{list}', [EquipmentListController::class, 'show']);
Route::get('/users/{user:username}', [ProfileController::class, 'show']);
Route::get('/sitemap-urls', [SitemapController::class, 'index']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', fn (Request $request) => $request->user()->withDashboardFlags());

    Route::post('/logout', [AuthController::class, 'logout']);
    Route::patch('/user/location', [AuthController::class, 'updateLocation']);

    // Author-facing article CRUD. The public read side is the unauthenticated
    // GET /articles routes above.
    Route::get('/me/articles', [AuthoredArticleController::class, 'index']);
    Route::get('/me/articles/{article}', [AuthoredArticleController::class, 'show']);
    Route::post('/articles', [AuthoredArticleController::class, 'store']);
    Route::match(['put', 'patch'], '/articles/{article}', [AuthoredArticleController::class, 'update']);
    Route::delete('/articles/{article}', [AuthoredArticleController::class, 'destroy']);
    Route::post('/articles/{article}/header-image', [AuthoredArticleController::class, 'uploadHeaderImage']);
    Route::delete('/articles/{article}/header-image', [AuthoredArticleController::class, 'destroyHeaderImage']);
    Route::post('/articles/{article}/images', [AuthoredArticleController::class, 'uploadBodyImage']);

    Route::post('/users/{user:username}/follow', [FollowController::class, 'store']);
    Route::delete('/users/{user:username}/follow', [FollowController::class, 'destroy']);

    Route::get('/topics/following', [TopicFollowController::class, 'index']);
    Route::post('/topics/{topic:slug}/follow', [TopicFollowController::class, 'store']);
    Route::delete('/topics/{topic:slug}/follow', [TopicFollowController::class, 'destroy']);

    Route::post('/onboarding', [OnboardingController::class, 'store']);
    Route::get('/onboarding/recommendations', [OnboardingController::class, 'recommendations']);
    Route::post('/onboarding/personalize', [OnboardingController::class, 'personalize']);
});
