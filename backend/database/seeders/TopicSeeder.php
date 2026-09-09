<?php

namespace Database\Seeders;

use App\Models\Topic;
use Illuminate\Database\Seeder;

class TopicSeeder extends Seeder
{
    /**
     * The canonical topic taxonomy. Every slug referenced by
     * App\Support\OnboardingTopicMap must exist here.
     *
     * @var array<string, string> slug => display name
     */
    private const TOPICS = [
        'everyday-caregiving' => 'Everyday caregiving',
        'mobility-positioning' => 'Mobility & positioning',
        'wheelchairs-equipment' => 'Wheelchairs & equipment',
        'communication-aac' => 'Communication & AAC',
        'assistive-technology' => 'Assistive technology',
        'feeding-nutrition' => 'Feeding & nutrition',
        'therapy-rehabilitation' => 'Therapy & rehabilitation',
        'seizures-complex-medical' => 'Seizures & complex medical',
        'education-school-support' => 'Education & school support',
        'services-benefits-funding' => 'Services, benefits & funding',
        'respite-caregiver-wellbeing' => 'Respite & caregiver wellbeing',
        'community-relationships' => 'Community & relationships',
        'transition-to-adulthood' => 'Transition to adulthood',
        'personal-stories' => 'Personal stories',
        'how-to-guides' => 'How-to guides',
        'self-advocacy' => 'Self-advocacy',
        'cerebral-palsy' => 'Cerebral palsy',
        'autism' => 'Autism',
        'rett-syndrome' => 'Rett syndrome',
        'down-syndrome' => 'Down syndrome',
        'genetic-chromosomal-conditions' => 'Genetic & chromosomal conditions',
        'intellectual-developmental-disability' => 'Intellectual & developmental disability',
        'neurological-conditions' => 'Neurological conditions',
        'physical-mobility-disability' => 'Physical & mobility disability',
        'speech-language-needs' => 'Speech & language needs',
        'sensory-disability' => 'Sensory disability',
    ];

    public function run(): void
    {
        foreach (self::TOPICS as $slug => $name) {
            Topic::updateOrCreate(['slug' => $slug], ['name' => $name, 'curated' => true]);
        }
    }
}
