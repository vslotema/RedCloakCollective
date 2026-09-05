<script setup lang="ts">
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
