<script setup lang="ts">
// Medium-style "+" affordance that sits in the body gutter and fans out the
// insert actions on hover or keyboard focus. Placeholder this phase — each
// action just posts a status message.
const editorStore = useEditorStore()

const insertActions = [
  { label: 'Photo', icon: 'image' },
  { label: 'Link card', icon: 'external-link' },
  { label: 'Video', icon: 'video' },
  { label: 'Code', icon: 'code' },
]

const open = ref(false)
const rootRef = useTemplateRef<HTMLElement>('rootRef')
const toggleRef = useTemplateRef<HTMLButtonElement>('toggleRef')

function focusedWithin() {
  return !!rootRef.value?.contains(document.activeElement)
}

function onLeave() {
  // A keyboard user mid-navigation still has focus inside — keep it open.
  if (!focusedWithin()) open.value = false
}

function onFocusOut(event: FocusEvent) {
  if (!rootRef.value?.contains(event.relatedTarget as Node | null)) open.value = false
}

function collapse() {
  open.value = false
  toggleRef.value?.focus()
}

function choose(label: string) {
  editorStore.statusMessage = `${label} — not available yet`
  open.value = false
}
</script>

<template>
  <div
    ref="rootRef"
    class="insert-menu"
    :class="{ 'insert-menu--open': open }"
    @mouseenter="open = true"
    @mouseleave="onLeave"
    @focusin="open = true"
    @focusout="onFocusOut"
    @keydown.esc="collapse"
  >
    <button
      ref="toggleRef"
      type="button"
      class="insert-menu__btn insert-menu__toggle"
      :aria-expanded="open"
      aria-label="Insert"
      @click="open = !open"
    >
      <v-icon :icon="open ? 'x' : 'plus'" />
    </button>

    <div class="insert-menu__actions" :aria-hidden="!open">
      <button
        v-for="action in insertActions"
        :key="action.label"
        type="button"
        class="insert-menu__btn"
        :aria-label="action.label"
        @click="choose(action.label)"
      >
        <v-icon :icon="action.icon" />
        <v-tooltip activator="parent" location="top" content-class="navbar-tooltip">
          {{ action.label }}
        </v-tooltip>
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.insert-menu {
  position: relative;
  display: flex;
  align-items: center;
  width: var(--control-min-size);
  height: var(--control-min-size);

  &__btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: var(--control-min-size);
    height: var(--control-min-size);
    flex-shrink: 0;
    color: rgb(var(--v-theme-on-surface));
    background: rgb(var(--v-theme-background));
    border: 1px solid rgb(var(--v-theme-border-color));
    border-radius: 50%;
    cursor: pointer;
    transition:
      color 0.12s ease,
      border-color 0.12s ease;

    &:hover {
      color: rgb(var(--v-theme-ink));
      border-color: rgb(var(--v-theme-ink));
    }
  }

  &__toggle {
    color: rgb(var(--v-theme-ink));
  }

  &__actions {
    position: absolute;
    left: calc(100% + var(--space-2));
    top: 50%;
    display: flex;
    align-items: center;
    gap: var(--space-2);
    opacity: 0;
    visibility: hidden;
    transform: translateY(-50%) translateX(-0.5rem);
    // Delay only the visibility flip so the fade-out is visible on close.
    transition:
      opacity 0.15s ease,
      transform 0.15s ease,
      visibility 0s linear 0.15s;
  }

  &--open &__actions {
    opacity: 1;
    visibility: visible;
    transform: translateY(-50%);
    transition-delay: 0s;
  }
}
</style>
