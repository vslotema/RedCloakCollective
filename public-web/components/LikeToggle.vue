<script setup lang="ts">
interface LikeStatus {
  liked: boolean
  likes_count: number
}

const props = withDefaults(
  defineProps<{
    endpoint: string
    disabled?: boolean
  }>(),
  { disabled: false },
)

const api = useApi()
const authStore = useAuthStore()
const authDialog = useAuthDialog()
const liked = ref(false)
const likesCount = ref<number | null>(null)
const requestInFlight = ref(false)

function applyStatus(status: LikeStatus) {
  liked.value = status.liked
  likesCount.value = status.likes_count
}

onMounted(async () => {
  if (props.disabled) return

  requestInFlight.value = true
  try {
    applyStatus(await api<LikeStatus>(props.endpoint))
  } catch {
    likesCount.value = null
  } finally {
    requestInFlight.value = false
  }
})

async function toggle() {
  if (requestInFlight.value) return

  requestInFlight.value = true
  try {
    if (!(await authStore.ensureUser())) {
      authDialog.open('signup')
      return
    }

    applyStatus(
      await api<LikeStatus>(props.endpoint, { method: liked.value ? 'DELETE' : 'PUT' }),
    )
  } finally {
    requestInFlight.value = false
  }
}
</script>

<template>
  <div class="d-inline-flex align-center ga-1">
    <v-btn
      icon="heart"
      variant="text"
      size="small"
      :color="liked ? 'primary' : undefined"
      :class="{ 'like-toggle--liked': liked }"
      :aria-label="liked ? 'Unlike' : 'Like'"
      :aria-pressed="liked"
      :disabled="disabled"
      @click="toggle"
    />
    <span v-if="likesCount" class="text-small" data-test="likes-count">
      {{ likesCount }}
    </span>
  </div>
</template>

<style scoped lang="scss">
.like-toggle--liked :deep(svg) {
  fill: currentColor;
}
</style>
