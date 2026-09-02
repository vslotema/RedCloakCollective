<script setup lang="ts">
import type { Creator } from '@/types/content'

defineProps<{
  title: string,
  subtitle: string,
  creator: Creator,
  preview_image: string,
  likes: number, 
  read_duration: string | number
}>()

</script>

<template>
  <div>
    {{title}}
     
  </div>
</template>
