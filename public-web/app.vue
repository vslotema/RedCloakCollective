<script setup lang="ts">
const authStore = useAuthStore()

onMounted(() => {
  if (authStore.token) authStore.fetchUser()
})
</script>

<template>
  <v-app>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </v-app>
</template>
