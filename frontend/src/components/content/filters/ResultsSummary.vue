<script setup lang="ts">
const {showClearBtn = false} = defineProps<{
  count: number
  showClearBtn?: boolean
}>()

defineEmits<{
  clear: []
}>()
</script>

<template>
  <div class="d-flex align-center ga-2">
    <span class="text-x-small">{{ count }} results</span>
    <v-btn v-if="showClearBtn" variant="text" size="small" prepend-icon="x" @click="$emit('clear')">Clear</v-btn>
  </div>
</template>
