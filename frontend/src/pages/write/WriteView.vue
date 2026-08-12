<script setup lang="ts">
import { ref } from 'vue'
import RichTextEditor from './components/RichTextEditor.vue'

const title = ref('')
const content = ref('<p>Start writing your story…</p>')
</script>

<template>
  <v-container class="py-10">
    <v-row justify="center">
      <v-col cols="12" md="8" lg="7">
        <v-text-field
          v-model="title"
          label="Post title"
          variant="plain"
          class="text-h5 mb-4"
          hide-details
        />
        <RichTextEditor v-model="content" />
        <v-btn class="mt-6" color="primary">Publish</v-btn>
      </v-col>
    </v-row>
  </v-container>
</template>
