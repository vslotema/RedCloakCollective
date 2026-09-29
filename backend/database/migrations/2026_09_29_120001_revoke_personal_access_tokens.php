<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Bearer tokens used to live in the browser's localStorage. Auth is now
     * cookie-only, so every previously issued token is revoked.
     */
    public function up(): void
    {
        DB::table('personal_access_tokens')->delete();
    }

    public function down(): void {}
};
