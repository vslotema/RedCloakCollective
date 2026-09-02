<script setup lang="ts">
import { ref } from 'vue'
import { mockContentItems } from '@/mocks/contentItems'
import TopicChipRow from './TopicChipRow.vue'
import ResultsSummary from './ResultsSummary.vue'
import ContentTypeToggle from './ContentTypeToggle.vue'

const {
  showContentTypeToggle = false,
  showClearBtn = false,
  multiSelect = false,
} = defineProps<{
  showContentTypeToggle?: boolean
  showClearBtn?: boolean
  multiSelect?: boolean
}>()

const topics = [...new Set(mockContentItems.flatMap((item) => item.tags))]

const selectedTopics = ref<string[]>([])
const resultsCount = ref(4)
const country = ref('All countries')
const contentType = ref<'all' | 'stories' | 'lists'>('all')

function toggleTopic(topic: string) {
  const isSelected = selectedTopics.value.includes(topic)
  if (multiSelect) {
    selectedTopics.value = isSelected
      ? selectedTopics.value.filter((t) => t !== topic)
      : [...selectedTopics.value, topic]
  } else {
    selectedTopics.value = isSelected ? [] : [topic]
  }
}

function clearTopics() {
  selectedTopics.value = []
}
</script>

<template>
  <div class="content-filter-bar">
    <TopicChipRow :topics="topics" :selected="selectedTopics" @toggle="toggleTopic" />

    <div class="d-flex align-center justify-space-between mt-4">
      <ResultsSummary :count="resultsCount" :show-clear-btn="showClearBtn" @clear="clearTopics" />

      <div class="d-flex align-center ga-4">
        <v-select
          v-model="country"
          :items="['All countries']"
          variant="solo"
          flat
          density="compact"
          hide-details
          class="country-select"
        />
        <ContentTypeToggle v-if="showContentTypeToggle" v-model="contentType" />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.content-filter-bar {
  .country-select {
    max-width: 160px;

    :deep(.v-field) {
      background: rgb(var(--v-theme-background));
      border-radius: 0.375rem;
      font-size: 0.875rem;
    }

    :deep(.v-field__input) {
      min-height: 32px;
      padding-top: 0;
      padding-bottom: 0;
      font-size: 0.875rem;
    }
  }
}
</style>
