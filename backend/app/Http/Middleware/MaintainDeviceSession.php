<?php

namespace App\Http\Middleware;

use App\Services\DeviceLoginService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class MaintainDeviceSession
{
    public function __construct(private DeviceLoginService $deviceLogins) {}

    public function handle(Request $request, Closure $next): Response
    {
        if ($request->hasSession()) {
            Auth::guard('web')->check()
                ? $this->deviceLogins->rotateIfDue($request)
                : $this->deviceLogins->restore($request);
        }

        return $next($request);
    }
}
