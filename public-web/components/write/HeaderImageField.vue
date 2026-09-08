<script setup lang="ts">
// Header (cover) image for the story. Local preview only this phase — the
// picked file is held as an object URL on the editor store, not uploaded.
const editorStore = useEditorStore()

const inputRef = useTemplateRef<HTMLInputElement>('inputRef')
const frameRef = useTemplateRef<HTMLElement>('frameRef')
const imgRef = useTemplateRef<HTMLImageElement>('imgRef')
const dropzoneRef = useTemplateRef<HTMLButtonElement>('dropzoneRef')

const dragging = ref(false)

// Pixels of the image that spill past the frame on each axis under
// object-fit: cover. Zero on an axis means it's fully visible and can't pan.
const overflow = ref({ x: 0, y: 0 })
const canPan = computed(() => overflow.value.x > 0 || overflow.value.y > 0)

function openPicker() {
  inputRef.value?.click()
}

function accept(file: File | undefined) {
  if (!file) return
  if (!file.type.startsWith('image/')) {
    editorStore.statusMessage = "That file isn't an image"
    return
  }
  editorStore.setHeaderImage(file)
  editorStore.statusMessage = 'Header image added'
}

function onInputChange(event: Event) {
  const input = event.target as HTMLInputElement
  accept(input.files?.[0])
  // Let the same file be picked again after a remove.
  input.value = ''
}

function onDrop(event: DragEvent) {
  dragging.value = false
  accept(event.dataTransfer?.files?.[0])
}

function remove() {
  editorStore.clearHeaderImage()
  editorStore.statusMessage = 'Header image removed'
  // Move focus somewhere sensible now that the preview (and its toolbar) is gone.
  nextTick(() => dropzoneRef.value?.focus())
}

// --- repositioning ---------------------------------------------------------

function measureOverflow() {
  const frame = frameRef.value
  const img = imgRef.value
  if (!frame || !img?.naturalWidth) {
    overflow.value = { x: 0, y: 0 }
    return
  }
  const scale = Math.max(
    frame.clientWidth / img.naturalWidth,
    frame.clientHeight / img.naturalHeight,
  )
  overflow.value = {
    x: Math.max(0, img.naturalWidth * scale - frame.clientWidth),
    y: Math.max(0, img.naturalHeight * scale - frame.clientHeight),
  }
}

let dragStart = { pointerX: 0, pointerY: 0, x: 50, y: 50 }

function onPointerDown(event: PointerEvent) {
  if (event.button !== 0 || !canPan.value) return
  measureOverflow()
  dragStart = {
    pointerX: event.clientX,
    pointerY: event.clientY,
    x: editorStore.headerImagePosition.x,
    y: editorStore.headerImagePosition.y,
  }
  dragging.value = true
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

function onPointerMove(event: PointerEvent) {
  if (!dragging.value) return
  const { x: ox, y: oy } = overflow.value
  editorStore.moveHeaderImage(
    ox ? dragStart.x - ((event.clientX - dragStart.pointerX) / ox) * 100 : dragStart.x,
    oy ? dragStart.y - ((event.clientY - dragStart.pointerY) / oy) * 100 : dragStart.y,
  )
}

function onPointerUp(event: PointerEvent) {
  dragging.value = false
  ;(event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId)
}

const NUDGE = 4

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Backspace' || event.key === 'Delete') {
    event.preventDefault()
    remove()
    return
  }
  const moves: Record<string, [number, number]> = {
    ArrowLeft: [NUDGE, 0],
    ArrowRight: [-NUDGE, 0],
    ArrowUp: [0, NUDGE],
    ArrowDown: [0, -NUDGE],
  }
  const move = moves[event.key]
  if (!move || !canPan.value) return
  event.preventDefault()
  editorStore.moveHeaderImage(
    editorStore.headerImagePosition.x + move[0],
    editorStore.headerImagePosition.y + move[1],
  )
}

onMounted(() => window.addEventListener('resize', measureOverflow))
onBeforeUnmount(() => window.removeEventListener('resize', measureOverflow))
</script>

<template>
  <div class="header-image">
    <input
      ref="inputRef"
      type="file"
      accept="image/*"
      class="header-image__input"
      aria-hidden="true"
      tabindex="-1"
      @change="onInputChange"
    />

    <button
      v-if="!editorStore.headerImageUrl"
      ref="dropzoneRef"
      type="button"
      class="header-image__dropzone"
      :class="{ 'header-image__dropzone--dragging': dragging }"
      @click="openPicker"
      @dragover.prevent="dragging = true"
      @dragleave.prevent="dragging = false"
      @drop.prevent="onDrop"
    >
      <v-icon icon="image" :size="20" />
      <span>Add header image</span>
    </button>

    <figure v-else class="header-image__preview">
      <div
        ref="frameRef"
        class="header-image__frame"
        :class="{
          'header-image__frame--pannable': canPan,
          'header-image__frame--dragging': dragging,
        }"
        role="group"
        tabindex="0"
        :aria-label="
          canPan ? 'Header image — drag or use the arrow keys to reposition it' : 'Header image'
        "
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
        @keydown="onKeydown"
      >
        <img
          ref="imgRef"
          :src="editorStore.headerImageUrl"
          alt=""
          draggable="false"
          class="header-image__img"
          :style="{
            objectPosition: `${editorStore.headerImagePosition.x}% ${editorStore.headerImagePosition.y}%`,
          }"
          @load="measureOverflow"
        />
      </div>
      <div class="header-image__toolbar" role="toolbar" aria-label="Header image actions">
        <button
          type="button"
          class="header-image__tool"
          aria-label="Replace image"
          @click="openPicker"
        >
          <v-icon icon="refresh-cw" :size="18" />
          <v-tooltip activator="parent" location="right" content-class="navbar-tooltip">
            Replace
          </v-tooltip>
        </button>
        <button
          type="button"
          class="header-image__tool"
          aria-label="Remove image"
          @click="remove"
        >
          <v-icon icon="trash" :size="18" />
          <v-tooltip activator="parent" location="right" content-class="navbar-tooltip">
            Remove
          </v-tooltip>
        </button>
      </div>
    </figure>
  </div>
</template>

<style scoped lang="scss">
.header-image {
  flex-shrink: 0;

  &__input {
    // Kept in the DOM (not display:none) but out of the layout/tab order so
    // the visible button drives it.
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }

  &__dropzone {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    width: 100%;
    min-height: 20rem;
    padding: var(--space-4);
    font-size: var(--text-md);
    font-family: inherit;
    color: rgb(var(--v-theme-on-surface));
    background: rgb(var(--v-theme-on-background));
    border: 1px dashed rgb(var(--v-theme-border-color));
    border-radius: .25rem;
    cursor: pointer;

    &:hover,
    &--dragging {
      color: rgb(var(--v-theme-ink));
      border-color: rgb(var(--v-theme-primary));
    }
  }

  &__preview {
    position: relative;
    margin: 0;
  }

  &__frame {
    width: 100%;
    height: 20rem;
    overflow: hidden;

    &--pannable {
      cursor: grab;
      // Keep a touch-drag on the image from scrolling the page instead.
      touch-action: none;
    }

    &--dragging {
      cursor: grabbing;
    }
  }

  &__img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    user-select: none;
    -webkit-user-drag: none;
  }

  // Vertical action toolbar over the right edge of the image — same look as the
  // BubbleMenu's TextFormattingTools (black panel, white icons), stacked.
  &__toolbar {
    position: absolute;
    top: 50%;
    right: var(--space-3, 0.75rem);
    transform: translateY(-50%);
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 0.25rem;
    border-radius: 0.25rem;
    background: #000;
    opacity: 0;
    visibility: hidden;
    transition:
      opacity 0.15s ease,
      visibility 0s linear 0.15s;
  }

  &__preview:hover &__toolbar,
  &__preview:focus-within &__toolbar {
    opacity: 1;
    visibility: visible;
    transition-delay: 0s;
  }

  &__tool {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    color: #fff;
    background: transparent;
    border: none;
    border-radius: 0.25rem;
    cursor: pointer;
    transition: background-color 0.12s ease;

    &:hover,
    &:focus-visible {
      background: rgba(255, 255, 255, 0.16);
    }
  }
}
</style>
