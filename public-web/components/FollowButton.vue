<script setup lang="ts">
const props = defineProps<{
  username: string
  initialFollowing: boolean
}>()

const api = useApi()
const following = ref(props.initialFollowing)
const loading = ref(false)

function authHeaders(): Record<string, string> {
  const token = import.meta.client ? localStorage.getItem('auth_token') : null
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function toggle() {
  const token = localStorage.getItem('auth_token')
  if (!token) {
    // No SPA session in this browser — send them to sign in there.
    window.location.href = '/'
    return
  }

  loading.value = true
  try {
    const result = await api<{ following: boolean }>(`/users/${props.username}/follow`, {
      method: following.value ? 'DELETE' : 'POST',
      headers: authHeaders(),
    })
    following.value = result.following
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <ClientOnly>
    <v-btn
      :color="following ? undefined : 'primary'"
      :variant="following ? 'outlined' : 'flat'"
      rounded="pill"
      :loading="loading"
      @click="toggle"
    >
      {{ following ? 'Following' : 'Follow' }}
    </v-btn>
  </ClientOnly>
</template>
