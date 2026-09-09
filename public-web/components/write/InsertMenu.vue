<script setup lang="ts">
import type { Editor } from '@tiptap/vue-3'
import { insertCodeBlock } from './editor-actions'

const { editor } = defineProps<{ editor: Editor }>()

const editorStore = useEditorStore()
// A voice "insert image" can't open the file picker, so it flags the photo
// button here to pulse until the user taps it (or the flag times out).
const { imagePrompt, clearImagePrompt } = useArticleVoice()

const insertActions = [
  { label: 'Photo', icon: 'image' },
  { label: 'Link card', icon: 'external-link' },
  { label: 'Video', icon: 'video' },
  { label: 'Code', icon: 'code' },
]

const open = ref(false)
const rootRef = useTemplateRef<HTMLElement>('rootRef')
const toggleRef = useTemplateRef<HTMLButtonElement>('toggleRef')
const fileInputRef = useTemplateRef<HTMLInputElement>('fileInputRef')

function focusedWithin() {
  return !!rootRef.value?.contains(document.activeElement)
}

function onLeave() {
  if (!focusedWithin()) open.value = false
}

function onFocusOut(event: FocusEvent) {
  if (!rootRef.value?.contains(event.relatedTarget as Node | null)) open.value = false
}

function collapse() {
  open.value = false
  toggleRef.value?.focus()
}

watch(imagePrompt, (on) => {
  if (on) open.value = true
})

function choose(label: string) {
  if (label === 'Photo') {
    clearImagePrompt()
    fileInputRef.value?.click()
    return
  }
  if (label === 'Link card') {
    editor.chain().focus().insertLinkCard().run()
    editorStore.statusMessage = 'Paste a link'
    open.value = false
    return
  }
  if (label === 'Code') {
    insertCodeBlock(editor)
    editorStore.statusMessage = 'Code block added'
    open.value = false
    return
  }
  if (label === 'Video') {
    editor.chain().focus().insertVideoEmbed().run()
    editorStore.statusMessage = 'Paste a video link'
    open.value = false
    return
  }
  editorStore.statusMessage = `${label} — not available yet`
  open.value = false
}

async function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  // Let the same file be picked again after it's inserted / removed.
  input.value = ''
  clearImagePrompt()
  if (!file) return

  if (!file.type.startsWith('image/')) {
    editorStore.statusMessage = "That file isn't an image"
    return
  }

  open.value = false
  editorStore.statusMessage = 'Uploading image…'
  try {
    const src = await editorStore.uploadBodyImage(file)
    editor.chain().focus().setImage({ src }).run()
    editorStore.statusMessage = 'Image added'
  } catch (error) {
    const data = (error as { data?: { errors?: Record<string, string[]>; message?: string } }).data
    editorStore.statusMessage =
      data?.errors?.image?.[0] ?? data?.message ?? 'Image upload failed'
  }
}
</script>

<template>
  <div
    ref="rootRef"
    class="insert-menu"
    :class="{ 'insert-menu--open': open }"
  >
    <input
      ref="fileInputRef"
      type="file"
      accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
      class="insert-menu__file"
      aria-hidden="true"
      tabindex="-1"
      @change="onFileChange"
    />

    <v-btn
      ref="toggleRef"
      type="button"
      class="insert-menu__btn insert-menu__toggle"
      :aria-expanded="open"
      aria-label="Insert"
      icon
      variant="outlined"
      size="small"
      @click="open ? collapse() : (open = true)"
    >
      <v-icon :icon="open ? 'x' : 'plus'" />
</v-btn>

    <div class="insert-menu__actions" :aria-hidden="!open">
      <v-btn
        v-for="action in insertActions"
        :key="action.label"
        type="button"
        theme="dark"
        class="insert-menu__btn"
        :class="{
          'insert-menu__btn--pulse': action.label === 'Photo' && imagePrompt,
        }"
        :aria-label="action.label"
        icon
        size="small"
        @click="choose(action.label)"
      >
        <v-icon :icon="action.icon"/>
        <v-tooltip activator="parent" location="top" content-class="navbar-tooltip">
          {{ action.label }}
        </v-tooltip>
      </v-btn>
    </div>

    <p v-if="imagePrompt" class="insert-menu__sr-hint" aria-live="assertive">
      Choose a photo — activate the Photo button.
    </p>
  </div>
</template>

<style scoped lang="scss">
.insert-menu {
  position: relative;
  display: flex;
  align-items: center;
  width: var(--control-min-size);
  height: var(--control-min-size);

  &__file {
    // Kept in the DOM but out of the layout / tab order — the Photo button
    // drives it.
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }

  &__btn {
    color: rgb(var(--v-theme-on-surface));
    background: rgb(var(--v-theme-background));
    border: 1px solid rgb(var(--v-theme-border-color));

    &:hover {
      color: rgb(var(--v-theme-ink));
      border-color: rgb(var(--v-theme-ink));
    }

    // Voice "insert image" flags the Photo button here — a voice event can't
    // open the OS file picker, so the user taps this.
    &--pulse {
      color: rgb(var(--v-theme-ink));
      border-color: rgb(var(--v-theme-primary));
      animation: insert-menu-pulse 1.2s ease-in-out infinite;
    }
  }

  &__sr-hint {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    padding: 0;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
    border: 0;
  }

  &__toggle {
    color: rgb(var(--v-theme-ink));
  }

  &__actions {
    position: absolute;
    left: calc(100% + var(--space-1));
    top: 50%;
    display: flex;
    align-items: center;
    gap: var(--space-1);
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

@keyframes insert-menu-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(var(--v-theme-primary), 0.5);
  }
  50% {
    box-shadow: 0 0 0 6px rgba(var(--v-theme-primary), 0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .insert-menu__btn--pulse {
    animation: none;
  }
}
</style>
