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
    :class="['topic-chip']"
    @click="$emit('click')"
  >
    {{ label }}
  </v-chip>
</template>

<style scoped lang="scss">
.topic-chip {
  color: rgb(var(--v-theme-background));

  &.v-chip--variant-outlined {
    background: rgb(var(--v-theme-background));
    color: rgb(var(--v-theme-ink));
    border-color: rgb(var(--v-theme-ink));
  }
}
</style>
