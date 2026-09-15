<script setup lang="ts">
import { mockContentItems } from '~/mocks/contentItems'

definePageMeta({ layout: 'home', middleware: 'auth' })

const { showQuestionnaire, showPersonalize } = useHomeFeedState()
</script>

<template>
  <div v-if="showQuestionnaire" class="onboarding mt-8">
    <h1 class="text-h5">Welcome. Let's set up your feed.</h1>
    <p>Every answer is optional and stays private. We use them only to suggest topics and people worth following.</p>
    <OnboardingQuestionnaire class="mt-4" />
  </div>
  <div v-else-if="showPersonalize" class="onboarding mt-8">
    <PersonalizeFeed />
  </div>
  <div v-else class="mt-8">
    <ContentFilterBar followed class="mb-12"/>
    <ContentList :items="mockContentItems" />
  </div>
</template>

<style scoped lang="scss">
.onboarding {
  max-width: 940px;

  // On mobile the onboarding flow fills the screen height so the questionnaire
  // can stretch and its action bar can pin to the bottom of the viewport.
  @media (max-width: 600px) {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
}
</style>
