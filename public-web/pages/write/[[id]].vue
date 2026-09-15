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
const TITLE_MAX_WORDS = 20

const titleRef = useTemplateRef<HTMLTextAreaElement>('titleRef')

function resizeTitle() {
  const el = titleRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

function onTitleInput(event: Event) {
  const el = event.target as HTMLTextAreaElement
  const words = el.value.split(/\s+/).filter(Boolean)
  if (words.length > TITLE_MAX_WORDS) {
    el.value = words.slice(0, TITLE_MAX_WORDS).join(' ')
  }
  editorStore.setTitle(el.value)
  resizeTitle()
}

// A title is one (wrapping) line of text — block hard line breaks.
function onTitleKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter') event.preventDefault()
}

// Height also needs recalculating when the title is set from outside typing
// (loading a draft, undo, voice dictation).
watch(() => editorStore.title, () => nextTick(resizeTitle))
onMounted(() => nextTick(resizeTitle))
</script>

<template>
  <section aria-label="Document editor" class="editor-main">
    <HeaderImageField />

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
        aria-label="Title"
        class="editor-main__title text-h3"
        placeholder="Title"
        @input="onTitleInput"
        @keydown="onTitleKeydown"
      />
    </div>

    <RichTextEditor
      :model-value="editorStore.doc"
      :selection="editorStore.selection"
      @update:model-value="editorStore.setDoc"
      @update:selection="editorStore.setSelection"
    />
  </section>

  <VoiceStatusPill />
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
  }
}
</style>
