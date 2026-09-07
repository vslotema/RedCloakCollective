<script setup lang="ts">
// Placeholder tools — non-functional this phase. Each button just posts a
// status message so it's keyboard/switch-reachable and gives feedback, ahead
// of real command wiring in a later phase.
const editorStore = useEditorStore()

const tools = ['Bold', 'Heading', 'List', 'Quote']

function announce(tool: string) {
  editorStore.statusMessage = `${tool} — not available yet`
}
</script>

<template>
  <nav aria-label="Editing tools" class="write-tools">
    <button
      v-for="tool in tools"
      :key="tool"
      type="button"
      class="write-tools__btn"
      @click="announce(tool)"
    >
      {{ tool }}
    </button>
  </nav>
</template>

<style scoped lang="scss">
.write-tools {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: var(--space-2);
  padding: var(--space-4);
  border-bottom: 1px solid rgb(var(--v-theme-border-color));

  @include respond-to('md') {
    width: 220px;
    flex-shrink: 0;
    flex-direction: column;
    border-bottom: none;
    border-right: 1px solid rgb(var(--v-theme-border-color));
  }

  &__btn {
    min-height: var(--control-min-size-lg);
    min-width: var(--control-min-size-lg);
    padding: var(--space-2) var(--space-4);
    font-size: var(--text-md);
    font-family: inherit;
    color: rgb(var(--v-theme-on-surface));
    background: rgb(var(--v-theme-surface));
    border: 1px solid rgb(var(--v-theme-border-color));
    border-radius: var(--radius-sm);
    cursor: pointer;

    &:hover {
      color: rgb(var(--v-theme-ink));
    }
  }
}
</style>
