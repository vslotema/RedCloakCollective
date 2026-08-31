<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const activeTab = computed(() => (route.name === 'explore' ? 'explore' : 'home'))
</script>

<template>
  <div>
    <v-tabs :model-value="activeTab" color="primary">
      <v-tab value="home" :to="{ name: 'home' }">For you</v-tab>
      <v-tab value="explore" :to="{ name: 'explore' }">Explore</v-tab>
    </v-tabs>
    <router-view />
  </div>
</template>
