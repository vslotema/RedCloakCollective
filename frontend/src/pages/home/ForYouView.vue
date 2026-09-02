<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import ContentList from '@/components/content/ContentList.vue'
import { mockContentItems } from '@/mocks/contentItems'

const authStore = useAuthStore()
const hasFollows = computed(() => authStore.user?.hasFollows ?? false)
</script>

<template>
  <div v-if="hasFollows" class="onboarding">
    <!-- Stub content: topic-picker and people-worth-following data is not wired up yet. -->
    <h1 class="text-h4 font-weight-bold mb-2">Pick a few topics to get started</h1>
  </div>
  <div v-else>
    <ContentList :items="mockContentItems" />
  </div>
</template>

<style scoped lang="scss">
.onboarding {
  max-width: 600px;
  margin: 0 auto;
}
</style>
