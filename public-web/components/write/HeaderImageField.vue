<script setup lang="ts">
// Header (cover) image for the story. Local preview only this phase — the
// picked file is held as an object URL on the editor store, not uploaded.
const editorStore = useEditorStore()

const inputRef = useTemplateRef<HTMLInputElement>('inputRef')
const frameRef = useTemplateRef<HTMLElement>('frameRef')
const imgRef = useTemplateRef<HTMLImageElement>('imgRef')

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
      <figcaption class="header-image__actions">
        <button type="button" class="header-image__btn" @click="openPicker">Replace</button>
        <button type="button" class="header-image__btn" @click="remove">Remove</button>
      </figcaption>
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
    min-height: var(--control-min-size-lg);
    padding: var(--space-4);
    font-size: var(--text-md);
    font-family: inherit;
    color: rgb(var(--v-theme-on-surface));
    background: rgb(var(--v-theme-surface));
    border: 1px dashed rgb(var(--v-theme-border-color));
    border-radius: var(--radius-sm);
    cursor: pointer;

    &:hover,
    &--dragging {
      color: rgb(var(--v-theme-ink));
      border-color: rgb(var(--v-theme-primary));
    }
  }

  &__preview {
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

  &__actions {
    display: flex;
    gap: var(--space-2);
    margin-top: 0;
    max-height: 0;
    opacity: 0;
    overflow: hidden;
    transition:
      opacity 0.15s ease,
      max-height 0.15s ease,
      margin-top 0.15s ease;
  }

  // Reveal on focus (keyboard/switch/touch) or hover (mouse) — kept as opacity
  // + collapsed height rather than display:none/visibility:hidden so the
  // buttons stay reachable to screen readers regardless of visual state.
  &__preview:focus-within &__actions,
  &__preview:hover &__actions {
    margin-top: var(--space-2);
    max-height: 4rem;
    opacity: 1;
  }

  &__btn {
    min-height: var(--control-min-size);
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
