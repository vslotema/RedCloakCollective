<?php

use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\FollowController;
use App\Http\Controllers\Public\ArticleController;
use App\Http\Controllers\Public\EquipmentListController;
use App\Http\Controllers\Public\ProfileController;
use App\Http\Controllers\Public\SitemapController;
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
    Route::get('/user', function (Request $request) {
        $user = $request->user();
        $user->hasFollows = $user->following()->exists() || $user->followedTopics()->exists();

        return $user;
    });

    Route::post('/logout', [AuthController::class, 'logout']);
    Route::patch('/user/location', [AuthController::class, 'updateLocation']);

    Route::post('/users/{user:username}/follow', [FollowController::class, 'store']);
    Route::delete('/users/{user:username}/follow', [FollowController::class, 'destroy']);
});
