<script setup lang="ts">
import { ref } from 'vue'
import SidebarNavigation from './components/SidebarNavigation.vue'

const sidebar = ref<InstanceType<typeof SidebarNavigation> | null>(null)
</script>

<template>
  <v-app-bar color="background" flat style="border-bottom: thin solid #d5d5d5;">
    <v-btn class='menu-btn' icon="menu" size="small" color="black" @click="sidebar?.toggleNavigation()">
    </v-btn>
    <div class="logo">
        <h1 class="text-h6 font-weight-bold mb-0"><span class="text-primary">R</span>EDCLOAK COLLECTIVE</h1>
    </div>
  </v-app-bar>
  <SidebarNavigation ref="sidebar" />
  <v-main>
    <router-view />
  </v-main>
</template>

<style scoped lang="scss">
.menu-btn {
  margin-right: .375rem;
}
</style>
