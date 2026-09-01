<script setup lang="ts">
import { computed } from 'vue'
import PageContainer from '@/components/content/PageContainer.vue'
import { useAuthStore } from '@/stores/auth'
import RecommendationPanel from './components/RecommendationPanel.vue'

const authStore = useAuthStore()
const hasFollows = computed(() => authStore.user?.hasFollows ?? false)
</script>

<template>
  <PageContainer v-if="false" variant="wide">
    <div class="onboarding">
      <!-- Stub content: topic-picker and people-worth-following data is not wired up yet. -->
      <h1 class="text-h4 font-weight-bold mb-2">Pick a few topics to get started</h1>
    </div>
  </PageContainer>
  <div v-else class="for-you">
    <PageContainer variant="wide" class="feed">
      <!-- Stub content: feed data is not wired up yet. -->
      <h1 class="text-h4 font-weight-bold mb-2">For you</h1>
    </PageContainer>
    <RecommendationPanel />
  </div>
</template>

<style scoped lang="scss">
.onboarding {
  max-width: 600px;
  margin: 0 auto;
}
.for-you {
  display: flex;
  min-height: 100%;
}
.feed {
  flex: 1 1 auto;
}
</style>
