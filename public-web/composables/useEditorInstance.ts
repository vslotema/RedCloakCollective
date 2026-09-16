import type { Editor } from '@tiptap/core'

const instance = shallowRef<Editor | null>(null)

export function useEditorInstance() {
  return {
    editor: instance,
    setEditor(editor: Editor | null) {
      instance.value = editor
    },
  }
}
