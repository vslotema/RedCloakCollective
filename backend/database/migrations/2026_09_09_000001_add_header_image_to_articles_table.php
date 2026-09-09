<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('articles', function (Blueprint $table) {
            // Relative path on the 'public' disk; exposed to the frontend as a
            // full URL via the model's header_image_url accessor.
            $table->string('header_image_path')->nullable()->after('content');
            // Focal point for the cover crop, as { "x": 0-100, "y": 0-100 }
            // percentages — mirrors the editor's headerImagePosition.
            $table->json('header_image_position')->nullable()->after('header_image_path');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('articles', function (Blueprint $table) {
            $table->dropColumn(['header_image_path', 'header_image_position']);
        });
    }
};
