<script setup lang="ts">
import RichTextEditor from '~/components/write/RichTextEditor.vue';
definePageMeta({ layout: 'write', middleware: 'auth' })

const editorStore = useEditorStore()

const bodyRef = useTemplateRef('bodyRef')

function resizeBody() {
  const el = bodyRef.value
  if (!el) return
  el.style.height = ''
  if (el.scrollHeight > el.clientHeight) {
    el.style.height = `${el.scrollHeight}px`
  }
}

function flushDraft() {
  editorStore.flushDraft()
}

onMounted(() => {
  editorStore.loadDraft()
  resizeBody()
  window.addEventListener('resize', resizeBody)
  // Covers a hard reload / tab close, where onBeforeUnmount below may not run.
  window.addEventListener('beforeunload', flushDraft)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeBody)
  window.removeEventListener('beforeunload', flushDraft)
  editorStore.leaveDraft()
})
watch(
  () => editorStore.doc,
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
        :value="editorStore.title"
        type="text"
        aria-label="Title"
        class="editor-main__title text-h3"
        placeholder="Title"
        @input="editorStore.setTitle(($event.target as HTMLInputElement).value)"
      />
    </div>

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
    border-radius: .25rem;
    padding: .5rem 0;
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

  &__title,
  &__body {
    display: block;
    font-family: inherit;
    background: transparent;
    border: none;
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
    flex: 1 1 auto;
    min-height: 0;
  }

  &__insert {
    align-self: flex-start;
    margin-bottom: var(--space-3);

    @include respond-to('lg') {
      position: absolute;
      top: 0;
      right: calc(100% + var(--space-4));
      margin-bottom: 0;
    }
  }

  &__body {
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
