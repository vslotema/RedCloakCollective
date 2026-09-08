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
  padding: var(--space-6) 0;
  max-width: 45rem;
  width: 100%;
  margin: 0 auto;
  background: rgb(var(--v-theme-background));

  &__title-row {
    position: relative;
    flex-shrink: 0;
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
