<script setup lang="ts">
const model = defineModel<'all' | 'stories' | 'lists'>({ default: 'all' })
</script>

<template>
  <v-btn-toggle v-model="model" mandatory color="ink" density="compact" variant="plain">
    <v-btn :ripple="false" value="all">All</v-btn>
    <v-btn :ripple="false" value="stories">Stories</v-btn>
    <v-btn :ripple="false" value="lists">Lists</v-btn>
  </v-btn-toggle>
</template>

<style lang="scss" scoped>
 :deep(.v-btn__content) {
  font-weight: 400;
 }
</style>
