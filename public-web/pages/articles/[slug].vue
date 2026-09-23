<script setup lang="ts">
import type { Article } from '~/types/article'
import { articleText } from '~/lib/article-render'

definePageMeta({ layout: 'public' })

const route = useRoute()
const api = useApi()
const slug = route.params.slug as string

const { data: article, error } = await useAsyncData(`article-${slug}`, () =>
  api<Article>(`/articles/${slug}`),
)

if (error.value) {
  throw createError({
    statusCode: (error.value as { statusCode?: number }).statusCode ?? 404,
    statusMessage: 'Article not found',
    fatal: true,
  })
}

const url = useRequestURL()
const canonical = `${url.origin}/articles/${slug}`

const description = computed(() => {
  const a = article.value
  if (!a) return undefined
  if (a.excerpt) return a.excerpt
  const text = articleText(a.content)
  if (!text) return undefined
  return text.length > 160 ? `${text.slice(0, 160).trimEnd()}…` : text
})

const ogImage = computed(() => {
  const src = article.value?.header_image_url
  if (!src) return undefined
  return src.startsWith('http') ? src : `${url.origin}${src}`
})

useSeoMeta({
  title: () => article.value?.title,
  description,
  ogTitle: () => article.value?.title,
  ogDescription: description,
  ogImage,
  ogType: 'article',
  twitterCard: 'summary_large_image',
})
useHead({
  link: [{ rel: 'canonical', href: canonical }],
})
</script>

<template>
  <ArticleView v-if="article" :article="article" />
</template>
