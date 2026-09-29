<?php

namespace App\Services;

use App\Models\DeviceLogin;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cookie;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Cookie as SymfonyCookie;

/**
 * Keeps a user logged in on one device until they log out there. The session
 * cookie stays short-lived, its ID is rotated every two hours, and it is only
 * valid while its device login exists; a separate
 * httpOnly device cookie, backed by a device_logins row, silently starts a
 * fresh session whenever the old one has expired. Each restore swaps the
 * device token for a new one; the previous token keeps working for a short
 * grace period (parallel requests), and presenting it after that means the
 * cookie was copied, so the device login is revoked. Logging out deletes only
 * that device's row, so other devices stay logged in.
 */
class DeviceLoginService
{
    public const COOKIE = 'device_login';

    public const COOKIE_MINUTES = 60 * 24 * 400;

    public const ROTATE_AFTER_SECONDS = 60 * 60 * 2;

    public const TOKEN_GRACE_SECONDS = 60;

    private const SESSION_DEVICE_LOGIN_ID = 'device_login_id';

    private const SESSION_ROTATED_AT = 'device_login_rotated_at';

    public function logIn(Request $request, User $user): void
    {
        DeviceLogin::whereKey($request->session()->get(self::SESSION_DEVICE_LOGIN_ID))->delete();

        $token = Str::random(64);
        $deviceLogin = $user->deviceLogins()->create([
            'token_hash' => hash('sha256', $token),
            ...$this->clientDetails($request),
        ]);

        $this->startSession($request, $deviceLogin);
        Cookie::queue($this->makeCookie("{$deviceLogin->id}|{$token}"));
    }

    public function restore(Request $request): void
    {
        $cookieValue = $request->cookie(self::COOKIE);
        if (! is_string($cookieValue)) {
            return;
        }

        [$deviceLogin, $tokenHash] = $this->findByCookie($cookieValue);
        if (! $deviceLogin) {
            Cookie::queue(Cookie::forget(self::COOKIE));

            return;
        }

        $rotatedCookieValue = $this->rotateToken($request, $deviceLogin, $tokenHash);
        if ($rotatedCookieValue === null && ! $this->isWithinGracePeriod($deviceLogin, $tokenHash)) {
            if ($this->isPreviousToken($deviceLogin, $tokenHash)) {
                $deviceLogin->delete();
            }
            Cookie::queue(Cookie::forget(self::COOKIE));

            return;
        }

        $this->startSession($request, $deviceLogin);
        if ($rotatedCookieValue !== null) {
            Cookie::queue($this->makeCookie($rotatedCookieValue));
        }
    }

    /**
     * Runs on every authenticated request: once the device login is revoked
     * (logout elsewhere, reuse detection, pruning) any session it started ends
     * immediately. Sessions from before device logins existed end here too.
     */
    public function verifySession(Request $request): void
    {
        $session = $request->session();
        $deviceLogin = DeviceLogin::find($session->get(self::SESSION_DEVICE_LOGIN_ID));
        if (! $deviceLogin || $deviceLogin->user_id !== Auth::guard('web')->id()) {
            $this->endSession($request);

            return;
        }

        $rotatedAt = (int) $session->get(self::SESSION_ROTATED_AT, 0);
        if (now()->timestamp - $rotatedAt < self::ROTATE_AFTER_SECONDS) {
            return;
        }

        $session->regenerate(true);
        $session->put(self::SESSION_ROTATED_AT, now()->timestamp);
        $deviceLogin->update($this->clientDetails($request));
    }

    public function logOut(Request $request): void
    {
        DeviceLogin::whereKey($request->session()->get(self::SESSION_DEVICE_LOGIN_ID))->delete();

        $this->endSession($request);
        Cookie::queue(Cookie::forget(self::COOKIE));
    }

    private function startSession(Request $request, DeviceLogin $deviceLogin): void
    {
        Auth::guard('web')->login($deviceLogin->user);

        $session = $request->session();
        $session->regenerate(true);
        $session->put([
            self::SESSION_DEVICE_LOGIN_ID => $deviceLogin->id,
            self::SESSION_ROTATED_AT => now()->timestamp,
        ]);
    }

    private function endSession(Request $request): void
    {
        Auth::guard('web')->logoutCurrentDevice();
        $request->session()->invalidate();
        $request->session()->regenerateToken();
    }

    /**
     * @return array{0: ?DeviceLogin, 1: string}
     */
    private function findByCookie(string $cookieValue): array
    {
        [$id, $token] = array_pad(explode('|', $cookieValue, 2), 2, '');
        $tokenHash = hash('sha256', $token);
        if (! ctype_digit($id) || $token === '') {
            return [null, $tokenHash];
        }

        $deviceLogin = DeviceLogin::with('user')->find((int) $id);
        $matches = $deviceLogin
            && (hash_equals($deviceLogin->token_hash, $tokenHash) || $this->isPreviousToken($deviceLogin, $tokenHash));

        return [$matches ? $deviceLogin : null, $tokenHash];
    }

    /**
     * Compare-and-swap on the current hash, so of several parallel requests
     * holding the same token only one rotates it; the others land in the grace
     * period. Returns the new cookie value, or null when nothing was rotated.
     */
    private function rotateToken(Request $request, DeviceLogin $deviceLogin, string $tokenHash): ?string
    {
        $token = Str::random(64);
        $rotated = DeviceLogin::whereKey($deviceLogin->id)
            ->where('token_hash', $tokenHash)
            ->update([
                'token_hash' => hash('sha256', $token),
                'previous_token_hash' => $tokenHash,
                'token_rotated_at' => now(),
                ...$this->clientDetails($request),
            ]);

        $deviceLogin->refresh();

        return $rotated ? "{$deviceLogin->id}|{$token}" : null;
    }

    private function isPreviousToken(DeviceLogin $deviceLogin, string $tokenHash): bool
    {
        return $deviceLogin->previous_token_hash !== null
            && hash_equals($deviceLogin->previous_token_hash, $tokenHash);
    }

    private function isWithinGracePeriod(DeviceLogin $deviceLogin, string $tokenHash): bool
    {
        return $this->isPreviousToken($deviceLogin, $tokenHash)
            && $deviceLogin->token_rotated_at?->isAfter(now()->subSeconds(self::TOKEN_GRACE_SECONDS));
    }

    private function makeCookie(string $value): SymfonyCookie
    {
        return Cookie::make(self::COOKIE, $value, self::COOKIE_MINUTES);
    }

    private function clientDetails(Request $request): array
    {
        return [
            'ip_address' => $request->ip(),
            'user_agent' => Str::limit((string) $request->userAgent(), 500, ''),
            'last_used_at' => now(),
        ];
    }
}
