<script setup lang="ts">
import ExploreContent from '@/components/content/ExploreContent.vue'
import PageContainer from '@/components/content/PageContainer.vue'

definePageMeta({ layout: 'public' })

useSeoMeta({
  title: 'Explore',
  description: 'Discover articles and equipment lists from the whole community.',
})
</script>

<template>
  <PageContainer variant="centered">
    <ExploreContent />
  </PageContainer>
</template>
