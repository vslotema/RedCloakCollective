<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { onboardingQuestions, type Question } from '@/types/onboarding'
import SelectableOption from './SelectableOption.vue'

const authStore = useAuthStore()

const step = ref(0)
const saving = ref(false)
const answers = reactive<Record<string, string | string[] | undefined>>({})
const otherText = reactive<Record<string, string | undefined>>({})

const totalQuestions = onboardingQuestions.length
const summaryStep = totalQuestions
const isLastQuestion = computed(() => step.value === summaryStep)
const currentQuestion = computed<Question | undefined>(() => onboardingQuestions[step.value])

// One dot per question plus the review slide.
const totalSteps = totalQuestions + 1

function goToStep(index: number) {
  step.value = index
}

function isSelected(question: Question, value: string): boolean {
  const current = answers[question.key]
  return question.multiple ? Array.isArray(current) && current.includes(value) : current === value
}

function toggleOption(question: Question, value: string) {
  if (question.multiple) {
    const current = Array.isArray(answers[question.key]) ? [...(answers[question.key] as string[])] : []
    const index = current.indexOf(value)
    if (index === -1) current.push(value)
    else current.splice(index, 1)
    answers[question.key] = current
  } else {
    answers[question.key] = answers[question.key] === value ? undefined : value
  }
}

function hasOtherSelected(question: Question): boolean {
  const otherValue = question.options.find((o) => o.hasOtherText)?.value
  if (!otherValue) return false
  return isSelected(question, otherValue)
}

function formatAnswer(question: Question): string {
  const current = answers[question.key]
  const values = Array.isArray(current) ? current : current ? [current] : []
  if (values.length === 0) return 'Skipped'

  const labels = values.map((value) => {
    const option = question.options.find((o) => o.value === value)
    if (option?.hasOtherText && otherText[question.key]) {
      return `${option.label}: ${otherText[question.key]}`
    }
    return option?.label ?? value
  })
  return labels.join(', ')
}

function buildPayload() {
  const payload: Record<string, unknown> = {}
  for (const question of onboardingQuestions) {
    payload[question.key] = answers[question.key] ?? null
    if (hasOtherSelected(question) && otherText[question.key]) {
      payload[`${question.key}_other`] = otherText[question.key]
    }
  }
  return payload
}

async function submitAndClose() {
  saving.value = true
  try {
    await authStore.saveOnboardingAnswers(buildPayload())
  } finally {
    saving.value = false
  }
}

function back() {
  if (step.value > 0) step.value--
}

function next() {
  if (isLastQuestion.value) {
    submitAndClose()
  } else {
    step.value++
  }
}

// Skip = leave this question unanswered (it shows as "Skipped" in the summary)
// and move on to the next one — not abandon the whole questionnaire.
function skip() {
  const question = onboardingQuestions[step.value]
  if (question) {
    answers[question.key] = undefined
    otherText[question.key] = undefined
  }
  step.value++
}
</script>

<template>
  <div class="questionnaire">
    <div class="questionnaire__viewport">
      <div class="questionnaire__slide">
        <template v-if="currentQuestion">
          <h2 class="text-large mb-1">{{ currentQuestion.title }}</h2>
          <p class="text-body-2 mb-6">{{ currentQuestion.helper }}</p>
          <div
            class="questionnaire__options"
            :class="{ 'questionnaire__options--two-col': currentQuestion.twoColumn }"
          >
            <SelectableOption
              v-for="option in currentQuestion.options"
              :key="option.value"
              :label="option.label"
              :multiple="currentQuestion.multiple"
              :active="isSelected(currentQuestion, option.value)"
              @toggle="toggleOption(currentQuestion, option.value)"
            />
          </div>
          <v-text-field
            v-if="hasOtherSelected(currentQuestion)"
            v-model="otherText[currentQuestion.key]"
            placeholder="Tell us more"
            variant="outlined"
            density="compact"
            class="mt-2"
            hide-details
          />
        </template>

        <template v-else>
          <h2 class="text-h5 font-weight-bold mb-1">Here's what you told us</h2>
          <p class="text-body-2 mb-6">
            You can update this anytime from Settings.
          </p>
          <div v-for="(question, index) in onboardingQuestions" :key="question.key" class="mb-4">
            <div class="question text-subtitle-2 font-weight-bold d-flex align-center ga-1">
              <span>{{ question.title }}</span>
              <v-btn
                icon="$edit"
                size="x-small"
                variant="text"
                :aria-label="`Edit answer for: ${question.title}`"
                @click="goToStep(index)"
              />
            </div>
            <div class="question-answer text-body-2">{{ formatAnswer(question) }}</div>
          </div>
        </template>
      </div>
    </div>

    <div class="questionnaire__dots" role="presentation">
      <span
        v-for="i in totalSteps"
        :key="i"
        class="questionnaire__dot"
        :class="{ 'questionnaire__dot--active': i - 1 === step }"
        @click="goToStep(i - 1)"
      />
    </div>

    <div class="questionnaire__actions d-flex justify-end ga-2">
      <v-btn v-if="step > 0" variant="text" :disabled="saving" @click="back">Back</v-btn>
      <v-btn v-if="!isLastQuestion" variant="text" :disabled="saving" @click="skip">Skip question</v-btn>
      <v-btn color="primary" rounded="pill" class="font-weight-bold" :loading="saving" @click="next">
        {{ isLastQuestion ? 'Finish' : 'Next' }}
      </v-btn>
    </div>
  </div>
</template>

<style scoped lang="scss">
.questionnaire {
  // Fixed width across every step so the questions stay left-aligned and the
  // action buttons don't shift when a two-column step comes up.
  width: 100%;
  max-width: 940px;

  // Take whatever height is left on screen, capped so the option area is never
  // taller than 500px. The ~280px reserve covers the app bar, tabs and intro
  // text above this component.
  display: flex;
  flex-direction: column;
  height: min(525px, calc(100dvh - 280px));
  min-height: 360px;
}

.questionnaire__dots {
  flex: 0 0 auto;
  display: flex;
  justify-content: center;
  gap: var(--space-1);
  padding-top: var(--space-3);
}

.questionnaire__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  cursor: pointer;
  background: rgb(var(--v-theme-on-surface-variant));
  opacity: 0.25;
  transition: opacity 0.2s ease, width 0.2s ease;

  &--active {
    width: 16px;
    border-radius: 3px;
    opacity: 0.6;
  }
}

.questionnaire__viewport {
  flex: 1 1 auto;
  min-height: 0;
  max-height: 525px;
  overflow: hidden;
  padding: .25rem 1rem 0 1rem;
  background: rgb(var(--v-theme-surface));
  border-radius: 0.5rem;
}

.questionnaire__slide {
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  padding: var(--space-2) var(--space-1) var(--space-6);
}

.question,
.question-answer {
  color: rgb(var(--v-theme-on-surface-variant));
}

.questionnaire__actions {
  flex: 0 0 auto;
  padding-top: var(--space-4);
}

// On mobile the questionnaire fills the rest of the screen and the action row
// is pinned to the bottom of the viewport.
@media (max-width: 600px) {
  .questionnaire {
    max-width: none;
    flex: 1;
    height: auto;
    min-height: 0;
  }

  .questionnaire__viewport {
    max-height: none;
  }

  .questionnaire__slide {
    // Clear the fixed action bar so the last option isn't hidden behind it.
    padding-bottom: calc(var(--space-6) + 56px);
  }

  .questionnaire__dots {
    // Sit just above the fixed action bar instead of behind it.
    position: fixed;
    left: 0;
    right: 0;
    bottom: 56px;
    z-index: 5;
    padding: var(--space-2) 0;
    background: rgb(var(--v-theme-background));
  }

  .questionnaire__actions {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 5;
    padding: var(--space-3) var(--space-4);
    background: rgb(var(--v-theme-background));
    border-top: 1px solid rgb(var(--v-theme-border-color));
  }
}

.questionnaire__options {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);

  // Two columns, filled row by row so the left and right options line up.
  &--two-col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    align-items: stretch;

    @media (max-width: 700px) {
      grid-template-columns: 1fr;
    }
  }
}
</style>
