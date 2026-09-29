<script setup lang="ts">
import type { ArticleTopic } from '~/types/article'
import { topicColorAt } from '~/lib/topic-colors'

const props = defineProps<{
  topics: ArticleTopic[]
  interactive: boolean
}>()

const api = useApi()

const followedTopicSlugs = ref<Set<string>>(new Set())
const pendingTopicSlugs = ref<Set<string>>(new Set())

onMounted(async () => {
  if (!props.interactive || !localStorage.getItem('auth_token')) return
  try {
    const followed = await api<ArticleTopic[]>('/topics/following')
    followedTopicSlugs.value = new Set(followed.map((topic) => topic.slug))
  } catch {
    followedTopicSlugs.value = new Set()
  }
})

async function toggleTopicFollow(slug: string) {
  if (!localStorage.getItem('auth_token')) {
    window.location.href = '/'
    return
  }
  if (pendingTopicSlugs.value.has(slug)) return

  const isFollowing = followedTopicSlugs.value.has(slug)
  pendingTopicSlugs.value.add(slug)
  try {
    await api(`/topics/${slug}/follow`, { method: isFollowing ? 'DELETE' : 'POST' })
    const nextFollowed = new Set(followedTopicSlugs.value)
    if (isFollowing) nextFollowed.delete(slug)
    else nextFollowed.add(slug)
    followedTopicSlugs.value = nextFollowed
  } finally {
    pendingTopicSlugs.value.delete(slug)
  }
}
</script>

<template>
  <div class="d-flex flex-wrap ga-3">
    <v-chip
      v-for="(topic, index) in topics"
      :key="topic.id"
      :color="topicColorAt(index)"
      variant="tonal"
      :prepend-icon="followedTopicSlugs.has(topic.slug) ? 'check' : 'plus'"
      :disabled="!interactive || pendingTopicSlugs.has(topic.slug)"
      class="topic-chip font-weight-medium"
      @click="toggleTopicFollow(topic.slug)"
    >
      <span class="topic-chip__label">{{ topic.name }}</span>
    </v-chip>
  </div>
</template>

<style scoped lang="scss">
.topic-chip__label {
  color: rgb(var(--v-theme-ink));
  font-weight: 400;
}
</style>
