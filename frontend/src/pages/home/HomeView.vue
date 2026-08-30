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
  <div></div>
</template>
