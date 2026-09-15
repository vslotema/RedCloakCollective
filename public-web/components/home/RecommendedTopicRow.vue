<script setup lang="ts">
const props = defineProps<{
  label: string
  added: boolean
  /** Hex color, e.g. "#8B5CF6". */
  color: string
}>()

defineEmits<{
  toggle: []
}>()

function hexToRgb(hex: string) {
  const value = parseInt(hex.replace('#', ''), 16)
  return `${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}`
}

const iconStyle = computed(() => ({
  color: props.color,
  background: `rgba(${hexToRgb(props.color)}, 0.08)`,
}))
</script>

<template>
  <button type="button" class="topic-row" @click="$emit('toggle')">
    <span class="topic-row__icon" :style="iconStyle">
      <v-icon :icon="added ? 'check' : 'plus'" size="14" />
    </span>
    <span class="topic-row__label">{{ label }}</span>
  </button>
</template>

<style scoped lang="scss">
.topic-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  text-align: left;

  &__icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  &__label {
    color: rgb(var(--v-theme-ink));
    font-size: var(--text-sm);
  }
}
</style>
