<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import ContentList from '@/components/content/ContentList.vue'
import ContentFilterBar from '@/components/content/filters/ContentFilterBar.vue'
import { mockContentItems } from '@/mocks/contentItems'
import PageContainer from '@/components/content/PageContainer.vue'

const authStore = useAuthStore()
const hasFollows = computed(() => authStore.user?.hasFollows ?? true)

</script>

<template>
  <PageContainer variant="centered">
    <div v-if="!hasFollows" class="onboarding">
      <!-- Stub content: topic-picker and people-worth-following data is not wired up yet. -->
      <h1 class="text-h4 font-weight-bold mb-2">Pick a few topics to get started</h1>
    </div>
    <div v-else>
      <!-- Stub content: filter bar is visual-only and does not affect ContentList yet. -->
      <ContentFilterBar />
      <v-divider class="mb-12"></v-divider>
      <ContentList :items="mockContentItems" />
    </div>
  </PageContainer>
</template>

<style scoped lang="scss">
.onboarding {
  max-width: 600px;
  margin: 0 auto;
}
</style>
