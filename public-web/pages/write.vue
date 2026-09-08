<script setup lang="ts">
import RichTextEditor from '~/components/write/RichTextEditor.vue';
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
    <HeaderImageField />

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

    <RichTextEditor></RichTextEditor>
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

  &__title-row {
    position: relative;
    flex-shrink: 0;
  }

  &__title-caption {
    // Sits outside editor-main's own box, in the gutter to its left —
    // right:100% anchors it just past the row's left edge rather than
    // inside editor-main's padding.
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

  &__title,
  &__body {
    display: block;
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

  &__body-wrap {
    position: relative;
    display: flex;
    flex-direction: column;
    // flex-basis: auto (not the flex:1 shorthand's 0) so an explicit textarea
    // height set by resizeBody() is respected instead of being capped to the
    // container by flex-grow distribution.
    flex: 1 1 auto;
    min-height: 0;
  }

  &__insert {
    align-self: flex-start;
    margin-bottom: var(--space-3);

    // Room opens up either side of the 45rem column on wide viewports — lift
    // the control into the left gutter, Medium-style, where it's out of the
    // writing flow.
    @include respond-to('lg') {
      position: absolute;
      top: 0;
      right: calc(100% + var(--space-4));
      margin-bottom: 0;
    }
  }

  &__body {
    // The border/offset above keeps this aligned with the title's text
    // column, but the line itself should only be visible on the title.
    border-left-color: transparent;
    flex: 1 1 auto;
    min-height: 0;
    font-size: var(--text-md);
    color: rgb(var(--v-theme-ink));
    overflow: hidden;
    resize: none;
  }
}
</style>
