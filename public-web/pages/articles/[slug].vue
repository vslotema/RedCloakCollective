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

const coverPosition = computed(() => {
  const p = article.value?.header_image_position
  return p && typeof p.x === 'number' && typeof p.y === 'number' ? p : { x: 50, y: 50 }
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
  <v-container v-if="article" class="py-8" style="max-width: 720px">
    <figure v-if="article.header_image_url" class="article-cover">
      <img
        :src="article.header_image_url"
        alt=""
        :style="{ objectPosition: `${coverPosition.x}% ${coverPosition.y}%` }"
      />
    </figure>

    <h1 class="text-h3 font-weight-bold mb-2">{{ article.title }}</h1>
    <p v-if="article.excerpt" class="text-h6 font-weight-regular text-medium-emphasis mb-3">
      {{ article.excerpt }}
    </p>
    <div class="text-body-2 text-medium-emphasis mb-4">
      by
      <NuxtLink :to="`/u/${article.author.username}`">{{ article.author.name }}</NuxtLink>
    </div>
    <div v-if="article.topics?.length" class="d-flex flex-wrap ga-2 mb-6">
      <v-chip
        v-for="topic in article.topics"
        :key="topic.id"
        size="small"
        variant="tonal"
        :to="`/explore?topic=${topic.slug}`"
      >
        {{ topic.name }}
      </v-chip>
    </div>

    <ArticleBody :doc="article.content" />
  </v-container>
</template>

<style scoped lang="scss">
.article-cover {
  margin: 0 0 var(--space-6);
  height: 20rem;
  overflow: hidden;

  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}
</style>
