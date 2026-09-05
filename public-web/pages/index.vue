<script setup lang="ts">
import { mockContentItems } from '~/mocks/contentItems'

definePageMeta({ layout: 'default', middleware: 'auth' })

const authStore = useAuthStore()
const hasFollows = computed(() => authStore.user?.hasFollows ?? true)
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
          <v-divider class="mb-8"></v-divider>
        </div>

        <div v-if="false" class="onboarding">
          <!-- Stub content: topic-picker and people-worth-following data is not wired up yet. -->
          <h1 class="text-h4 font-weight-bold mb-2">Pick a few topics to get started</h1>
        </div>
        <div v-else>
          <!-- Stub content: filter bar is visual-only and does not affect ContentList yet. -->
          <ContentFilterBar />
          <v-divider class="mb-12"></v-divider>
          <ContentList :items="mockContentItems" />
        </div>
      </div>
    </PageContainer>
    <template v-if="true">
      <RecommendationPanel class="sidebar" />
    </template>
  </div>
</template>

<style scoped lang="scss">
.v-tab:hover :deep(.v-btn__overlay) {
  opacity: 0;
}
.onboarding {
  max-width: 600px;
  margin: 0 auto;
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
