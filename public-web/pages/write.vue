<script setup lang="ts">
import { ref } from 'vue'
import PageContainer from '@/components/content/PageContainer.vue'
import RichTextEditor from '@/components/write/RichTextEditor.vue'

definePageMeta({ layout: 'default', middleware: 'auth' })

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
    <!-- tiptap manipulates the DOM directly and never SSRs -->
    <ClientOnly>
      <RichTextEditor v-model="content" />
    </ClientOnly>
    <v-btn class="mt-6" color="primary">Publish</v-btn>
  </PageContainer>
</template>
