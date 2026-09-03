<script setup lang="ts">
import ContentFilterBar from '@/components/content/filters/ContentFilterBar.vue'
import PageContainer from '@/components/content/PageContainer.vue'
</script>

<template>
  <PageContainer variant="centered">
    <ContentFilterBar show-content-type-toggle />
    <v-divider></v-divider>
  </PageContainer>
</template>
