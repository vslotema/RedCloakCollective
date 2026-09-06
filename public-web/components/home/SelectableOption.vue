<script setup lang="ts">
defineProps<{
  label: string
  active: boolean
  multiple: boolean
}>()

defineEmits<{
  toggle: []
}>()
</script>

<template>
  <button
    type="button"
    class="selectable-option"
    :class="{ 'selectable-option--active': active }"
    @click="$emit('toggle')"
  >
    <v-icon
      :icon="multiple ? (active ? 'check-square' : 'square') : active ? 'disc' : 'circle'"
      size="18"
      class="selectable-option__indicator"
    />
    <span class="selectable-option__label">{{ label }}</span>
  </button>
</template>

<style scoped lang="scss">
.selectable-option {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  padding: var(--space-1) var(--space-2);
  border: 1px solid rgb(var(--v-theme-border-color));
  border-radius: var(--radius-sm);
  background: rgb(var(--v-theme-background));
  color: rgb(var(--v-theme-ink));
  text-align: left;
  font-size: var(--text-sm);
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease;

  &:hover {
    border-color: rgb(var(--v-theme-secondary));
  }

  &--active {
    border-color: rgb(var(--v-theme-secondary));
    background: rgb(var(--v-theme-secondary-lighten-5));
  }
}

.selectable-option__indicator {
  flex: none;
  color: rgb(var(--v-theme-on-surface));
}

.selectable-option--active .selectable-option__indicator {
  color: rgb(var(--v-theme-secondary));
}

.selectable-option__label {
  flex: 1 1 auto;
}
</style>
