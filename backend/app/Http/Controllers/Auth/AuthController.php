<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\DeviceLoginService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function __construct(private DeviceLoginService $deviceLogins) {}

    private function locationRules(): array
    {
        return [
            'country' => ['required', 'string', 'size:2'],
            'state' => ['nullable', 'string', 'size:2', 'required_if:country,US'],
        ];
    }

    private function generateUsername(string $name): string
    {
        $base = Str::slug($name) ?: 'user';
        $username = $base;
        $suffix = 1;

        while (DB::table('users')->where('username', $username)->exists()) {
            $suffix++;
            $username = "{$base}-{$suffix}";
        }

        return $username;
    }

    public function register(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            ...$this->locationRules(),
        ]);

        $user = User::create([
            'name' => $data['name'],
            'username' => $this->generateUsername($data['name']),
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'country' => $data['country'],
            'state' => $data['state'] ?? null,
        ]);

        $this->deviceLogins->logIn($request, $user);

        return response()->json(['user' => $user], 201);
    }

    public function login(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $data['email'])->first();

        if (! $user || ! $user->password || ! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => 'Invalid email or password.',
            ]);
        }

        $this->deviceLogins->logIn($request, $user);

        return response()->json(['user' => $user]);
    }

    public function logout(Request $request)
    {
        $this->deviceLogins->logOut($request);

        return response()->noContent();
    }

    public function loginWithGoogle(Request $request)
    {
        $data = $request->validate([
            'credential' => ['required', 'string'],
        ]);

        $response = Http::get('https://oauth2.googleapis.com/tokeninfo', [
            'id_token' => $data['credential'],
        ]);

        if (! $response->successful()) {
            throw ValidationException::withMessages([
                'credential' => 'Could not verify Google sign-in.',
            ]);
        }

        $payload = $response->json();

        if (($payload['aud'] ?? null) !== config('services.google.client_id')
            || ! filter_var($payload['email_verified'] ?? false, FILTER_VALIDATE_BOOLEAN)) {
            throw ValidationException::withMessages([
                'credential' => 'Could not verify Google sign-in.',
            ]);
        }

        $user = User::where('google_id', $payload['sub'])->first()
            ?? User::where('email', $payload['email'])->first();

        if ($user) {
            if (! $user->google_id) {
                $user->forceFill(['google_id' => $payload['sub']])->save();
            }
        } else {
            $name = $payload['name'] ?? $payload['email'];
            $user = User::create([
                'name' => $name,
                'username' => $this->generateUsername($name),
                'email' => $payload['email'],
                'google_id' => $payload['sub'],
                'email_verified_at' => now(),
            ]);
        }

        $this->deviceLogins->logIn($request, $user);

        return response()->json(['user' => $user]);
    }

    public function updateLocation(Request $request)
    {
        $data = $request->validate($this->locationRules());

        $user = $request->user();
        $user->update([
            'country' => $data['country'],
            'state' => $data['state'] ?? null,
        ]);

        return response()->json(['user' => $user->withDashboardFlags()]);
    }
}
