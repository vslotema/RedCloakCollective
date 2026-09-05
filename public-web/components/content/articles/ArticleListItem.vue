<script setup lang="ts">
import type { Creator } from '~/types/content'

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
  <v-card flat :rounded="false" color="background">
    <div class="text-x-small pr-4">
      <v-avatar size="24" :image="creator.avatar" class="mr-2" />
      <span class="text-ink">{{ creator.name }}</span
      ><span class="mx-1">·</span> <span>{{ formatPublishedDate(published_at) }}</span>
    </div>
    <div class="d-flex flex-row align-stretch mt-4">
      <div class="content d-flex flex-column">
        <div class="header-container">
          <v-card-title class="font-weight-bold text-ink text-xxl pl-0 pt-0">{{
            title
          }}</v-card-title>
          <v-card-subtitle class="text-medium pl-0">{{ subtitle }}</v-card-subtitle>
        </div>
        <v-spacer />
      </div>
      <v-img :width="125" :aspect-ratio="16 / 9" :src="preview_image"></v-img>
    </div>
    <v-card-actions class="text-x-small px-0 mt-4 align-end">
      <v-btn v-if="likes" :ripple="false" prepend-icon="thumbs-up" size="small">{{ likes }}</v-btn>
      <v-btn v-if="responses_count" :ripple="false" prepend-icon="message-circle" size="small">{{
        responses_count
      }}</v-btn>

      <v-spacer />
      <v-btn :ripple="false" icon="bookmark" size="small"></v-btn>
    </v-card-actions>
  </v-card>
</template>

<style scoped lang="scss">
:deep(.v-img__img) {
  height: auto;
}
.content {
  min-width: 0;
  flex: 0 0 66.6667%;
  max-width: 66.6667%;

  .header-container {
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
    .v-btn {
      .v-btn__overlay {
        opacity: 0;
      }

      &:hover {
        color: rgb(var(--v-theme-ink));
      }
    }
  }
}
</style>
