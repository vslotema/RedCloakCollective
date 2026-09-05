<script setup lang="ts">
import type { Creator, Image } from '~/types/content'

defineProps<{
  title: string
  subtitle: string
  creator: Creator
  preview_images: Image[]
  published_at: string
  responses_count: number
  saves: number
  items_count: number
  is_new?: boolean
  num_new_items?: number
}>()
</script>

<template>
  <v-card flat :rounded="false" color="background">
    <div class="text-x-small pr-4">
      <v-avatar size="24" :image="creator.avatar" class="mr-2" />
      <span class="text-ink">{{ creator.name }}</span
      ><span class="mx-1">·</span> <span>{{ formatPublishedDate(published_at) }}</span
      ><span class="mx-1">·</span> <span>{{ items_count }} items</span
      ><template v-if="is_new"
        ><span class="mx-1">·</span
        ><span class="text-secondary font-weight-bold"> New equipment list</span></template
      ><template v-else-if="num_new_items"
        ><span class="mx-1">·</span
        ><span class="text-secondary font-weight-bold">{{ num_new_items }} new</span></template
      >
    </div>
    <div class="content d-flex flex-column mt-4">
      <div class="header-container">
        <v-card-title class="font-weight-bold text-ink text-xxl pl-0 pt-0">{{
          title
        }}</v-card-title>
        <v-card-subtitle class="text-medium pl-0">{{ subtitle }}</v-card-subtitle>
      </div>

      <div class="preview-images my-4">
        <v-avatar
          v-for="img in preview_images"
          :key="img.id"
          :image="img.url"
          rounded="0"
          size="large"
        ></v-avatar>
      </div>
      <v-card-actions class="text-x-small px-0 mt-4 align-end">
        <v-btn v-if="saves" :ripple="false" prepend-icon="pocket" size="small">{{ saves }}</v-btn>
        <v-btn v-if="responses_count" :ripple="false" prepend-icon="message-circle" size="small">{{
          responses_count
        }}</v-btn>

        <v-spacer />
        <v-btn :ripple="false" icon="bookmark" size="small"></v-btn>
      </v-card-actions>
    </div>
  </v-card>
</template>

<style scoped lang="scss">
.content {
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
  .preview-images {
    display: flex;
    gap: 0.5rem;
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
