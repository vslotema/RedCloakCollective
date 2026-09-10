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
// The card's visual styling (`a.link-card`, `.link-card__*`) is shared with the
// published page — see assets/styles/article-content.scss. Only the editor's
// prompt field, selection outline and loading skeleton live here.
.link-card-view {
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

a.link-card.link-card--loading {
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
</style>
