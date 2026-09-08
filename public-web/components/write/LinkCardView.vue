<script setup lang="ts">
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'
import { fetchPreview, hostOf } from './link-card'

// Vue NodeView for the `linkCard` node (see ./link-card.ts). Three states:
// a pending prompt (no `href`), a loading skeleton while the preview is
// fetched, and the resolved bookmark card.
const props = defineProps(nodeViewProps)

const value = ref('')
const inputRef = useTemplateRef<HTMLInputElement>('inputRef')

const href = computed<string | null>(() => props.node.attrs.href)
const loading = computed<boolean>(() => props.node.attrs.loading)
const host = computed(() => props.node.attrs.siteName || hostOf(href.value ?? ''))
const title = computed(() => props.node.attrs.title || host.value)

onMounted(() => {
  if (!href.value) {
    nextTick(() => inputRef.value?.focus())
  } else if (loading.value) {
    hydrate(href.value)
  }
})

// A URL pasted straight onto an empty line arrives with loading:true and no
// preview yet — fetch it here too.
watch(
  () => [href.value, loading.value] as const,
  ([h, l]) => {
    if (h && l) hydrate(h)
  },
)

async function hydrate(url: string) {
  const meta = await fetchPreview(url)
  props.updateAttributes({ ...meta, loading: false })
}

function submit() {
  const url = normalizeHref(value.value)
  if (!url) {
    props.deleteNode()
    return
  }
  props.updateAttributes({ href: url, loading: true })
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
</script>

<template>
  <NodeViewWrapper class="link-card-view">
    <div v-if="!href" contenteditable="false">
      <input
        ref="inputRef"
        v-model="value"
        type="url"
        class="link-card-view__input"
        placeholder="Paste a link to embed content from another site, and press Enter"
        aria-label="Link URL"
        @keydown="onKeydown"
        @mousedown.stop
        @paste.stop
      />
    </div>

    <a
      v-else
      class="link-card"
      :class="{ 'link-card--loading': loading }"
      :href="href"
      target="_blank"
      rel="noopener noreferrer nofollow"
      contenteditable="false"
      draggable="false"
      @click.prevent
    >
      <span class="link-card__body">
        <span class="link-card__title">{{ title }}</span>
        <!-- Always rendered so the space is reserved and the host line below
             stays in the same spot whether or not there's a description. -->
        <span class="link-card__desc">{{ node.attrs.description }}</span>
        <span class="link-card__host">{{ host }}</span>
      </span>
      <span v-if="node.attrs.image" class="link-card__media">
        <img :src="node.attrs.image" alt="" loading="lazy" />
      </span>
    </a>
  </NodeViewWrapper>
</template>

<style scoped lang="scss">
.link-card-view {
  margin-block: var(--space-6, 1.5rem);

  &.ProseMirror-selectednode .link-card {
    outline: 2px solid rgb(var(--v-theme-primary));
    outline-offset: 2px;
  }
}

.link-card-view__input {
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

a.link-card {
  display: flex;
  align-items: stretch;
  min-height: 160px;
  background: rgb(var(--v-theme-background));
  border: 1px solid rgb(var(--v-theme-border-color));
  overflow: hidden;
  text-decoration: none;
  color: inherit;
  transition: border-color 0.12s ease;

  &:hover {
    border-color: rgb(var(--v-theme-ink));
  }

  .link-card__body {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    padding: 1.25rem 1.5rem;
    flex: 1 1 auto;
    min-width: 0;
  }

  .link-card__title {
    font-size: 1.125rem;
    font-weight: 600;
    line-height: 1.4;
    color: rgb(var(--v-theme-ink));
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .link-card__desc {
    margin-top: 0.5rem;
    // Reserve two lines whether or not there's text, so the host line stays put.
    min-height: 2.85rem;
    font-size: 0.95rem;
    line-height: 1.5;
    color: rgb(var(--v-theme-on-surface));
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .link-card__host {
    // Pinned to the bottom of the card — same spot on every card.
    margin-top: auto;
    padding-top: 0.75rem;
    font-size: 0.85rem;
    color: rgb(var(--v-theme-on-surface));
  }

  .link-card__media {
    flex: 0 0 160px;
    width: 160px;
    height: 160px;
    align-self: center;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.75rem;
    border-left: 1px solid rgb(var(--v-theme-border-color));
    background: rgb(var(--v-theme-background));

    img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
  }

  &.link-card--loading {
    .link-card__title,
    .link-card__desc,
    .link-card__host {
      color: transparent;
      background: rgb(var(--v-theme-surface-variant, var(--v-theme-surface)));
      border-radius: 2px;
    }

    .link-card__desc {
      max-width: 70%;
    }
  }
}
</style>
