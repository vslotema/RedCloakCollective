<script setup lang="ts">
import { computed } from 'vue'
import PageContainer from '@/components/content/PageContainer.vue'
import { useAuthStore } from '@/stores/auth'
import ForYouSidebar from './components/ForYouSidebar.vue'

const authStore = useAuthStore()
const hasFollows = computed(() => authStore.user?.hasFollows ?? false)
</script>

<template>
  <PageContainer variant="wide">
    <v-row v-if="!hasFollows" justify="center">
      <v-col cols="12" md="8" lg="6">
        <!-- Stub content: topic-picker and people-worth-following data is not wired up yet. -->
        <h1 class="text-h4 font-weight-bold mb-2">Pick a few topics to get started</h1>
      </v-col>
    </v-row>
    <v-row v-else>
      <v-col cols="12" md="8">
        <!-- Stub content: feed data is not wired up yet. -->
        <h1 class="text-h4 font-weight-bold mb-2">For you</h1>
      </v-col>
      <v-col cols="12" md="4">
        <ForYouSidebar />
      </v-col>
    </v-row>
  </PageContainer>
</template>
