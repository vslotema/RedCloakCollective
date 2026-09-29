<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('device_logins', function (Blueprint $table) {
            $table->char('previous_token_hash', 64)->nullable()->after('token_hash');
            $table->timestamp('token_rotated_at')->nullable()->after('previous_token_hash');
        });
    }

    public function down(): void
    {
        Schema::table('device_logins', function (Blueprint $table) {
            $table->dropColumn(['previous_token_hash', 'token_rotated_at']);
        });
    }
};
