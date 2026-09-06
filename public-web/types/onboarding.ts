export interface QuestionOption {
  value: string
  label: string
  /** Reveals a free-text field when this option is selected. */
  hasOtherText?: boolean
}

export interface Question {
  key: string
  title: string
  helper: string
  multiple: boolean
  /** Lay the options out in two aligned columns (for long lists). */
  twoColumn?: boolean
  options: QuestionOption[]
}

export const onboardingQuestions: Question[] = [
  {
    key: 'role',
    title: 'Which best describes you?',
    helper: 'Select one. This helps us tailor your experience.',
    multiple: false,
    options: [
      { value: 'person_with_disability', label: 'Person with a disability' },
      { value: 'parent_guardian', label: 'Parent or guardian' },
      { value: 'family_caregiver', label: 'Family member or caregiver' },
      { value: 'professional_support_worker', label: 'Professional support worker' },
      {
        value: 'both_disability_and_caregiver',
        label: 'Both a person with a disability and a caregiver',
      },
      { value: 'here_to_learn_connect', label: 'Here to learn and connect' },
      { value: 'other', label: 'Other', hasOtherText: true },
      { value: 'prefer_not_to_say', label: 'Prefer not to say' },
    ],
  },
  {
    key: 'content_interests',
    title: 'What kind of content would be most helpful to you right now?',
    helper: 'Select all that apply.',
    multiple: true,
    twoColumn: true,
    options: [
      { value: 'everyday_caregiving', label: 'Everyday caregiving and routines' },
      { value: 'mobility_positioning_transfers', label: 'Mobility, positioning, and transfers' },
      { value: 'wheelchairs_adaptive_equipment', label: 'Wheelchairs and adaptive equipment' },
      {
        value: 'communication_assistive_tech',
        label: 'Communication and assistive technology',
      },
      { value: 'feeding_swallowing_nutrition', label: 'Feeding, swallowing, and nutrition' },
      { value: 'therapy_rehabilitation', label: 'Therapy and rehabilitation' },
      { value: 'seizures_complex_medical', label: 'Seizures or complex medical needs' },
      { value: 'education_school_support', label: 'Education and school support' },
      {
        value: 'disability_services_benefits_funding',
        label: 'Disability services, benefits, and funding',
      },
      {
        value: 'respite_care_caregiver_wellbeing',
        label: 'Respite care and caregiver wellbeing',
      },
      {
        value: 'relationships_inclusion_community',
        label: 'Relationships, inclusion, and community life',
      },
      { value: 'transitioning_to_adulthood', label: 'Transitioning to adulthood' },
      { value: 'personal_stories', label: 'Personal stories and lived experiences' },
      { value: 'practical_how_to_guides', label: 'Practical how-to guides' },
      { value: 'mainly_here_to_connect', label: "I'm mainly here to connect with others" },
      { value: 'not_sure_yet', label: "I'm not sure yet" },
      { value: 'other', label: 'Other', hasOtherText: true },
    ],
  },
  {
    key: 'conditions',
    title: 'Which conditions or support needs are relevant to you?',
    helper: 'Select all that apply. Choose only what you feel comfortable sharing.',
    multiple: true,
    twoColumn: true,
    options: [
      { value: 'cerebral_palsy', label: 'Cerebral palsy' },
      { value: 'autism', label: 'Autism' },
      { value: 'rett_syndrome', label: 'Rett syndrome' },
      { value: 'down_syndrome', label: 'Down syndrome' },
      {
        value: 'other_genetic_chromosomal',
        label: 'Other genetic or chromosomal condition',
      },
      {
        value: 'intellectual_developmental_disability',
        label: 'Intellectual or developmental disability',
      },
      { value: 'neurological_condition', label: 'Neurological condition' },
      { value: 'physical_mobility_disability', label: 'Physical or mobility-related disability' },
      {
        value: 'communication_speech_needs',
        label: 'Communication or speech-related support needs',
      },
      {
        value: 'sensory_disability',
        label: 'Sensory disability, including vision or hearing',
      },
      {
        value: 'complex_medical_multiple_needs',
        label: 'Complex medical or multiple support needs',
      },
      { value: 'other', label: 'Another condition or support need', hasOtherText: true },
      { value: 'not_sure', label: "I'm not sure" },
      { value: 'prefer_not_to_say', label: 'Prefer not to say' },
    ],
  },
  {
    key: 'motivations',
    title: 'What brings you to the platform?',
    helper: 'Select all that apply.',
    multiple: true,
    twoColumn: true,
    options: [
      { value: 'find_community', label: 'Find community' },
      { value: 'learn_from_others', label: "Learn from other people's experiences" },
      { value: 'get_practical_advice', label: 'Get practical advice' },
      { value: 'discover_resources_services', label: 'Discover resources and services' },
      { value: 'share_my_experiences', label: 'Share my own experiences' },
      { value: 'find_follow_creators', label: 'Find or follow specific creators' },
      { value: 'explore_at_own_pace', label: 'Explore topics at my own pace' },
      { value: 'feel_less_alone', label: 'Feel less alone' },
      { value: 'support_someone', label: 'Support someone I care about' },
      { value: 'other', label: 'Other', hasOtherText: true },
      { value: 'not_sure_yet', label: "I'm not sure yet" },
    ],
  },
]

/** value(s) selected per question key, single string or string[] depending on `multiple` */
export type OnboardingAnswers = Record<string, string | string[] | undefined>

/** free-text "other" values per question key */
export type OnboardingOtherText = Record<string, string | undefined>
