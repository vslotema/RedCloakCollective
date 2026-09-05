<script setup lang="ts">
import { ref } from 'vue'
import TopbarNavigation from '@/components/nav/TopbarNavigation.vue'
import SidebarNavigation from '@/components/nav/SidebarNavigation.vue'

const sidebar = ref<InstanceType<typeof SidebarNavigation> | null>(null)
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
