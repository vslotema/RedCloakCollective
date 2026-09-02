<script setup lang="ts">
import type { ContentItem } from '@/types/content'
import ArticleListItem from '@/modules/articles/components/ArticleListItem.vue'
import EquipmentListItem from '@/modules/equipment/components/EquipmentListItem.vue'

defineProps<{
  items: ContentItem[]
}>()
</script>

<template>
  <div v-for="item in items" :key="item.id" >
    <ArticleListItem
      v-if="item.type === 'article'"
      :title="item.title"
      :subtitle="item.subtitle"
      :creator="item.creator"
      :preview_image="item.preview_image"
      :likes="item.likes"
      :read_duration="item.read_duration"
    />
    <EquipmentListItem
      v-else
      :title="item.title"
      :subtitle="item.subtitle"
      :creator="item.creator"
      :preview_images="item.preview_images"
      :saves="item.saves"
    />
    <v-divider></v-divider>
  </div>
</template>
A
