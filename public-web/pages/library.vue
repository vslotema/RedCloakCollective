<script setup lang="ts">
import PageContainer from '@/components/content/PageContainer.vue'

definePageMeta({ layout: 'default', middleware: 'auth' })
</script>

<template>
  <PageContainer>
    <h1 class="text-h4 font-weight-bold mb-2">Library</h1>
  </PageContainer>
</template>
