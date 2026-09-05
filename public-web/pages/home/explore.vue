<script setup lang="ts">
definePageMeta({ layout: 'default', middleware: 'auth' })

useSeoMeta({ title: 'Explore' })
</script>

<template>
  <div class="home">
    <PageContainer class="content" variant="wide">
      <div class="main px-8">
        <div class="tabs-bar">
          <v-tabs model-value="explore" color="ink">
            <v-tab value="home" to="/" :ripple="false">For you</v-tab>
            <v-tab value="explore" :ripple="false">Explore</v-tab>
          </v-tabs>
          <v-divider class="mb-8"></v-divider>
        </div>

        <ExploreContent />
      </div>
    </PageContainer>
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
}
</style>
