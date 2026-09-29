<script setup lang="ts">
import RichTextEditor from '~/components/write/RichTextEditor.vue'

definePageMeta({ layout: 'write', middleware: 'auth' })

const route = useRoute()
const router = useRouter()
const editorStore = useEditorStore()

function routeId(raw: string | string[] | undefined): number | null {
  const value = Array.isArray(raw) ? raw[0] : raw
  return value ? Number(value) : null
}

const idParam = computed(() => routeId(route.params.id))

if (idParam.value !== null && Number.isNaN(idParam.value)) {
  throw createError({ statusCode: 404, statusMessage: 'Draft not found', fatal: true })
}

async function loadForRoute(id: number) {
  try {
    await editorStore.loadArticle(id)
  } catch (error) {
    const status =
      (error as { status?: number }).status ?? (error as { statusCode?: number }).statusCode
    throw createError({
      statusCode: status === 403 ? 403 : 404,
      statusMessage: status === 403 ? 'This draft isn’t yours' : 'Draft not found',
      fatal: true,
    })
  }
}

function flushOnHide() {
  void editorStore.flush({ keepalive: true })
}

function onVisibilityChange() {
  if (document.visibilityState === 'hidden') flushOnHide()
}

onMounted(async () => {
  if (idParam.value !== null) {
    await loadForRoute(idParam.value)
  } else if (!editorStore.resumeNewDraft()) {
    editorStore.startNew()
  }

  window.addEventListener('pagehide', flushOnHide)
  document.addEventListener('visibilitychange', onVisibilityChange)
})

onBeforeUnmount(() => {
  window.removeEventListener('pagehide', flushOnHide)
  document.removeEventListener('visibilitychange', onVisibilityChange)
  // Stop timers / in-flight saves but keep any recovery buffer — an offline
  // edit navigated away from should still be resumable on the next visit.
  editorStore.resetSession()
})

onBeforeRouteLeave(async () => {
  await editorStore.flush()
})

// Switching between drafts (or to a new one) without leaving the page.
onBeforeRouteUpdate(async (to) => {
  const nextId = routeId(to.params.id)
  // Our own silent /write → /write/{id} upgrade after the first save.
  if (nextId === editorStore.articleId) return
  await editorStore.flush()
  if (nextId !== null) await loadForRoute(nextId)
  else editorStore.startNew()
})

// After the first save creates the row, upgrade /write → /write/{id} silently.
watch(
  () => editorStore.articleId,
  (id) => {
    if (id !== null && idParam.value === null) {
      router.replace(`/write/${id}`)
    }
  },
)

// The title textarea auto-grows with its content instead of scrolling or
// offering a manual resize handle — height is JS-driven, not user-draggable.
const TITLE_MAX_LENGTH = 255

const titleRef = useTemplateRef<HTMLTextAreaElement>('titleRef')

const SUBTITLE_MAX_LENGTH = 280

const subtitleRef = useTemplateRef<HTMLTextAreaElement>('subtitleRef')

function resizeToContent(el: HTMLTextAreaElement | null) {
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

function resizeTitle() {
  resizeToContent(titleRef.value)
}

function resizeSubtitle() {
  resizeToContent(subtitleRef.value)
}

function onTitleInput(event: Event) {
  editorStore.setTitle((event.target as HTMLTextAreaElement).value)
  resizeTitle()
}

function onSubtitleInput(event: Event) {
  editorStore.setExcerpt((event.target as HTMLTextAreaElement).value)
  resizeSubtitle()
}

function preventLineBreak(event: KeyboardEvent) {
  if (event.key === 'Enter') event.preventDefault()
}

// Height also needs recalculating when the title is set from outside typing
// (loading a draft, undo, voice dictation).
watch(() => editorStore.title, () => nextTick(resizeTitle))
watch(() => editorStore.excerpt, () => nextTick(resizeSubtitle))
onMounted(() => nextTick(() => {
  resizeTitle()
  resizeSubtitle()
}))
</script>

<template>
  <section aria-label="Document editor" class="editor-main">
    <div class="editor-main__title-row">
      <span
        class="editor-main__title-caption"
        :class="{ 'editor-main__title-caption--hidden': !editorStore.title }"
        aria-hidden="true"
      >
        Title
      </span>
      <textarea
        id="doc-title"
        ref="titleRef"
        :value="editorStore.title"
        rows="1"
        :maxlength="TITLE_MAX_LENGTH"
        aria-label="Title"
        class="editor-main__title text-h3"
        :class="{ 'editor-main__title--error': editorStore.titleInvalid }"
        placeholder="Title"
        @input="onTitleInput"
        @keydown="preventLineBreak"
      />
    </div>

    <div class="editor-main__title-row editor-main__title-row--subtitle">
      <span
        class="editor-main__title-caption"
        :class="{ 'editor-main__title-caption--hidden': !editorStore.excerpt }"
        aria-hidden="true"
      >
        Subtitle
      </span>
      <textarea
        id="doc-subtitle"
        ref="subtitleRef"
        :value="editorStore.excerpt"
        rows="1"
        :maxlength="SUBTITLE_MAX_LENGTH"
        aria-label="Subtitle"
        class="editor-main__title editor-main__subtitle text-h6 font-weight-regular"
        placeholder="Subtitle"
        @input="onSubtitleInput"
        @keydown="preventLineBreak"
      />
    </div>

    <HeaderImageField />

    <RichTextEditor
      :model-value="editorStore.doc"
      :selection="editorStore.selection"
      @update:model-value="editorStore.setDoc"
      @update:selection="editorStore.setSelection"
    />
  </section>
</template>

<style scoped lang="scss">
.editor-main {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  gap: var(--space-4);
  padding: var(--space-6) 0;
  max-width: 45rem;
  width: 100%;
  margin: 0 auto;

  &__title-row {
    position: relative;
    flex-shrink: 0;
    background: rgb(var(--v-theme-background));
    border-radius: 0.25rem;
    padding: 0.5rem 0;
  }

  &__title-caption {
    position: absolute;
    right: calc(100% + var(--space-3));
    top: 50%;
    transform: translateY(-50%);
    white-space: nowrap;
    font-size: var(--text-sm);
    color: rgb(var(--v-theme-on-surface));

    &--hidden {
      visibility: hidden;
    }
  }

  &__title {
    display: block;
    width: 100%;
    font-family: inherit;
    background: transparent;
    border: none;
    padding-left: var(--space-3);
    min-height: var(--control-min-size);
    resize: none;
    overflow: hidden;

    &::placeholder {
      color: rgb(var(--v-theme-border-color));
    }

    &:focus-visible {
      outline: none;
    }

    &--error {
      border: 2px solid rgb(var(--v-theme-error));
      border-radius: 0.25rem;
    }
  }

  &__title-row--subtitle {
    padding: 0.25rem 0;
  }

  &__subtitle {
    min-height: 2rem;
    color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  }
}
</style>
