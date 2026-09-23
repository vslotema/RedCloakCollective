<script setup lang="ts">
import type { Article } from '~/types/article'

// Author-only preview of an article exactly as readers will see it once
// published — works for drafts and scheduled articles, which the public
// /articles/{slug} page 404s on. Loads through the owner-guarded
// /me/articles/{id} endpoint, so nobody else can open it.
definePageMeta({ layout: 'public', middleware: 'auth' })

const route = useRoute()
const api = useApi()
const id = Number(route.params.id)

if (Number.isNaN(id)) {
  throw createError({ statusCode: 404, statusMessage: 'Draft not found', fatal: true })
}

const article = ref<Article | null>(null)

try {
  const loaded = await api<Article>(`/me/articles/${id}`)
  article.value = { ...loaded, title: loaded.title || 'Untitled' }
} catch (error) {
  const status =
    (error as { status?: number }).status ?? (error as { statusCode?: number }).statusCode
  throw createError({
    statusCode: status === 403 ? 403 : 404,
    statusMessage: status === 403 ? 'This draft isn’t yours' : 'Draft not found',
    fatal: true,
  })
}

const stateLabel = computed(() => {
  const a = article.value
  if (!a) return ''
  if (a.state === 'published') return 'Published'
  if (a.state === 'scheduled' && a.published_at) {
    const when = new Date(a.published_at).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
    return `Scheduled for ${when}`
  }
  return 'Draft'
})

useSeoMeta({
  title: () => `Preview: ${article.value?.title ?? ''}`,
  robots: 'noindex, nofollow',
})
</script>

<template>
  <ArticleView v-if="article" :article="article">
    <template #before>
      <v-alert type="info" variant="tonal" density="compact" icon="eye" class="mb-6">
        <div class="d-flex align-center flex-wrap ga-2">
          <span>
            <strong>Preview</strong> · {{ stateLabel }} — only visible to you
          </span>
          <v-spacer />
          <v-btn
            :to="`/write/${article.id}`"
            variant="text"
            size="small"
            prepend-icon="arrow-left"
          >
            Back to editor
          </v-btn>
        </div>
      </v-alert>
    </template>
  </ArticleView>
</template>
