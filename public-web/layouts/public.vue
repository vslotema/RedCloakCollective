<script setup lang="ts">
// This page's HTML can be shared-cached (swr), so login state must never be
// part of the SSR'd shell — same personalization-island pattern as
// FollowButton.vue: check localStorage client-side, after hydration.
const loggedIn = ref(false)

onMounted(() => {
  loggedIn.value = !!localStorage.getItem('auth_token')
})
</script>

<template>
  <div class="page">
    <ClientOnly>
      <template v-if="loggedIn">
        <TopbarNavigation />
        <SidebarNavigation />
      </template>
      <PublicHeader v-else />

      <template #fallback>
        <PublicHeader />
      </template>
    </ClientOnly>
    <v-main class="content">
      <slot />
    </v-main>
  </div>
</template>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.content {
  flex: 1;
}
</style>
