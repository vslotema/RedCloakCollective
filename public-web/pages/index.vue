<script setup lang="ts">
import { mockContentItems } from '~/mocks/contentItems'

definePageMeta({ layout: 'default', middleware: 'auth' })

const authStore = useAuthStore()
const hasFollows = computed(() => authStore.user?.hasFollows ?? true)
const topicsOnboarded = computed(() => authStore.user?.topicsOnboarded ?? true)
const showOnboarding = computed(() => !hasFollows.value && !topicsOnboarded.value)
</script>

<template>
  <div class="home">
    <PageContainer class="content" variant="wide">
      <div class="main px-8">
        <div class="tabs-bar">
          <v-tabs model-value="home" color="ink">
            <v-tab value="home" :ripple="false">For you</v-tab>
            <v-tab value="explore" to="/home/explore" :ripple="false">Explore</v-tab>
          </v-tabs>
          <v-divider></v-divider>
        </div>

        <div v-if="showOnboarding" class="onboarding mt-8">
          <h1 class="text-h5">Welcome. Let's set up your feed.</h1>
          <p>Every answer is optional and stays private. We use them only to suggest topics and people worth following.</p>
          <OnboardingQuestionnaire  class="mt-4"/>
        </div>
        <div v-else class="mt-8">
          <ContentFilterBar />
          <v-divider class="mb-12"></v-divider>
          <ContentList :items="mockContentItems" />
        </div>
      </div>
    </PageContainer>
    <template v-if="!showOnboarding">
      <RecommendationPanel class="sidebar" />
    </template>
  </div>
</template>

<style scoped lang="scss">
.v-tab:hover :deep(.v-btn__overlay) {
  opacity: 0;
}
.onboarding {
  max-width: 940px;
}
.home {
  display: flex;
  height: 100%;
  .content {
    flex: 1;
    min-width: 0;
    .main {
      flex: 1 1 auto;
      min-width: 0;
      display: flex;
      flex-direction: column;
    }
  }

  // On mobile the onboarding flow fills the screen height so the questionnaire
  // can stretch and its action bar can pin to the bottom of the viewport.
  @media (max-width: 600px) {
    .content {
      display: flex;
      flex-direction: column;
      min-height: 0;

      :deep(.v-container) {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-height: 0;
      }
    }

    .main {
      flex: 1;
      min-height: 0;
    }

    .onboarding {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
    }
  }

  .tabs-bar {
    position: sticky;
    top: var(--v-layout-top, 64px);
    z-index: 3;
    background: rgb(var(--v-theme-background));
  }

  .sidebar {
    align-self: flex-start;
    position: sticky;
    top: var(--v-layout-top, 64px);
    max-height: calc(100dvh - var(--v-layout-top, 64px));
    overflow-y: auto;
  }
}
</style>
