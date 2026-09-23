<script setup lang="ts">
import type { Article } from '~/types/article'

// The reader-facing presentation of an article — shared by the public
// /articles/{slug} page and the author-only /write/{id}/preview page so the
// preview always matches what gets published.
const props = defineProps<{ article: Article }>()

const coverPosition = computed(() => {
  const p = props.article.header_image_position
  return p && typeof p.x === 'number' && typeof p.y === 'number' ? p : { x: 50, y: 50 }
})
</script>

<template>
  <v-container class="py-8" style="max-width: 720px">
    <slot name="before" />

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
