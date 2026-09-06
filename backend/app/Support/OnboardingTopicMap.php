<?php

namespace App\Support;

/**
 * Translates the frontend-owned onboarding questionnaire answers into topic
 * slugs. This is a discovery signal only — nothing here follows anything; the
 * user picks what to follow on the "Personalize your feed" screen.
 *
 * Each answer maps to a primary topic plus a few *related* topics from the same
 * taxonomy, so even a couple of answers surface a useful spread. The first slug
 * for an answer is its primary/most-relevant one; ordering is preserved
 * downstream (see RecommendationService::recommendedTopics()).
 *
 * Answer values that carry no topic signal (opt-outs, "not sure", "other",
 * free-text "…_other" keys) are simply absent from the map.
 */
final class OnboardingTopicMap
{
    /** @var array<string, list<string>> answer value => topic slug(s), primary first */
    public const MAP = [
        // content_interests
        'everyday_caregiving' => ['everyday-caregiving', 'how-to-guides', 'respite-caregiver-wellbeing'],
        'mobility_positioning_transfers' => ['mobility-positioning', 'physical-mobility-disability', 'wheelchairs-equipment', 'therapy-rehabilitation'],
        'wheelchairs_adaptive_equipment' => ['wheelchairs-equipment', 'assistive-technology', 'mobility-positioning'],
        'communication_assistive_tech' => ['communication-aac', 'assistive-technology', 'speech-language-needs'],
        'feeding_swallowing_nutrition' => ['feeding-nutrition', 'therapy-rehabilitation', 'seizures-complex-medical'],
        'therapy_rehabilitation' => ['therapy-rehabilitation', 'mobility-positioning', 'how-to-guides'],
        'seizures_complex_medical' => ['seizures-complex-medical', 'neurological-conditions', 'everyday-caregiving'],
        'education_school_support' => ['education-school-support', 'self-advocacy', 'transition-to-adulthood'],
        'disability_services_benefits_funding' => ['services-benefits-funding', 'how-to-guides', 'transition-to-adulthood'],
        'respite_care_caregiver_wellbeing' => ['respite-caregiver-wellbeing', 'community-relationships', 'everyday-caregiving'],
        'relationships_inclusion_community' => ['community-relationships', 'personal-stories', 'self-advocacy'],
        'transitioning_to_adulthood' => ['transition-to-adulthood', 'services-benefits-funding', 'self-advocacy', 'education-school-support'],
        'personal_stories' => ['personal-stories', 'community-relationships'],
        'practical_how_to_guides' => ['how-to-guides', 'everyday-caregiving'],

        // conditions
        'cerebral_palsy' => ['cerebral-palsy', 'mobility-positioning', 'therapy-rehabilitation', 'physical-mobility-disability'],
        'autism' => ['autism', 'communication-aac', 'sensory-disability', 'intellectual-developmental-disability'],
        'rett_syndrome' => ['rett-syndrome', 'neurological-conditions', 'communication-aac', 'genetic-chromosomal-conditions'],
        'down_syndrome' => ['down-syndrome', 'intellectual-developmental-disability', 'genetic-chromosomal-conditions'],
        'other_genetic_chromosomal' => ['genetic-chromosomal-conditions', 'intellectual-developmental-disability'],
        'intellectual_developmental_disability' => ['intellectual-developmental-disability', 'education-school-support', 'self-advocacy'],
        'neurological_condition' => ['neurological-conditions', 'seizures-complex-medical', 'therapy-rehabilitation'],
        'physical_mobility_disability' => ['physical-mobility-disability', 'mobility-positioning', 'wheelchairs-equipment'],
        'communication_speech_needs' => ['speech-language-needs', 'communication-aac', 'assistive-technology'],
        'sensory_disability' => ['sensory-disability', 'assistive-technology', 'communication-aac'],
        'complex_medical_multiple_needs' => ['seizures-complex-medical', 'everyday-caregiving', 'neurological-conditions'],

        // role
        'person_with_disability' => ['self-advocacy', 'community-relationships', 'personal-stories'],
        'parent_guardian' => ['everyday-caregiving', 'education-school-support', 'respite-caregiver-wellbeing'],
        'family_caregiver' => ['everyday-caregiving', 'respite-caregiver-wellbeing', 'community-relationships'],
        'professional_support_worker' => ['therapy-rehabilitation', 'how-to-guides', 'communication-aac'],
        'both_disability_and_caregiver' => ['self-advocacy', 'everyday-caregiving', 'community-relationships'],
        'here_to_learn_connect' => ['community-relationships', 'personal-stories', 'how-to-guides'],

        // motivations
        'find_community' => ['community-relationships', 'personal-stories'],
        'learn_from_others' => ['personal-stories', 'community-relationships', 'how-to-guides'],
        'get_practical_advice' => ['how-to-guides', 'everyday-caregiving'],
        'discover_resources_services' => ['services-benefits-funding', 'how-to-guides'],
        'share_my_experiences' => ['personal-stories', 'community-relationships'],
        'feel_less_alone' => ['community-relationships', 'personal-stories', 'respite-caregiver-wellbeing'],
        'support_someone' => ['respite-caregiver-wellbeing', 'everyday-caregiving', 'community-relationships'],
    ];

    /**
     * Flatten the stored OnboardingAnswers (values are string | string[]) into a
     * de-duplicated, order-preserving list of topic slugs. The first time a slug
     * is seen wins its position, so an answer's primary topic ranks ahead of
     * related topics pulled in by later answers.
     *
     * @param  array<string, mixed>|null  $answers
     * @return list<string>
     */
    public static function slugsFor(?array $answers): array
    {
        $slugs = [];

        foreach ((array) $answers as $key => $value) {
            if (str_ends_with((string) $key, '_other')) {
                continue;
            }

            foreach ((array) $value as $answer) {
                foreach (self::MAP[$answer] ?? [] as $slug) {
                    $slugs[$slug] = true;
                }
            }
        }

        return array_keys($slugs);
    }
}
