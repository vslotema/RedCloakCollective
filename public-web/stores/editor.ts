import type { JSONContent } from '@tiptap/core'
import type { Article, ArticleState, ArticleTopic } from '~/types/article'

/**
 * A topic on the draft. Existing topics have a numeric `id`; a topic the author
 * typed in the publish dialog that doesn't exist yet has `id: null` and is sent
 * to the API as a name in `new_topics`.
 */
export interface DraftTopic {
  id: number | null
  name: string
  slug?: string
}

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

const AUTOSAVE_DELAY_MS = 2000

// The backend is the source of truth for drafts; localStorage is only a
// write-through recovery buffer for edits that haven't reached the server yet
// (a failed / half-finished save, an offline blip). One key per article id, plus
// `editor_draft:new` for a draft that hasn't been POSTed yet.
const RECOVERY_PREFIX = 'editor_draft:'
// Key used by the pre-backend implementation — cleared on the way past.
const LEGACY_DRAFT_KEY = 'editor_draft'

interface RecoverySnapshot {
  articleId: number | null
  title: string
  excerpt: string
  doc: JSONContent
  topics: DraftTopic[]
  headerImagePosition: { x: number; y: number }
  savedAt: number
}

function readRecovery(key: string): RecoverySnapshot | null {
  if (!import.meta.client) return null
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as RecoverySnapshot) : null
  } catch {
    return null
  }
}

function writeRecovery(key: string, snapshot: RecoverySnapshot) {
  if (!import.meta.client) return
  try {
    localStorage.setItem(key, JSON.stringify(snapshot))
  } catch {
    // Quota / private mode — recovery is best-effort.
  }
}

function dropRecovery(key: string) {
  if (!import.meta.client) return
  try {
    localStorage.removeItem(key)
  } catch {
    // ignore
  }
}

export const useEditorStore = defineStore('editor', () => {
  const api = useApi()

  // The document body as ProseMirror / TipTap JSON — the single source of
  // truth the editor reads on mount and writes back to on every update.
  const doc = ref<JSONContent>(emptyDoc())
  const title = ref('')

  const selection = ref<EditorSelection | null>(null)

  // Server identity. `articleId` is null until the first successful save creates
  // the row; the write page then swaps the URL to /write/{id}.
  const articleId = ref<number | null>(null)
  const slug = ref<string | null>(null)
  const published = ref(false)
  // ISO string once the article has a publish time (past = live, future =
  // scheduled); null for a draft.
  const publishedAt = ref<string | null>(null)

  // Publish metadata, editable in the publish dialog and persisted with the
  // draft. `excerpt` is the preview subtitle; `topics` mixes existing topics
  // (numeric id) with author-typed ones (id null).
  const excerpt = ref('')
  const topics = ref<DraftTopic[]>([])

  const articleState = computed<ArticleState>(() => {
    if (!publishedAt.value) return 'draft'
    return new Date(publishedAt.value).getTime() > Date.now() ? 'scheduled' : 'published'
  })

  // `dirty` flips true on any local edit and back to false once that exact state
  // has reached the server. `savedAt` is an epoch-ms timestamp of the last
  // successful server save. `saving` / `saveError` drive the topbar status.
  const dirty = ref(false)
  const savedAt = ref<number | null>(null)
  const saving = ref(false)
  const saveError = ref<string | null>(null)

  // Transient status line for the write page ("Image added", "Paste a link"…).
  const statusMessage = ref('Ready')

  // Header image. Before upload, `headerImageUrl` is a local `blob:` preview and
  // `headerImageFile` holds the File to upload; after upload it's the server URL
  // and the File is cleared.
  const headerImageUrl = ref<string | null>(null)
  const headerImageFile = ref<File | null>(null)
  // object-position for the preview, as x/y percentages (0–100).
  const headerImagePosition = ref({ x: 50, y: 50 })

  const wordCount = computed(() => {
    const text = docText(doc.value).trim()
    return text ? text.split(/\s+/).length : 0
  })

  // Bumped on every local edit so an in-flight save knows whether the document
  // moved under it (→ leave `dirty` set, another autosave is already queued).
  let editGen = 0
  let autosaveTimer: ReturnType<typeof setTimeout> | undefined
  let inFlight: Promise<void> | null = null
  let createPromise: Promise<number> | null = null

  function markDirty() {
    editGen++
    dirty.value = true
  }

  function recoveryKey() {
    return RECOVERY_PREFIX + (articleId.value ?? 'new')
  }

  function snapshot(): RecoverySnapshot {
    return {
      articleId: articleId.value,
      title: title.value,
      excerpt: excerpt.value,
      doc: doc.value,
      topics: topics.value,
      headerImagePosition: headerImagePosition.value,
      savedAt: Date.now(),
    }
  }

  function applyServerMeta(
    article: Pick<Article, 'id' | 'slug' | 'published' | 'published_at'> &
      Partial<Pick<Article, 'topics' | 'excerpt'>>,
  ) {
    articleId.value = article.id
    slug.value = article.slug
    published.value = article.published
    publishedAt.value = article.published_at
    if (article.topics) topics.value = article.topics.map((t) => ({ ...t }))
    if (article.excerpt !== undefined) excerpt.value = article.excerpt ?? ''
  }

  /**
   * Split the draft topics into existing ids and new names for the API. Only
   * sent on publish/schedule — not in the autosave body — so a cancelled
   * publish dialog doesn't mutate the draft's topics.
   */
  function topicPayload() {
    return {
      topic_ids: topics.value.filter((t) => t.id !== null).map((t) => t.id as number),
      new_topics: topics.value.filter((t) => t.id === null).map((t) => t.name),
    }
  }

  function bodyPayload() {
    return {
      title: title.value,
      excerpt: excerpt.value || null,
      content: doc.value,
      header_image_position: headerImageUrl.value ? headerImagePosition.value : null,
    }
  }

  function setDoc(next: JSONContent) {
    doc.value = next
    markDirty()
    scheduleAutosave()
  }

  function setTitle(next: string) {
    title.value = next
    markDirty()
    scheduleAutosave()
  }

  function setSelection(next: EditorSelection | null) {
    selection.value = next
  }

  /**
   * Replace the whole document — e.g. after loading from the API. Resets
   * dirty/selection since nothing local has changed yet.
   */
  function load(
    payload: { title?: string; excerpt?: string; doc?: JSONContent; topics?: DraftTopic[] } = {},
  ) {
    title.value = payload.title ?? ''
    excerpt.value = payload.excerpt ?? ''
    doc.value = payload.doc ?? emptyDoc()
    topics.value = payload.topics ?? []
    selection.value = null
    dirty.value = false
  }

  function scheduleAutosave() {
    if (!import.meta.client) return
    clearTimeout(autosaveTimer)
    autosaveTimer = setTimeout(() => {
      void persist()
    }, AUTOSAVE_DELAY_MS)
  }

  /** Create the server row if it doesn't exist yet. Memoised while in flight. */
  function ensureArticle(): Promise<number> {
    if (articleId.value !== null) return Promise.resolve(articleId.value)
    if (!createPromise) {
      createPromise = api<Article>('/articles', { method: 'POST', body: bodyPayload() })
        .then((created) => {
          const gen = editGen
          applyServerMeta(created)
          dropRecovery(RECOVERY_PREFIX + 'new')
          if (editGen === gen) {
            dirty.value = false
            savedAt.value = Date.now()
          }
          saveError.value = null
          return created.id
        })
        .finally(() => {
          createPromise = null
        })
    }
    return createPromise
  }

  async function doPersist(opts: { keepalive?: boolean }) {
    const gen = editGen
    const key = recoveryKey()
    saving.value = true
    writeRecovery(key, snapshot())

    try {
      if (articleId.value === null) {
        await ensureArticle()
      } else {
        await api<Article>(`/articles/${articleId.value}`, {
          method: 'PATCH',
          body: bodyPayload(),
          ...opts,
        })
      }
      saveError.value = null
      if (editGen === gen) {
        dirty.value = false
        savedAt.value = Date.now()
        dropRecovery(key)
      }
    } catch {
      // Autosave must never throw into the UI. Keep the recovery copy and the
      // dirty flag so the next edit / flush retries.
      saveError.value = 'Couldn’t save — retrying…'
    } finally {
      saving.value = false
    }
  }

  function persist(opts: { keepalive?: boolean } = {}): Promise<void> {
    if (!import.meta.client) return Promise.resolve()
    // Nothing typed yet — don't create an empty article just because the user
    // opened /write and navigated away.
    if (!dirty.value) return inFlight ?? Promise.resolve()
    if (inFlight) return inFlight
    inFlight = doPersist(opts).finally(() => {
      inFlight = null
    })
    return inFlight
  }

  /** Save any unsynced work right now. `keepalive` for the tab-close path. */
  async function flush(opts: { keepalive?: boolean } = {}) {
    if (!import.meta.client) return
    clearTimeout(autosaveTimer)
    await persist(opts)
    // An edit landed while the first save was in flight — one more pass.
    if (dirty.value) await persist(opts)
  }

  /**
   * Load an existing article for editing. Throws on 403/404 so the page can
   * render an error. If a recovery copy exists for this id it means the last
   * session had unsynced edits — those win and re-save immediately.
   */
  async function loadArticle(id: number) {
    dropRecovery(LEGACY_DRAFT_KEY)
    const server = await api<Article>(`/me/articles/${id}`)
    applyServerMeta(server)
    headerImageUrl.value = server.header_image_url
    headerImageFile.value = null

    const serverTopics: DraftTopic[] = (server.topics ?? []).map((t) => ({ ...t }))

    const recovered = readRecovery(RECOVERY_PREFIX + id)
    if (recovered) {
      load({
        title: recovered.title,
        excerpt: recovered.excerpt ?? '',
        doc: recovered.doc,
        topics: recovered.topics ?? serverTopics,
      })
      headerImagePosition.value = recovered.headerImagePosition
        ?? server.header_image_position
        ?? { x: 50, y: 50 }
      dirty.value = true
      statusMessage.value = 'Restored unsaved changes'
      scheduleAutosave()
    } else {
      load({
        title: server.title,
        excerpt: server.excerpt ?? '',
        doc: server.content,
        topics: serverTopics,
      })
      headerImagePosition.value = server.header_image_position ?? { x: 50, y: 50 }
      dirty.value = false
      savedAt.value = Date.parse(server.updated_at) || Date.now()
      statusMessage.value = 'Ready'
    }
    saving.value = false
    saveError.value = null
  }

  /**
   * Reset per-session state (timers, in-flight saves, server identity, local
   * header image) without touching the document or the recovery buffer —
   * shared by `startNew` and `resumeNewDraft`.
   */
  function resetSession() {
    clearTimeout(autosaveTimer)
    inFlight = null
    createPromise = null
    editGen = 0
    articleId.value = null
    slug.value = null
    published.value = false
    publishedAt.value = null
    clearHeaderImageLocal()
    headerImageFile.value = null
    saving.value = false
    saveError.value = null
    dropRecovery(LEGACY_DRAFT_KEY)
  }

  /** Blank slate for a fresh /write (no network). */
  function startNew() {
    resetSession()
    load()
    dirty.value = false
    savedAt.value = null
    statusMessage.value = 'Ready'
    dropRecovery(RECOVERY_PREFIX + 'new')
  }

  /**
   * Resume a brand-new draft that was typed at /write but never confirmed
   * saved to the server (a hard reload, a lost keepalive POST). Returns false
   * when there's nothing worth restoring — the caller should `startNew()`.
   */
  function resumeNewDraft(): boolean {
    const recovered = readRecovery(RECOVERY_PREFIX + 'new')
    if (
      !recovered ||
      recovered.articleId !== null ||
      ((recovered.title ?? '').trim() === '' &&
        !(recovered.doc && docText(recovered.doc).trim() !== ''))
    ) {
      dropRecovery(RECOVERY_PREFIX + 'new')
      return false
    }

    resetSession()
    load({
      title: recovered.title,
      excerpt: recovered.excerpt ?? '',
      doc: recovered.doc,
      topics: recovered.topics ?? [],
    })
    headerImagePosition.value = recovered.headerImagePosition ?? { x: 50, y: 50 }
    dirty.value = true
    savedAt.value = null
    statusMessage.value = 'Restored unsaved changes'
    scheduleAutosave()
    return true
  }

  // --- header image --------------------------------------------------------

  function clearHeaderImageLocal() {
    if (headerImageUrl.value?.startsWith('blob:')) URL.revokeObjectURL(headerImageUrl.value)
    headerImageUrl.value = null
    headerImagePosition.value = { x: 50, y: 50 }
  }

  function setHeaderImage(file: File) {
    if (headerImageUrl.value?.startsWith('blob:')) URL.revokeObjectURL(headerImageUrl.value)
    headerImageUrl.value = URL.createObjectURL(file)
    headerImageFile.value = file
    headerImagePosition.value = { x: 50, y: 50 }
    markDirty()
    void uploadHeaderImage()
  }

  async function uploadHeaderImage() {
    const file = headerImageFile.value
    if (!file) return
    try {
      statusMessage.value = 'Uploading header image…'
      const id = await ensureArticle()
      const form = new FormData()
      form.append('image', file)
      const updated = await api<Article>(`/articles/${id}/header-image`, { method: 'POST', body: form })
      if (headerImageUrl.value?.startsWith('blob:')) URL.revokeObjectURL(headerImageUrl.value)
      headerImageUrl.value = updated.header_image_url
      headerImageFile.value = null
      statusMessage.value = 'Header image added'
      // Persist the reset focal point.
      scheduleAutosave()
    } catch {
      saveError.value = 'Header image upload failed'
      statusMessage.value = 'Header image upload failed'
    }
  }

  async function clearHeaderImage() {
    clearHeaderImageLocal()
    headerImageFile.value = null
    statusMessage.value = 'Header image removed'
    if (articleId.value !== null) {
      try {
        await api(`/articles/${articleId.value}/header-image`, { method: 'DELETE' })
      } catch {
        saveError.value = 'Couldn’t remove the header image'
      }
    }
  }

  function moveHeaderImage(x: number, y: number) {
    const clamp = (n: number) => Math.min(100, Math.max(0, n))
    headerImagePosition.value = { x: clamp(x), y: clamp(y) }
    markDirty()
    scheduleAutosave()
  }

  // --- inline body image --------------------------------------------------

  async function uploadBodyImage(file: File): Promise<string> {
    const id = await ensureArticle()
    const form = new FormData()
    form.append('image', file)
    const { url } = await api<{ url: string }>(`/articles/${id}/images`, { method: 'POST', body: form })
    return url
  }

  // --- publish -----------------------------------------------------------

  function setExcerpt(next: string) {
    excerpt.value = next
    markDirty()
    scheduleAutosave()
  }

  function setTopics(next: DraftTopic[]) {
    topics.value = next
  }

  /**
   * Publish now, or schedule for `publishAt` (ISO string) when given. Sends the
   * current excerpt + topics along with the transition. Surfaces validation
   * errors (missing title / topic) via `saveError` and rethrows.
   */
  async function publish(opts: { publishAt?: string | null } = {}) {
    await flush()
    const id = await ensureArticle()
    const body = {
      excerpt: excerpt.value || null,
      ...topicPayload(),
      ...(opts.publishAt ? { publish_at: opts.publishAt } : { published: true }),
    }
    try {
      const updated = await api<Article>(`/articles/${id}`, { method: 'PATCH', body })
      applyServerMeta(updated)
      saveError.value = null
      statusMessage.value = opts.publishAt ? 'Scheduled' : 'Published'
    } catch (error) {
      const data = (error as { data?: { errors?: Record<string, string[]>; message?: string } }).data
      const message =
        data?.errors?.title?.[0] ??
        data?.errors?.topic_ids?.[0] ??
        data?.errors?.publish_at?.[0] ??
        data?.message ??
        'Couldn’t publish'
      saveError.value = message
      statusMessage.value = message
      throw error
    }
  }

  async function unpublish() {
    const id = await ensureArticle()
    const updated = await api<Article>(`/articles/${id}`, {
      method: 'PATCH',
      body: { published: false },
    })
    applyServerMeta(updated)
    statusMessage.value = 'Moved to drafts'
  }

  return {
    doc,
    title,
    excerpt,
    topics,
    selection,
    articleId,
    slug,
    published,
    publishedAt,
    articleState,
    dirty,
    saving,
    savedAt,
    saveError,
    statusMessage,
    headerImageUrl,
    headerImagePosition,
    wordCount,
    setDoc,
    setTitle,
    setExcerpt,
    setTopics,
    setSelection,
    load,
    loadArticle,
    startNew,
    resumeNewDraft,
    resetSession,
    flush,
    setHeaderImage,
    clearHeaderImage,
    moveHeaderImage,
    uploadBodyImage,
    publish,
    unpublish,
  }
})
