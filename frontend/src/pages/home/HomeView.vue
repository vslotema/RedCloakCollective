<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const activeTab = computed(() => (route.name === 'explore' ? 'explore' : 'home'))
</script>

<template>
  <div class="home">
    <v-tabs :model-value="activeTab" color="ink">
      <v-tab value="home" :to="{ name: 'home' }" :ripple="false">For you</v-tab>
      <v-tab value="explore" :to="{ name: 'explore' }" :ripple="false">Explore</v-tab>
    </v-tabs>
    <v-divider></v-divider>
    <router-view />
  </div>
</template>

<style scoped lang="scss">
.v-tab:hover :deep(.v-btn__overlay) {
  opacity: 0;
}
.home {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}
</style>
