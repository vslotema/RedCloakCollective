<script setup lang="ts">
import { ref } from 'vue'
import RecommendedTopicChip from './RecommendedTopicChip.vue'
import SuggestedFollowItem from './SuggestedFollowItem.vue'
import { mockRecommendedTopics } from '@/mocks/recommendedTopics'
import { mockSuggestedFollows } from '@/mocks/suggestedFollows'

interface Props {
  width?: string
}

const { width = '350px' } = defineProps<Props>()

// Stub state: topic/user recommendation data is not wired up yet.
const addedTopics = ref<string[]>([])

function toggleTopic(topic: string) {
  addedTopics.value = addedTopics.value.includes(topic)
    ? addedTopics.value.filter((t) => t !== topic)
    : [...addedTopics.value, topic]
}
</script>

<template>
  <div class="panel-container" :style="{ width }">
    <section class="mb-8">
      <h2 class="text-medium font-heading mb-4">Recommended topics</h2>
      <div class="d-flex flex-wrap ga-2">
        <RecommendedTopicChip
          v-for="topic in mockRecommendedTopics"
          :key="topic"
          :label="topic"
          :added="addedTopics.includes(topic)"
          @toggle="toggleTopic(topic)"
        />
      </div>
      <v-btn :ripple="false" variant="text" class="see-more px-0 mt-4">See more topics</v-btn>
    </section>

    <section>
      <h2 class="text-medium font-heading mb-4">Who to follow</h2>
      <div class="d-flex flex-column ga-6">
        <SuggestedFollowItem
          v-for="person in mockSuggestedFollows"
          :key="person.id"
          :person="person"
        />
      </div>
      <v-btn :ripple="false" variant="text" class="see-more px-0 mt-4">See more suggestions</v-btn>
    </section>
  </div>
</template>

<style lang="scss" scoped>
.panel-container {
  border-left: 1px solid rgb(var(--v-theme-border-color));
  padding: var(--space-8) var(--space-6);
}

.see-more {
  color: rgb(var(--v-theme-on-surface));

  :deep(.v-btn__overlay) {
    opacity: 0;
  }

  &:hover {
    color: rgb(var(--v-theme-ink));
  }
}
</style>
