<script setup lang="ts">
import { onMounted, ref } from 'vue'
import api from '@/lib/api'

const apiStatus = ref<'checking' | 'ok' | 'down'>('checking')

onMounted(async () => {
  try {
    await api.get('/health')
    apiStatus.value = 'ok'
  } catch {
    apiStatus.value = 'down'
  }
})
</script>

<template>
  <v-container class="py-10">
    <v-row justify="center">
      <v-col cols="12" md="8" lg="6">
        <h1 class="text-h4 font-weight-bold mb-2">CarePodHub</h1>
        <p class="text-body-1 text-medium-emphasis mb-6">
          A place for special needs caregivers and special needs people to share their
          stories.
        </p>

        <v-alert
          v-if="apiStatus === 'ok'"
          type="success"
          variant="tonal"
          text="Connected to the Laravel API"
        />
        <v-alert
          v-else-if="apiStatus === 'down'"
          type="error"
          variant="tonal"
          text="Could not reach the Laravel API. Is `php artisan serve` running?"
        />
        <v-alert v-else type="info" variant="tonal" text="Checking API connection…" />

        <v-btn class="mt-6" color="primary" to="/write" prepend-icon="mdi-pencil">
          Write a post
        </v-btn>
      </v-col>
    </v-row>
  </v-container>
</template>
