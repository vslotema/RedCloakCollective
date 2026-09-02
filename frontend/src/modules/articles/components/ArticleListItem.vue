<script setup lang="ts">
import type { Creator } from '@/types/content'
import { formatPublishedDate } from '@/utils/formatPublishedDate'

defineProps<{
  title: string
  subtitle: string
  creator: Creator
  preview_image: string
  likes: number
  published_at: string
  responses_count: number
}>()
</script>

<template>
  <v-card flat color="background">
    <div class="text-x-small px-4">
      <v-avatar size="24" :image="creator.avatar" class="mr-2" />
      <span class="text-ink">{{ creator.name }}</span
      ><span class="mx-1">·</span> <span>{{ formatPublishedDate(published_at) }}</span>
    </div>
    <div class="d-flex flex-row align-start mt-4">
      <div class="content d-flex flex-column">
        <div class="header-container">
          <v-card-title class="font-weight-bold text-ink text-xxl pt-0">{{ title }}</v-card-title>
          <v-card-subtitle class="text-medium">{{ subtitle }}</v-card-subtitle>
        </div>

        <v-card-actions class="text-x-small px-4 align-end gap-8">
          <span v-if="responses_count" class="d-inline-flex align-end"
            ><v-icon size="small" icon="thumbs-up" class="mr-1"></v-icon>{{ responses_count }}</span
          >
          <span v-if="likes" class="d-inline-flex align-end"
            ><v-icon size="small" icon="message-circle" class="mr-1" />{{ likes }}</span
          >
        </v-card-actions>
      </div>
      <v-img :width="125" :aspect-ratio="16 / 9" :src="preview_image"></v-img>
    </div>
  </v-card>
</template>

<style scoped lang="scss">
.content {
  min-width: 0;
  flex: 1 1 auto;
  .header-container {
    flex: 1;
    :deep(.v-card-title),
    :deep(.v-card-subtitle) {
      white-space: normal;
      overflow: visible;
      text-overflow: unset;
      opacity: 1;
      line-height: 1.2;
    }
  }
  :deep(.v-card-actions) {
    gap: 1rem;
  }
}
</style>
