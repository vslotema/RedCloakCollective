<?php

use App\Models\DeviceLogin;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('topics:prune-orphaned')->daily();
Schedule::command('model:prune', ['--model' => [DeviceLogin::class]])->daily();
