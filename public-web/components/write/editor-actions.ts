import type { Editor } from '@tiptap/core'
import { liftTarget } from '@tiptap/pm/transform'

// The editor-command bodies shared by the toolbar / insert menu and the voice
// controller, so a spoken "bold" and the Bold button run exactly the same code.
// Each takes the live TipTap editor and performs one focused action.

export function toggleBold(editor: Editor) {
  editor.chain().focus().toggleBold().run()
}

export function toggleItalic(editor: Editor) {
  editor.chain().focus().toggleItalic().run()
}

/** True when any part of the current selection sits inside a blockquote. */
export function selectionHasBlockquote(editor: Editor): boolean {
  const type = editor.schema.nodes.blockquote
  if (!type) return false
  const { from, to } = editor.state.selection
  let found = false
  editor.state.doc.nodesBetween(from, to, (node) => {
    if (node.type === type) found = true
  })
  return found
}

/**
 * Wrap the selection in a blockquote, or lift it back out if it is already
 * quoted. The lift path walks every blockquote overlapping the selection and
 * unwraps it — TipTap has no built-in "unwrap blockquote".
 */
export function toggleQuote(editor: Editor) {
  if (!selectionHasBlockquote(editor)) {
    editor.chain().focus().wrapIn('blockquote').run()
    return
  }
  editor
    .chain()
    .focus()
    .command(({ tr, dispatch }) => {
      const type = editor.schema.nodes.blockquote
      const ranges: { from: number; to: number }[] = []
      const { from, to } = tr.selection
      tr.doc.nodesBetween(from, to, (node, pos) => {
        if (node.type === type) ranges.push({ from: pos, to: pos + node.nodeSize })
      })
      if (!ranges.length) return false
      if (!dispatch) return true

      ranges.sort((a, b) => b.from - a.from)
      for (const range of ranges) {
        const blockRange = tr.doc
          .resolve(range.from + 1)
          .blockRange(tr.doc.resolve(range.to - 1))
        const depth = blockRange && liftTarget(blockRange)
        if (depth != null) tr.lift(blockRange!, depth)
      }
      return true
    })
    .run()
}

/** Toggle a heading level — 1 is "Big title", 2 is "Small title". */
export function toggleHeading(editor: Editor, level: 1 | 2) {
  editor.chain().focus().toggleHeading({ level }).run()
}

export function insertCodeBlock(editor: Editor) {
  editor.chain().focus().setCodeBlock().run()
}

export function toggleBlockNumbers(editor: Editor) {
  editor.chain().focus().toggleLineNumbers().run()
}

export function undo(editor: Editor) {
  editor.chain().focus().undo().run()
}

export function redo(editor: Editor) {
  editor.chain().focus().redo().run()
}
