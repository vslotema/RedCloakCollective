import type { Editor } from '@tiptap/core'

// The live TipTap editor, published here by RichTextEditor.vue while the write
// page is mounted so page-level UI — the voice command controller and its
// toggle button — can reach it without prop-drilling through the `write`
// layout. `null` whenever the editor is not mounted.
const instance = shallowRef<Editor | null>(null)

export function useEditorInstance() {
  return {
    /** Read-only handle on the current editor (`null` when unmounted). */
    editor: instance,
    /** Called by RichTextEditor.vue on create / destroy. */
    setEditor(editor: Editor | null) {
      instance.value = editor
    },
  }
}
