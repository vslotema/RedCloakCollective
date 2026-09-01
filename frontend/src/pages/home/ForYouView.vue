<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import PageContainer from '@/components/content/PageContainer.vue'
import RecommendationPanel from './components/RecommendationPanel.vue'
import ContentList from '@/components/content/ContentList.vue'
import { mockContentItems } from '@/mocks/contentItems'

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
      <ContentList :items="mockContentItems" />
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
  height: 100%;
  flex: 1;
}
.feed {
  flex: 1 1 auto;
}
</style>
