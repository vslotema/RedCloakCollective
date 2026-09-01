<script setup lang="ts">
import { ref } from 'vue'
import PageContainer from '@/components/content/PageContainer.vue'
import RichTextEditor from './components/RichTextEditor.vue'

const title = ref('')
const content = ref('<p>Start writing your story…</p>')
</script>

<template>
  <PageContainer>
    <v-text-field
      v-model="title"
      label="Post title"
      variant="plain"
      class="text-h5 mb-4"
      hide-details
    />
    <RichTextEditor v-model="content" />
    <v-btn class="mt-6" color="primary">Publish</v-btn>
  </PageContainer>
</template>
