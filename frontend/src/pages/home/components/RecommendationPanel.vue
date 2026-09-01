<script setup lang="ts">
interface Props {
  width?: string
}

const { width = '350px' } = defineProps<Props>()
</script>

<template>
  <div class="panel-container" :style="{ width }">
    <!-- Stub content: topic/user recommendation data is not wired up yet. -->
    <section class="mb-8">
      <h2 class="text-h6 font-heading mb-4">Recommended topics</h2>
    </section>
    <section>
      <h2 class="text-h6 font-heading mb-4">Who to follow</h2>
    </section>
  </div>
</template>

<style lang="scss" scoped>
.panel-container {
  border-left: 1px solid #d5d5d5;
  padding: var(--space-8) var(--space-6);
}
</style>
