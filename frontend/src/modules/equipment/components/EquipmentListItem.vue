<script setup lang="ts">
import type { Creator } from '@/types/content'

defineProps<{
  title: string,
  subtitle: string,
  creator: Creator,
  preview_images: string[],
  saves: number, 
}>()

</script>

<template>
  <div>
    {{title}}
     
  </div>
</template>
