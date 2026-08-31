<script setup lang="ts">
import { ref } from 'vue'
import TopbarNavigation from './components/TopbarNavigation.vue'
import SidebarNavigation from './components/SidebarNavigation.vue'

const sidebar = ref<InstanceType<typeof SidebarNavigation> | null>(null)
</script>

<template>
  <TopbarNavigation @toggle-navigation="sidebar?.toggleNavigation()" />
  <SidebarNavigation ref="sidebar" />
  <v-main class="my-8 mx-10">
    <router-view />
  </v-main>
</template>
