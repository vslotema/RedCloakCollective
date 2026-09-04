<script setup lang="ts">
interface ArticleSummary {
  id: number
  title: string
  slug: string
  published_at: string
  author: { id: number; name: string; username: string }
}

const api = useApi()
const { data } = await useAsyncData('articles-index', () =>
  api<{ data: ArticleSummary[] }>('/articles'),
)

useSeoMeta({
  title: 'Articles',
  description: 'Browse published articles.',
})
</script>

<template>
  <v-container class="py-8">
    <h1 class="text-h4 font-weight-bold mb-6">Articles</h1>
    <v-row>
      <v-col v-for="article in data?.data" :key="article.id" cols="12" md="6">
        <v-card :to="`/articles/${article.slug}`" class="pa-4" variant="outlined">
          <div class="text-h6">{{ article.title }}</div>
          <div class="text-body-2 text-medium-emphasis">by {{ article.author.name }}</div>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
