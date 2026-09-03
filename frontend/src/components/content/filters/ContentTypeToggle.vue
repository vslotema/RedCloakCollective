<script setup lang="ts">
const model = defineModel<'all' | 'stories' | 'lists'>({ default: 'all' })
</script>

<template>
  <v-btn-toggle v-model="model" mandatory color="ink" density="compact" variant="plain">
    <v-btn value="all">All</v-btn>
    <v-btn value="stories">Stories</v-btn>
    <v-btn value="lists">Lists</v-btn>
  </v-btn-toggle>
</template>
