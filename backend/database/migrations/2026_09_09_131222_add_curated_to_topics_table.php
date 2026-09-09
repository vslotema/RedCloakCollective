<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * `curated` marks the canonical, editorially-maintained taxonomy (the
     * TopicSeeder set) that onboarding and the discovery chip rows draw from.
     * Author-created topics from the publish dialog are added with curated=false
     * — real and followable, but not "featured".
     */
    public function up(): void
    {
        Schema::table('topics', function (Blueprint $table) {
            $table->boolean('curated')->default(false)->after('slug');
        });

        // Everything that exists at this point is the seeded canonical set.
        DB::table('topics')->update(['curated' => true]);
    }

    public function down(): void
    {
        Schema::table('topics', function (Blueprint $table) {
            $table->dropColumn('curated');
        });
    }
};
