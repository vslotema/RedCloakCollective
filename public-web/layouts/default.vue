<script setup lang="ts">
const sidebar = useTemplateRef('sidebar')
</script>

<template>
  <div class="page">
    <TopbarNavigation @toggle-navigation="sidebar?.toggleNavigation()" />
    <SidebarNavigation ref="sidebar" />
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
