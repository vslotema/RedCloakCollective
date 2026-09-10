import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

// A ghost preview of the words the voice controller is still hearing while in
// dictation mode. The interim transcript is NOT written into the document —
// it changes on every syllable and would flood the undo stack / autosave — it
// is drawn as a widget decoration at the caret and cleared the instant the
// phrase finalises, at which point the controller inserts the real text.

export const dictationPreviewKey = new PluginKey<string>('dictationPreview')

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    dictationPreview: {
      /** Show `text` as a ghost preview at the caret; an empty string clears it. */
      setDictationPreview: (text: string) => ReturnType
    }
  }
}

export const DictationPreview = Extension.create({
  name: 'dictationPreview',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: dictationPreviewKey,
        state: {
          init: () => '',
          apply(tr, value) {
            const meta = tr.getMeta(dictationPreviewKey)
            return typeof meta === 'string' ? meta : value
          },
        },
        props: {
          decorations(state) {
            const text = dictationPreviewKey.getState(state)
            if (!text) return null
            const widget = Decoration.widget(
              state.selection.to,
              () => {
                const el = document.createElement('span')
                el.className = 'dictation-preview'
                el.setAttribute('aria-hidden', 'true')
                el.textContent = text
                return el
              },
              { side: 1, key: `dictation:${text}`, ignoreSelection: true },
            )
            return DecorationSet.create(state.doc, [widget])
          },
        },
      }),
    ]
  },

  addCommands() {
    return {
      setDictationPreview:
        (text) =>
        ({ tr, dispatch, state }) => {
          if ((dictationPreviewKey.getState(state) ?? '') === text) return false
          // Meta-only transaction: no doc change, kept out of the undo history
          // so `onUpdate` / autosave never see it.
          if (dispatch) {
            dispatch(tr.setMeta(dictationPreviewKey, text).setMeta('addToHistory', false))
          }
          return true
        },
    }
  },
})
