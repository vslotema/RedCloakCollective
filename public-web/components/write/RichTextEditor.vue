<script setup lang="ts">
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'

const model = defineModel<string>({ default: '' })

const editor = useEditor({
  content: model.value,
  extensions: [StarterKit],
  onUpdate: ({ editor }) => {
    model.value = editor.getHTML()
  },
})

watch(model, (value) => {
  const isSame = editor.value?.getHTML() === value
  if (!isSame) {
    editor.value?.commands.setContent(value, { emitUpdate: false })
  }
})

onBeforeUnmount(() => {
  editor.value?.destroy()
})
</script>

<template>
  <div class="rich-text-editor">
    <v-toolbar
      v-if="editor"
      density="compact"
      color="transparent"
      class="rich-text-editor__toolbar"
    >
      <v-btn
        icon="bold"
        size="small"
        :variant="editor.isActive('bold') ? 'tonal' : 'text'"
        @click="editor.chain().focus().toggleBold().run()"
      />
      <v-btn
        icon="italic"
        size="small"
        :variant="editor.isActive('italic') ? 'tonal' : 'text'"
        @click="editor.chain().focus().toggleItalic().run()"
      />
      <v-btn
        icon="type"
        size="small"
        :variant="editor.isActive('heading', { level: 2 }) ? 'tonal' : 'text'"
        @click="editor.chain().focus().toggleHeading({ level: 2 }).run()"
      />
      <v-btn
        icon="list"
        size="small"
        :variant="editor.isActive('bulletList') ? 'tonal' : 'text'"
        @click="editor.chain().focus().toggleBulletList().run()"
      />
      <v-btn
        icon="message-square"
        size="small"
        :variant="editor.isActive('blockquote') ? 'tonal' : 'text'"
        @click="editor.chain().focus().toggleBlockquote().run()"
      />
    </v-toolbar>
    <editor-content :editor="editor" class="rich-text-editor__content" />
  </div>
</template>

<style scoped lang="scss">
.rich-text-editor {
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: 4px;

  &__toolbar {
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  }

  &__content {
    padding: 16px;
    min-height: 240px;

    :deep(.ProseMirror) {
      outline: none;
    }
  }
}
</style>
