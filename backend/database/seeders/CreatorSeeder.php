<?php

namespace Database\Seeders;

use App\Models\Article;
use App\Models\Topic;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * A handful of authored, published creators so the onboarding/home
 * recommendation panels have something real to suggest in dev/staging.
 * Idempotent — safe to re-run, keyed on username.
 */
class CreatorSeeder extends Seeder
{
    /**
     * @var list<array{name: string, username: string, articles: list<array{title: string, topic: string}>}>
     */
    private const CREATORS = [
        [
            'name' => 'Maria Gonzalez',
            'username' => 'mariagonzalez',
            'articles' => [
                ['title' => 'A week in the life of a full-time caregiver', 'topic' => 'everyday-caregiving'],
                ['title' => 'Why I finally started asking for respite help', 'topic' => 'respite-caregiver-wellbeing'],
            ],
        ],
        [
            'name' => 'David Kim',
            'username' => 'davidkim',
            'articles' => [
                ['title' => 'Choosing the right wheelchair for growing kids', 'topic' => 'wheelchairs-equipment'],
                ['title' => 'Safe transfer techniques for home caregivers', 'topic' => 'mobility-positioning'],
            ],
        ],
        [
            'name' => 'Aisha Bello',
            'username' => 'aishabello',
            'articles' => [
                ['title' => 'Getting started with AAC devices', 'topic' => 'communication-aac'],
                ['title' => 'Apps that changed how my son communicates', 'topic' => 'assistive-technology'],
            ],
        ],
        [
            'name' => 'Tom Whitfield',
            'username' => 'tomwhitfield',
            'articles' => [
                ['title' => 'Feeding therapy: what actually helped us', 'topic' => 'feeding-nutrition'],
                ['title' => 'Building a home rehab routine that sticks', 'topic' => 'therapy-rehabilitation'],
            ],
        ],
        [
            'name' => 'Elena Petrova',
            'username' => 'elenapetrova',
            'articles' => [
                ['title' => 'Living with a seizure action plan', 'topic' => 'seizures-complex-medical'],
                ['title' => 'Understanding a new neurological diagnosis', 'topic' => 'neurological-conditions'],
            ],
        ],
        [
            'name' => 'Marcus Johnson',
            'username' => 'marcusjohnson',
            'articles' => [
                ['title' => 'Advocating for an IEP that actually works', 'topic' => 'education-school-support'],
                ['title' => 'Finding community after diagnosis', 'topic' => 'community-relationships'],
            ],
        ],
        [
            'name' => 'Priya Nair',
            'username' => 'priyanair',
            'articles' => [
                ['title' => 'Navigating disability benefits and funding', 'topic' => 'services-benefits-funding'],
                ['title' => 'Preparing for the transition to adult services', 'topic' => 'transition-to-adulthood'],
            ],
        ],
        [
            'name' => 'Liam O\'Connor',
            'username' => 'liamoconnor',
            'articles' => [
                ['title' => 'The story I wish someone had told me at diagnosis', 'topic' => 'personal-stories'],
                ['title' => 'A step-by-step guide to your first IEP meeting', 'topic' => 'how-to-guides'],
            ],
        ],
        [
            'name' => 'Fatima Al-Sayed',
            'username' => 'fatimaalsayed',
            'articles' => [
                ['title' => 'Cerebral palsy and me: a life in progress', 'topic' => 'cerebral-palsy'],
                ['title' => 'Adapting our home for physical accessibility', 'topic' => 'physical-mobility-disability'],
            ],
        ],
        [
            'name' => 'Grace Chen',
            'username' => 'gracechen',
            'articles' => [
                ['title' => 'Sensory-friendly routines that work for us', 'topic' => 'sensory-disability'],
                ['title' => 'What I wish teachers knew about autism', 'topic' => 'autism'],
            ],
        ],
    ];

    public function run(): void
    {
        $password = Hash::make('password');

        foreach (self::CREATORS as $creator) {
            $user = User::updateOrCreate(
                ['username' => $creator['username']],
                [
                    'name' => $creator['name'],
                    'email' => $creator['username'].'@example.com',
                    'email_verified_at' => now(),
                    'password' => $password,
                ],
            );

            foreach ($creator['articles'] as $article) {
                $topic = Topic::where('slug', $article['topic'])->firstOrFail();

                $record = Article::updateOrCreate(
                    ['user_id' => $user->id, 'title' => $article['title']],
                    [
                        'slug' => Str::slug($article['title']).'-'.$user->username,
                        'content' => fake()->paragraphs(4, true),
                        'published_at' => now(),
                    ],
                );

                $record->topics()->syncWithoutDetaching([$topic->id]);
            }
        }
    }
}
