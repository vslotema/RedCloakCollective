<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('username')->nullable()->unique()->after('name');
        });

        $this->backfillUsernames();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('username');
        });
    }

    /**
     * Give every existing user a unique username derived from their name,
     * disambiguating collisions with their id.
     */
    private function backfillUsernames(): void
    {
        DB::table('users')->orderBy('id')->select('id', 'name')->chunkById(100, function ($users) {
            foreach ($users as $user) {
                $base = Str::slug($user->name) ?: 'user';
                $username = $base;

                while (DB::table('users')->where('username', $username)->exists()) {
                    $username = "{$base}-{$user->id}";
                }

                DB::table('users')->where('id', $user->id)->update(['username' => $username]);
            }
        });
    }
};
