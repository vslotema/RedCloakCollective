<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import RecommendationPanel from './components/RecommendationPanel.vue'
import PageContainer from '@/components/content/PageContainer.vue'

const route = useRoute()
const authStore = useAuthStore()
const activeTab = computed(() => (route.name === 'explore' ? 'explore' : 'home'))
const canShowRecommendations = computed(() => authStore.user?.hasFollows ?? true)
</script>

<template>
  <div class="home">
    <PageContainer class="content" variant="wide">
      <div class="main px-8">
        <div class="tabs-bar">
          <v-tabs :model-value="activeTab" color="ink">
            <v-tab value="home" :to="{ name: 'home' }" :ripple="false">For you</v-tab>
            <v-tab value="explore" :to="{ name: 'explore' }" :ripple="false">Explore</v-tab>
          </v-tabs>
          <v-divider class="mb-8"></v-divider>
        </div>
        <router-view v-slot="{ Component }">
          <keep-alive>
            <component :is="Component" />
          </keep-alive>
        </router-view>
      </div>
    </PageContainer>
    <template v-if="canShowRecommendations">
      <RecommendationPanel v-show="activeTab === 'home'" class="sidebar" />
    </template>
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
