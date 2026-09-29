<script setup lang="ts">
import type { Article } from '~/types/article'

// Author-only preview of an article exactly as readers will see it once
// published — works for drafts and scheduled articles, which the public
// /articles/{slug} page 404s on. Loads through the owner-guarded
// /me/articles/{id} endpoint, so nobody else can open it. Its own layout (no
// site nav) — the only way out of this page should be the "Back to editor"
// button below, not the app chrome.
definePageMeta({ layout: 'preview', middleware: 'auth' })

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

useSeoMeta({
  title: () => `Preview: ${article.value?.title ?? ''}`,
  robots: 'noindex, nofollow',
})
</script>

<template>
  <ArticleView v-if="article" :article="article" :interactive="false">
    <template #toolbar>
      <div class="preview-bar px-4 py-2">
        <v-btn
          :to="`/write/${article.id}`"
          variant="text"
          size="small"
          prepend-icon="arrow-left"
        >
          Back to editor
        </v-btn>
      </div>
    </template>
  </ArticleView>
</template>

<style lang="scss" scoped>
.preview-bar {
  position: sticky;
  top: var(--v-layout-top, 64px);
  z-index: 1;
  width: fit-content;
  background: rgb(var(--v-theme-surface));
  border-bottom-right-radius: 8px;
}
</style>
