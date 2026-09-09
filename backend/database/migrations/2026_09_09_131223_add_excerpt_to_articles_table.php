<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Preview subtitle shown under the title on the article page and on cards /
     * meta descriptions. Optional; set from the publish dialog.
     */
    public function up(): void
    {
        Schema::table('articles', function (Blueprint $table) {
            $table->string('excerpt', 280)->nullable()->after('slug');
        });
    }

    public function down(): void
    {
        Schema::table('articles', function (Blueprint $table) {
            $table->dropColumn('excerpt');
        });
    }
};
