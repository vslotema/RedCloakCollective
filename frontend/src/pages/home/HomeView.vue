<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import RecommendationPanel from './components/RecommendationPanel.vue'
import PageContainer from '@/components/content/PageContainer.vue'

const route = useRoute()
const authStore = useAuthStore()
const activeTab = computed(() => (route.name === 'explore' ? 'explore' : 'home'))
const showRecommendations = computed(
  () => activeTab.value === 'home' && (authStore.user?.hasFollows ?? true),
)
</script>

<template>
  <div class="home">
    <PageContainer class="content" variant="wide">
      <div class="main px-8">
        <v-tabs :model-value="activeTab" color="ink">
          <v-tab value="home" :to="{ name: 'home' }" :ripple="false">For you</v-tab>
          <v-tab value="explore" :to="{ name: 'explore' }" :ripple="false">Explore</v-tab>
        </v-tabs>
        <v-divider class="mb-12"></v-divider>
        <router-view />
      </div>
    </PageContainer>
    <RecommendationPanel v-if="showRecommendations" />
  </div>
</template>

<style scoped lang="scss">
.v-tab:hover :deep(.v-btn__overlay) {
  opacity: 0;
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
}
</style>
