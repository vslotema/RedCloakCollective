import { Extension } from '@tiptap/core'
import type { Editor } from '@tiptap/core'
import type { Node as PMNode } from '@tiptap/pm/model'
import { NodeSelection, Plugin, PluginKey, TextSelection } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

// Numbers each top-level block in a left gutter, labelled by TYPE + Nth-of-type
// ("paragraph 1", "video 1", "card 1", "video 2"). Toggle is off by default.
//
// Also the targeting layer for future voice commands: `goToBlock(key, n, where)`
// resolves a spoken reference to a document position so a chained command can act
// there, e.g. `editor.chain().focus().goToBlock('paragraph', 3, 'after').insertVideoEmbed().run()`.

/** Canonical block keys a caller (or the future voice parser) targets. */
export const BLOCK_KEYS = [
  'paragraph',
  'heading',
  'quote',
  'list',
  'code',
  'image',
  'card',
  'video',
  'divider',
] as const

/** ProseMirror node name → friendly key. Unknown names pass through unchanged. */
export function nodeNameToKey(name: string): string {
  switch (name) {
    case 'paragraph':
      return 'paragraph'
    case 'heading':
      return 'heading' // one counter for every level
    case 'blockquote':
      return 'quote'
    case 'bulletList':
    case 'orderedList':
      return 'list'
    case 'codeBlock':
      return 'code'
    case 'image':
      return 'image'
    case 'linkCard':
      return 'card'
    case 'videoEmbed':
      return 'video'
    case 'horizontalRule':
      return 'divider'
    default:
      return name
  }
}

export interface BlockEntry {
  /** Document position immediately before the node. */
  pos: number
  nodeSize: number
  node: PMNode
  key: string
  /** 1-based nth-of-this-key. */
  index: number
  /** `${key} ${index}` */
  label: string
}

/**
 * The one place numbering is computed — the gutter decorations and `goToBlock`
 * both call this against the current doc, so they can never disagree.
 */
export function computeBlocks(doc: PMNode): BlockEntry[] {
  const out: BlockEntry[] = []
  const counters = new Map<string, number>()
  doc.forEach((node, offset) => {
    const key = nodeNameToKey(node.type.name)
    const index = (counters.get(key) ?? 0) + 1
    counters.set(key, index)
    out.push({
      pos: offset,
      nodeSize: node.nodeSize,
      node,
      key,
      index,
      label: `${key} ${index}`,
    })
  })
  return out
}

/** Current block list for an editor (fresh, cheap for article-length docs). */
export function listBlocks(editor: Editor): BlockEntry[] {
  return computeBlocks(editor.state.doc)
}

export const lineNumbersKey = new PluginKey<{ enabled: boolean }>('lineNumbers')

function buildDecorations(doc: PMNode): DecorationSet {
  const decorations = computeBlocks(doc).map((block) =>
    Decoration.widget(
      block.pos,
      () => {
        const el = document.createElement('span')
        el.className = 'line-label'
        el.setAttribute('aria-hidden', 'true')
        el.dataset.blockKey = block.key
        el.dataset.blockIndex = String(block.index)
        el.textContent = block.label
        return el
      },
      { side: -1, key: `ln:${block.key}:${block.index}`, ignoreSelection: true },
    ),
  )
  return DecorationSet.create(doc, decorations)
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    lineNumbers: {
      setLineNumbers: (enabled: boolean) => ReturnType
      toggleLineNumbers: () => ReturnType
      /**
       * Move the selection to the Nth block of a given type.
       * `where` 'before'/'after' land a caret next to it (appending an empty
       * paragraph if the block is last) so a chained insert command has a home.
       */
      goToBlock: (
        key: string,
        n: number,
        where?: 'start' | 'end' | 'before' | 'after',
      ) => ReturnType
    }
  }
}

export const LineNumbers = Extension.create({
  name: 'lineNumbers',

  addStorage() {
    return { enabled: false }
  },

  onCreate() {
    this.storage.enabled = lineNumbersKey.getState(this.editor.state)?.enabled ?? false
  },

  onTransaction() {
    this.storage.enabled = lineNumbersKey.getState(this.editor.state)?.enabled ?? false
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: lineNumbersKey,
        state: {
          init: () => ({ enabled: false }),
          apply(tr, value) {
            const meta = tr.getMeta(lineNumbersKey)
            return meta && typeof meta.enabled === 'boolean'
              ? { enabled: meta.enabled }
              : value
          },
        },
        props: {
          decorations(state) {
            return lineNumbersKey.getState(state)?.enabled
              ? buildDecorations(state.doc)
              : null
          },
        },
      }),
    ]
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Alt-l': () => this.editor.commands.toggleLineNumbers(),
    }
  },

  addCommands() {
    return {
      setLineNumbers:
        (enabled) =>
        ({ tr, dispatch }) => {
          if (dispatch) dispatch(tr.setMeta(lineNumbersKey, { enabled }))
          return true
        },

      toggleLineNumbers:
        () =>
        ({ state, tr, dispatch }) => {
          const enabled = !(lineNumbersKey.getState(state)?.enabled ?? false)
          if (dispatch) dispatch(tr.setMeta(lineNumbersKey, { enabled }))
          return true
        },

      goToBlock:
        (keyInput, n, where = 'start') =>
        ({ state, tr, dispatch }) => {
          const wantKey = nodeNameToKey(String(keyInput))
          const entry = computeBlocks(state.doc).find(
            (b) => b.key === wantKey && b.index === n,
          )
          if (!entry) return false

          const { doc } = state

          if (where === 'start' || where === 'end') {
            if (entry.node.isAtom && !entry.node.isText) {
              if (dispatch) {
                dispatch(
                  tr.setSelection(NodeSelection.create(doc, entry.pos)).scrollIntoView(),
                )
              }
              return true
            }
            const at =
              where === 'start' ? entry.pos + 1 : entry.pos + entry.nodeSize - 1
            if (dispatch) {
              dispatch(
                tr
                  .setSelection(
                    TextSelection.near(doc.resolve(at), where === 'start' ? 1 : -1),
                  )
                  .scrollIntoView(),
              )
            }
            return true
          }

          // before / after — land a caret in the gap so a follow-up insert lands there.
          const gap = where === 'before' ? entry.pos : entry.pos + entry.nodeSize

          if (where === 'after' && !doc.childAfter(gap).node) {
            const paragraph = state.schema.nodes.paragraph?.createAndFill()
            if (!paragraph) return false
            if (dispatch) {
              tr.insert(gap, paragraph)
              dispatch(
                tr.setSelection(TextSelection.create(tr.doc, gap + 1)).scrollIntoView(),
              )
            }
            return true
          }

          if (dispatch) {
            dispatch(
              tr
                .setSelection(
                  TextSelection.near(doc.resolve(gap), where === 'before' ? -1 : 1),
                )
                .scrollIntoView(),
            )
          }
          return true
        },
    }
  },
})
