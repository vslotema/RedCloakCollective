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
        // Added nullable first: SQLite can't ALTER TABLE ADD a UNIQUE / NOT NULL
        // column onto a table that already has rows. The seeder and factory
        // always populate it; the unique index below still forbids duplicates.
        Schema::table('topics', function (Blueprint $table) {
            $table->string('slug')->nullable()->after('name');
        });

        foreach (DB::table('topics')->whereNull('slug')->get() as $topic) {
            DB::table('topics')->where('id', $topic->id)->update([
                'slug' => Str::slug($topic->name).'-'.$topic->id,
            ]);
        }

        Schema::table('topics', function (Blueprint $table) {
            $table->unique('slug');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('topics', function (Blueprint $table) {
            $table->dropUnique(['slug']);
            $table->dropColumn('slug');
        });
    }
};
