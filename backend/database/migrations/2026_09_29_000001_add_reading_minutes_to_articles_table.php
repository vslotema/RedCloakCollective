<?php

use App\Support\ReadingTime;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('articles', function (Blueprint $table) {
            $table->unsignedSmallInteger('reading_minutes')->default(1)->after('content');
        });

        DB::table('articles')->select(['id', 'content'])->orderBy('id')->chunkById(200, function ($articles) {
            foreach ($articles as $article) {
                DB::table('articles')->where('id', $article->id)->update([
                    'reading_minutes' => ReadingTime::minutesFor(json_decode($article->content, true)),
                ]);
            }
        });
    }

    public function down(): void
    {
        Schema::table('articles', function (Blueprint $table) {
            $table->dropColumn('reading_minutes');
        });
    }
};
