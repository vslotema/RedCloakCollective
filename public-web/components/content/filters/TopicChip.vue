<script setup lang="ts">
defineProps<{
  label: string
  selected: boolean
}>()

defineEmits<{
  click: []
}>()
</script>

<template>
  <v-chip
    :variant="'flat'"
    :color="selected ? 'ink' : 'surface'"
    rounded="lg"
    :class="['topic-chip', { 'topic-chip--unselected': !selected }]"
    @click="$emit('click')"
  >
    {{ label }}
  </v-chip>
</template>

<style scoped lang="scss">
.topic-chip {
  color: rgb(var(--v-theme-background));

  &.topic-chip--unselected {
    color: rgb(var(--v-theme-ink));
    border: 1px solid rgb(var(--v-theme-border-strong));
  }
}
</style>
