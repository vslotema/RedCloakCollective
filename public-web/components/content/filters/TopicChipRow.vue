<script setup lang="ts">
import { useTemplateRef } from 'vue'
import TopicChip from './TopicChip.vue'

defineProps<{
  topics: string[]
  selected: string[]
}>()

defineEmits<{
  toggle: [topic: string]
  all: []
}>()

const scroller = useTemplateRef('scroller')

function scrollNext() {
  scroller.value?.scrollBy({ left: 200, behavior: 'smooth' })
}
</script>

<template>
  <div class="d-flex align-center">
    <div ref="scroller" class="chip-scroller d-flex ga-2">
      <TopicChip label="All" :selected="selected.length === 0" @click="$emit('all')" />
      <TopicChip
        v-for="topic in topics"
        :key="topic"
        :label="topic"
        :selected="selected.includes(topic)"
        @click="$emit('toggle', topic)"
      />
    </div>
    <v-btn icon="chevron-right" variant="text" density="comfortable" @click="scrollNext" />
  </div>
</template>

<style scoped lang="scss">
.chip-scroller {
  flex: 1 1 auto;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;

  $fade: 2.5rem;
  mask-image: linear-gradient(to right, #000 calc(100% - #{$fade}), transparent 100%);
  -webkit-mask-image: linear-gradient(to right, #000 calc(100% - #{$fade}), transparent 100%);

  &::-webkit-scrollbar {
    display: none;
  }

  :deep(.v-chip) {
    flex: 0 0 auto;
  }
}
</style>
