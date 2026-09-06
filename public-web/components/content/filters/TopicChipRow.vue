<script setup lang="ts">
const props = defineProps<{
  topics: string[]
  selected: string[]
}>()

defineEmits<{
  toggle: [topic: string]
  all: []
}>()

const scroller = useTemplateRef('scroller')

// Only show the "scroll next" affordance while there are chips past the right
// edge — hidden when the row fits or is already scrolled to the end.
const canScrollNext = ref(false)

function updateScrollState() {
  const el = scroller.value
  if (!el) return
  canScrollNext.value = el.scrollWidth - el.scrollLeft - el.clientWidth > 1
}

function scrollNext() {
  scroller.value?.scrollBy({ left: 200, behavior: 'smooth' })
}

let resizeObserver: ResizeObserver | undefined

onMounted(() => {
  const el = scroller.value
  if (!el) return

  updateScrollState()
  el.addEventListener('scroll', updateScrollState, { passive: true })
  resizeObserver = new ResizeObserver(updateScrollState)
  resizeObserver.observe(el)
})

onBeforeUnmount(() => {
  scroller.value?.removeEventListener('scroll', updateScrollState)
  resizeObserver?.disconnect()
})

// Topics can arrive async (followed-topics fetch), so re-measure when they change.
watch(
  () => props.topics,
  () => nextTick(updateScrollState),
  { deep: true },
)
</script>

<template>
  <div class="d-flex align-center">
    <div
      ref="scroller"
      class="chip-scroller d-flex ga-2"
      :class="{ 'chip-scroller--fade': canScrollNext }"
    >
      <TopicChip label="All" :selected="selected.length === 0" @click="$emit('all')" />
      <TopicChip
        v-for="topic in topics"
        :key="topic"
        :label="topic"
        :selected="selected.includes(topic)"
        @click="$emit('toggle', topic)"
      />
    </div>
    <v-btn
      v-if="canScrollNext"
      icon="chevron-right"
      variant="text"
      density="comfortable"
      @click="scrollNext"
    />
  </div>
</template>

<style scoped lang="scss">
.chip-scroller {
  flex: 1 1 auto;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }

  // Only fade the right edge while there's more to scroll to.
  &--fade {
    $fade: 2.5rem;
    mask-image: linear-gradient(to right, #000 calc(100% - #{$fade}), transparent 100%);
    -webkit-mask-image: linear-gradient(to right, #000 calc(100% - #{$fade}), transparent 100%);
  }

  :deep(.v-chip) {
    flex: 0 0 auto;
  }
}
</style>
