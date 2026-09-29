<?php

namespace App\Models;

use App\Services\DeviceLoginService;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\MassPrunable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['token_hash', 'previous_token_hash', 'token_rotated_at', 'ip_address', 'user_agent', 'last_used_at'])]
class DeviceLogin extends Model
{
    use MassPrunable;

    protected function casts(): array
    {
        return [
            'token_rotated_at' => 'datetime',
            'last_used_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function prunable(): Builder
    {
        return static::where('last_used_at', '<', now()->subMinutes(DeviceLoginService::COOKIE_MINUTES));
    }
}
