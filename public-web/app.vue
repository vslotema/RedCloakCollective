<script setup lang="ts">
import { useTheme } from 'vuetify'

const authStore = useAuthStore()
const theme = useTheme()

onMounted(() => {
  if (authStore.token) authStore.fetchUser()

  const stored = import.meta.client ? localStorage.getItem('theme') : null
  if (stored === 'dark' || stored === 'light') {
    theme.global.name.value = stored
  }
})
</script>

<template>
  <v-app>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </v-app>
</template>
