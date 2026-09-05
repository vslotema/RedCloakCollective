<script setup lang="ts">
import type { ContentItem } from '~/types/content'

defineProps<{
  items: ContentItem[]
}>()
</script>

<template>
  <div v-for="item in items" :key="item.id">
    <ArticleListItem
      v-if="item.type === 'article'"
      :title="item.title"
      :subtitle="item.subtitle"
      :creator="item.creator"
      :preview_image="item.preview_image"
      :likes="item.likes"
      :published_at="item.published_at"
      :responses_count="item.responses_count"
    />
    <EquipmentListItem
      v-else
      :title="item.title"
      :subtitle="item.subtitle"
      :creator="item.creator"
      :preview_images="item.preview_images"
      :saves="item.saves"
      :items_count="item.items_count"
      :is_new="item.is_new"
      :num_new_items="item.num_new_items"
      :published_at="item.published_at"
      :responses_count="item.responses_count"
    />
    <v-divider class="my-8"></v-divider>
  </div>
</template>
