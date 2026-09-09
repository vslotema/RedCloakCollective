import type { JSONContent } from '@tiptap/core'

/**
 * Cursor / selection position inside the document, mirrored from the TipTap
 * editor. Positions are ProseMirror document offsets (`state.selection`), not
 * DOM ranges. `null` until the editor first reports one — during SSR, or
 * before the editor mounts / gains focus.
 */
export interface EditorSelection {
  from: number
  to: number
  /** No range selected — `from === to`, a plain caret. */
  empty: boolean
}

/** A fresh, empty TipTap document (one empty paragraph). */
function emptyDoc(): JSONContent {
  return { type: 'doc', content: [{ type: 'paragraph' }] }
}

/** Flatten all `text` nodes in a TipTap document into one string. */
function docText(node: JSONContent): string {
  if (node.text) return node.text
  return (node.content ?? []).map(docText).join(' ')
}

// There's a single local draft slot — writing a new one replaces whatever was
// there. Read/written only client-side; SSR never touches localStorage.
const DRAFT_STORAGE_KEY = 'editor_draft'
const AUTOSAVE_DELAY_MS = 800

interface StoredDraft {
  title: string
  doc: JSONContent
  savedAt: number
}

function readStoredDraft(): StoredDraft | null {
  if (!import.meta.client) return null
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as StoredDraft) : null
  } catch {
    return null
  }
}

export const useEditorStore = defineStore('editor', () => {
  // The document body as ProseMirror / TipTap JSON — the single source of
  // truth the editor reads on mount and writes back to on every update.
  const doc = ref<JSONContent>(emptyDoc())
  const title = ref('')

  const selection = ref<EditorSelection | null>(null)

  // `dirty` flips true on any local edit and back to false once the current
  // state has been persisted (`markSaved`). `lastSavedAt` is an epoch-ms
  // timestamp of the last successful save, or null if never saved this session.
  const dirty = ref(false)
  const lastSavedAt = ref<number | null>(null)

  // Transient status line for the write page ("Image added", "Paste a link"…).
  const statusMessage = ref('Ready')

  // Object URL for the chosen header image — local preview only this phase,
  // not uploaded or persisted. Lives on the store (not the field component) so
  // it survives the component unmounting and there's one place that revokes it.
  const headerImageUrl = ref<string | null>(null)
  // object-position for the preview, as x/y percentages (0–100). Only shifts
  // anything on an axis where the image overflows its frame under
  // object-fit: cover — the field component drives it from drag / arrow keys.
  const headerImagePosition = ref({ x: 50, y: 50 })

  const wordCount = computed(() => {
    const text = docText(doc.value).trim()
    return text ? text.split(/\s+/).length : 0
  })

  function setDoc(next: JSONContent) {
    doc.value = next
    dirty.value = true
    scheduleAutosave()
  }

  function setTitle(next: string) {
    title.value = next
    dirty.value = true
    scheduleAutosave()
  }

  function setSelection(next: EditorSelection | null) {
    selection.value = next
  }

  /**
   * Replace the whole document — e.g. after loading a draft from the API.
   * Resets dirty/selection since nothing local has changed yet.
   */
  function load(payload: { title?: string; doc?: JSONContent } = {}) {
    title.value = payload.title ?? ''
    doc.value = payload.doc ?? emptyDoc()
    selection.value = null
    dirty.value = false
    lastSavedAt.value = null
  }

  /** Mark the current state as persisted. */
  function markSaved() {
    dirty.value = false
    lastSavedAt.value = Date.now()
  }

  // Guards loadDraft so it restores from storage only once per real page
  // load. This store instance (and this flag) survives in-app navigation —
  // including the browser back/forward buttons, which Vue Router handles
  // client-side without reloading the document — so re-entering /write that
  // way won't repopulate a draft the user just left blank. Only an actual
  // reload tears down the JS context and resets this to false.
  let draftRestoredThisLoad = false

  let autosaveTimer: ReturnType<typeof setTimeout> | null = null

  function scheduleAutosave() {
    if (!import.meta.client) return
    if (autosaveTimer) clearTimeout(autosaveTimer)
    autosaveTimer = setTimeout(saveDraft, AUTOSAVE_DELAY_MS)
  }

  /** Write the current title/doc to the local draft slot, replacing whatever was there. */
  function saveDraft() {
    if (autosaveTimer) {
      clearTimeout(autosaveTimer)
      autosaveTimer = null
    }
    if (!import.meta.client) return
    const stored: StoredDraft = { title: title.value, doc: doc.value, savedAt: Date.now() }
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(stored))
    markSaved()
  }

  /**
   * Restore the last saved draft, if any, into the working document — but
   * only the first time this is called per page load, see
   * `draftRestoredThisLoad` above.
   */
  function loadDraft() {
    if (draftRestoredThisLoad) return
    draftRestoredThisLoad = true
    const stored = readStoredDraft()
    if (!stored) return
    load({ title: stored.title, doc: stored.doc })
    lastSavedAt.value = stored.savedAt
  }

  /** Save any unpersisted edits right now instead of waiting for the debounce. */
  function flushDraft() {
    if (autosaveTimer) {
      clearTimeout(autosaveTimer)
      autosaveTimer = null
    }
    if (dirty.value) saveDraft()
  }

  /**
   * Leaving the write page: persist anything unsaved, then blank the working
   * document. The saved draft in storage is untouched, so `loadDraft` brings
   * it back on the next visit.
   */
  function leaveDraft() {
    flushDraft()
    reset()
  }

  function setHeaderImage(file: File) {
    if (headerImageUrl.value) URL.revokeObjectURL(headerImageUrl.value)
    headerImageUrl.value = URL.createObjectURL(file)
    headerImagePosition.value = { x: 50, y: 50 }
  }

  function clearHeaderImage() {
    if (headerImageUrl.value) URL.revokeObjectURL(headerImageUrl.value)
    headerImageUrl.value = null
    headerImagePosition.value = { x: 50, y: 50 }
  }

  function moveHeaderImage(x: number, y: number) {
    const clamp = (n: number) => Math.min(100, Math.max(0, n))
    headerImagePosition.value = { x: clamp(x), y: clamp(y) }
  }

  /** Back to a blank document with no header image. */
  function reset() {
    load()
    clearHeaderImage()
    statusMessage.value = 'Ready'
  }

  return {
    doc,
    title,
    selection,
    dirty,
    lastSavedAt,
    statusMessage,
    headerImageUrl,
    headerImagePosition,
    wordCount,
    setDoc,
    setTitle,
    setSelection,
    load,
    markSaved,
    saveDraft,
    loadDraft,
    flushDraft,
    leaveDraft,
    setHeaderImage,
    clearHeaderImage,
    moveHeaderImage,
    reset,
  }
})
