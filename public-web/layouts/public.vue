<script setup lang="ts">
import PublicHeader from '@/components/nav/PublicHeader.vue'
</script>

<template>
  <div class="page">
    <PublicHeader />
    <v-main class="content">
      <slot />
    </v-main>
  </div>
</template>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.content {
  flex: 1;
}
</style>
