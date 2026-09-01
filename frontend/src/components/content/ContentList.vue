<script setup lang="ts">
import type { ContentItem } from '@/types/content'
import ArticleListItem from '@/modules/articles/components/ArticleListItem.vue'


defineProps<{
  items: ContentItem[]
}>()

</script>

<template>
  <div v-for="item in items" :key="item.id">
     <ArticleListItem
     ></ArticleListItem>
     <v-divider></v-divider>
  </div>
</template>
A