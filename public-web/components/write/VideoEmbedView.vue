<script setup lang="ts">
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'
import { parseVideoUrl } from './video-embed'

// Vue NodeView for the `videoEmbed` node (see ./video-embed.ts). Two states:
// a pending prompt (empty `src`) and the resolved full-width iframe.
const props = defineProps(nodeViewProps)

const value = ref('')
const error = ref('')
const inputRef = useTemplateRef<HTMLInputElement>('inputRef')

onMounted(() => {
  if (!props.node.attrs.src) nextTick(() => inputRef.value?.focus())
})

function submit() {
  const parsed = parseVideoUrl(value.value)
  if (!parsed) {
    error.value = "Couldn't recognize that video link"
    return
  }
  props.updateAttributes(parsed)
}

// Keep the field's own keys from reaching ProseMirror (which would split the
// doc on Enter, delete the node on Backspace, etc.).
function onKeydown(event: KeyboardEvent) {
  event.stopPropagation()
  if (event.key === 'Enter') {
    event.preventDefault()
    submit()
  } else if (event.key === 'Escape') {
    event.preventDefault()
    props.deleteNode()
  } else if (event.key === 'Backspace' && !value.value) {
    event.preventDefault()
    props.deleteNode()
  }
}

const iframeTitle = computed(() =>
  props.node.attrs.provider === 'vimeo' ? 'Vimeo video' : 'YouTube video',
)
</script>

<template>
  <NodeViewWrapper
    class="video-embed"
    :class="{ 'video-embed--pending': !node.attrs.src }"
  >
    <div v-if="node.attrs.src" class="video-embed__frame" contenteditable="false">
      <iframe
        :src="node.attrs.src"
        :title="iframeTitle"
        frameborder="0"
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowfullscreen
      />
    </div>

    <div v-else contenteditable="false">
      <input
        ref="inputRef"
        v-model="value"
        type="url"
        class="video-embed__input"
        placeholder="Paste a YouTube, Vimeo, or other video link, and press Enter"
        aria-label="Video link"
        @keydown="onKeydown"
        @mousedown.stop
        @paste.stop
      />
      <p v-if="error" class="video-embed__error">{{ error }}</p>
    </div>
  </NodeViewWrapper>
</template>

<style scoped lang="scss">
.video-embed {
  margin-block: var(--space-4, 1rem);

  &.ProseMirror-selectednode .video-embed__frame {
    outline: 2px solid rgb(var(--v-theme-primary));
    outline-offset: 2px;
  }

  &__frame {
    position: relative;
    width: 100%;
    aspect-ratio: 16 / 9;
    background: #000;
    border-radius: var(--radius-sm, 4px);
    overflow: hidden;

    iframe {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      border: 0;
    }
  }

  &__input {
    display: block;
    width: 100%;
    padding: 0;
    font: inherit;
    color: rgb(var(--v-theme-on-surface));
    background: transparent;
    border: none;
    outline: none;

    &::placeholder {
      color: rgb(var(--v-theme-on-surface));
      opacity: 0.6;
    }
  }

  &__error {
    margin: var(--space-1, 0.25rem) 0 0;
    font-size: var(--text-sm, 0.875rem);
    color: rgb(var(--v-theme-error, 176 0 32));
  }
}
</style>
