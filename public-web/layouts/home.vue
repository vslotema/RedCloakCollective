<script setup lang="ts">
const route = useRoute();
const { showFeed } = useHomeFeedState();
const activeTab = computed(() =>
  route.name === "home-explore" ? "explore" : "home",
);
const showSidebar = computed(() => route.name === "index" && showFeed.value);
</script>

<template>
  <NuxtLayout name="default">
    <div class="home">
      <PageContainer class="content" variant="wide">
        <div class="main px-8">
          <div class="tabs-bar">
            <v-tabs :model-value="activeTab" slider-color="primary" color="ink">
              <v-tab value="home" to="/" :ripple="false">For you</v-tab>
              <v-tab value="explore" to="/home/explore" :ripple="false"
                >Explore</v-tab
              >
            </v-tabs>
            <v-divider></v-divider>
          </div>
          <slot />
        </div>
      </PageContainer>
      <RecommendationPanel v-if="showSidebar" class="sidebar" />
    </div>
  </NuxtLayout>
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
  }

  .tabs-bar.v-tab {
    position: sticky;
    top: var(--v-layout-top, 64px);
    z-index: 3;
    background: rgb(var(--v-theme-background));
  }
  .v-tab.v-tab.v-btn {
    min-width: fit-content !important;
    padding: 0;
    margin-right: 1.5rem;
  }
  .sidebar {
    align-self: flex-start;
    position: sticky;
    top: var(--v-layout-top, 64px);
    // Always exactly the viewport height below the topbar, so the panel's
    // left divider runs top-to-bottom regardless of how little content it holds.
    height: calc(100dvh - var(--v-layout-top, 64px));
    overflow-y: auto;
  }
}
</style>
