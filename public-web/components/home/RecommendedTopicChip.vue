<script setup lang="ts">
defineProps<{
  label: string
  added: boolean
}>()

defineEmits<{
  toggle: []
}>()
</script>

<template>
  <button
    type="button"
    class="topic-chip"
    @click="$emit('toggle')"
  >
    <span class="topic-chip__label">{{ label }}</span>
    <span class="topic-chip__add">
      <v-icon :icon="added ? 'check' : 'plus'" size="14" />
    </span>
  </button>
</template>

<style scoped lang="scss">
.topic-chip {
  display: inline-flex;
  align-items: stretch;
  border: 1px solid rgb(var(--v-theme-border-color));
  border-radius: 999px;
  overflow: hidden;
  background: rgb(var(--v-theme-background));
  color: rgb(var(--v-theme-ink));
  font-size: var(--text-sm);
  line-height: 1;
  cursor: pointer;
  transition: border-color 0.15s ease;

  &__label {
    display: flex;
    align-items: center;
    padding: var(--space-2) var(--space-3);
  }

  &__add {
    display: flex;
    align-items: center;
    padding: 0 var(--space-2);
    border-left: 1px solid rgb(var(--v-theme-border-color));
    color: rgb(var(--v-theme-on-surface));
  }

}
</style>
