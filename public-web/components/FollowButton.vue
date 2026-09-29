<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    username: string
    initialFollowing: boolean
    size?: 'x-small' | 'small' | 'default' | 'large'
    disabled?: boolean
    outlined?: boolean
  }>(),
  { size: 'default', disabled: false, outlined: false },
)

const api = useApi()
const authStore = useAuthStore()
const following = ref(props.initialFollowing)
const loading = ref(false)

const buttonColor = computed(() => {
  if (props.outlined) return 'ink'
  return following.value ? undefined : 'primary'
})

const buttonVariant = computed(() => (props.outlined || following.value ? 'outlined' : 'flat'))

async function toggle() {
  if (!(await authStore.ensureUser())) {
    window.location.href = '/'
    return
  }

  loading.value = true
  try {
    const result = await api<{ following: boolean }>(`/users/${props.username}/follow`, {
      method: following.value ? 'DELETE' : 'POST',
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
      :color="buttonColor"
      :variant="buttonVariant"
      rounded="pill"
      :class="{ 'font-weight-medium': outlined }"
      :size="size"
      :disabled="disabled"
      :loading="loading"
      @click="toggle"
    >
      {{ following ? 'Following' : 'Follow' }}
    </v-btn>
  </ClientOnly>
</template>
