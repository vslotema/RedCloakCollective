<script setup lang="ts">
definePageMeta({ layout: 'write', middleware: 'auth' })

const editorStore = useEditorStore()

const bodyRef = useTemplateRef('bodyRef')

// Grows the textarea to fit its content instead of scrolling internally, so
// the page itself scrolls once the body outgrows the visible area. Clearing
// the inline height first lets the CSS flex:1 sizing (fill the remaining
// view) apply again — we only re-set an explicit height when content needs
// more room than that, so it never shrinks below the fill-the-view default.
function resizeBody() {
  const el = bodyRef.value
  if (!el) return
  el.style.height = ''
  if (el.scrollHeight > el.clientHeight) {
    el.style.height = `${el.scrollHeight}px`
  }
}

onMounted(() => {
  resizeBody()
  window.addEventListener('resize', resizeBody)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeBody)
})
watch(
  () => editorStore.content,
  () => nextTick(resizeBody),
)
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
      <input
        id="doc-title"
        v-model="editorStore.title"
        type="text"
        aria-label="Title"
        class="editor-main__title text-h3"
        placeholder="Title"
      />
    </div>

    <textarea
      id="doc-body"
      ref="bodyRef"
      v-model="editorStore.content"
      aria-label="Story"
      class="editor-main__body"
      placeholder="Tell your story…"
      @input="resizeBody"
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
  padding: var(--space-6);
  max-width: 45rem;
  width: 100%;
  margin: 0 auto;

  // Width reserved for the "Title" caption so the title/body text column
  // starts at the same x whether or not the caption is currently visible.
  --title-caption-col: 3.5rem;

  &__title-row {
    position: relative;
    flex-shrink: 0;
  }

  &__title-caption {
    position: absolute;
    left: 30px;
    top: 50%;
    transform: translateY(-50%);
    width: var(--title-caption-col);
    font-size: var(--text-sm);
    color: rgb(var(--v-theme-on-surface));

    &--hidden {
      visibility: hidden;
    }
  }

  &__title,
  &__body {
    display: block;
    margin-left: calc(var(--title-caption-col) + var(--space-3));
    font-family: inherit;
    background: transparent;
    border: none;
    border-left: 1.5px solid rgb(var(--v-theme-border-color));
    padding-left: var(--space-3);

    &::placeholder {
      color: rgb(var(--v-theme-border-color));
    }

    &:focus-visible {
      outline: none;
    }
  }

  &__title {
    min-height: var(--control-min-size);
  }

  &__body {
    // The border/offset above keeps this aligned with the title's text
    // column, but the line itself should only be visible on the title.
    border-left-color: transparent;
    // flex-basis: auto (not the flex:1 shorthand's 0) so the explicit height
    // resizeBody() sets is respected as the item's size instead of being
    // overridden by flex-grow distribution capped to the container.
    flex: 1 1 auto;
    min-height: 0;
    font-size: var(--text-md);
    color: rgb(var(--v-theme-ink));
    overflow: hidden;
    resize: none;
  }
}
</style>
