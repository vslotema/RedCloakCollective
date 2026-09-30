<script setup lang="ts">
import type { Article } from '~/types/article'
import { articleText } from '~/lib/article-render'

// The reader-facing presentation of an article — shared by the public
// /articles/{slug} page and the author-only /write/{id}/preview page so the
// preview always matches what gets published.
const props = withDefaults(defineProps<{ article: Article; interactive?: boolean }>(), {
  interactive: true,
})

const articlePlainText = computed(() => articleText(props.article.content, Infinity))

const shareUrl = `${useRequestURL().origin}/articles/${props.article.slug}`

const coverPosition = computed(() => {
  const p = props.article.header_image_position
  return p && typeof p.x === 'number' && typeof p.y === 'number' ? p : { x: 50, y: 50 }
})
</script>

<template>
  <div class="article-page">
    <slot name="toolbar" />
    <v-container class="py-12" style="max-width: 720px">
      <h1 class="text-h3 font-weight-bold mb-4">{{ article.title }}</h1>
      <p v-if="article.excerpt" class="text-h6 font-weight-regular text-medium-emphasis mb-6">
        {{ article.excerpt }}
      </p>

      <ArticleByline
        :author="article.author"
        :published-at="article.published_at"
        :reading-minutes="article.reading_minutes"
        :interactive="interactive"
        class="mb-6"
      />

      <ArticleTopicChips
        v-if="article.topics?.length"
        :topics="article.topics"
        :interactive="interactive"
        class="mb-6"
      />

      <ArticleActionBar
        :article-id="article.id"
        :title="article.title"
        :share-url="shareUrl"
        :listen-text="articlePlainText"
        :interactive="interactive"
        class="mb-6"
      />

      <figure v-if="article.header_image_url" class="article-cover">
        <img
          :src="article.header_image_url"
          alt=""
          :style="{ objectPosition: `${coverPosition.x}% ${coverPosition.y}%` }"
        />
      </figure>

      <ArticleBody :doc="article.content" />
    </v-container>
  </div>
</template>

<style scoped lang="scss">
.article-page {
  min-height: calc(100vh - var(--v-layout-top, 64px));
  background: rgb(var(--v-theme-surface));
}

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
