<script setup lang="ts">
definePageMeta({ layout: 'public' })

interface Article {
  id: number
  title: string
  slug: string
  content: string
  published_at: string
  author: { id: number; name: string; username: string }
}

const route = useRoute()
const api = useApi()
const slug = route.params.slug as string

const { data: article, error } = await useAsyncData(`article-${slug}`, () =>
  api<Article>(`/articles/${slug}`),
)

if (error.value) {
  throw createError({
    statusCode: (error.value as any).statusCode ?? 404,
    statusMessage: 'Article not found',
    fatal: true,
  })
}

const excerpt = computed(() => article.value?.content.replace(/<[^>]+>/g, '').slice(0, 160))
const canonical = `${useRequestURL().origin}/articles/${slug}`

useSeoMeta({
  title: () => article.value?.title,
  description: excerpt,
  ogTitle: () => article.value?.title,
  ogDescription: excerpt,
  ogType: 'article',
  twitterCard: 'summary_large_image',
})
useHead({
  link: [{ rel: 'canonical', href: canonical }],
})
</script>

<template>
  <v-container v-if="article" class="py-8" style="max-width: 720px">
    <h1 class="text-h3 font-weight-bold mb-2">{{ article.title }}</h1>
    <div class="text-body-2 text-medium-emphasis mb-6">
      by
      <NuxtLink :to="`/u/${article.author.username}`">{{ article.author.name }}</NuxtLink>
    </div>
    <!-- eslint-disable-next-line vue/no-v-html -->
    <div class="article-content" v-html="article.content" />
  </v-container>
</template>
