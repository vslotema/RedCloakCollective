<?php

use App\Http\Controllers\Auth\AuthController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/health', function () {
    return response()->json(['status' => 'ok']);
});

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/auth/google', [AuthController::class, 'loginWithGoogle']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', function (Request $request) {
        $user = $request->user();
        $user->hasFollows = $user->following()->exists() || $user->followedTopics()->exists();

        return $user;
    });

    Route::post('/logout', [AuthController::class, 'logout']);
    Route::patch('/user/location', [AuthController::class, 'updateLocation']);
});
