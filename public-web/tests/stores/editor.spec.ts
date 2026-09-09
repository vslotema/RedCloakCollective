// @vitest-environment nuxt
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { JSONContent } from '@tiptap/core'

// The editor store's only external dependency is useApi(); mock it to a spy we
// drive per test. Hoisted so it's in place before useEditorStore() runs
// (`const api = useApi()` executes at store setup).
const { apiFn } = vi.hoisted(() => ({ apiFn: vi.fn() }))
mockNuxtImport('useApi', () => () => apiFn)

function articleResponse(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    title: '',
    slug: 'story-abc123',
    excerpt: null,
    content: { type: 'doc', content: [{ type: 'paragraph' }] },
    header_image_url: null,
    header_image_position: null,
    published: false,
    published_at: null,
    state: 'draft',
    topics: [],
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    author: { id: 1, name: 'Tester', username: 'tester' },
    ...overrides,
  }
}

const doc = (text: string): JSONContent => ({
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
})

type ApiCall = [string, { method?: string, body?: Record<string, unknown> }]

function callsWith(method?: string): ApiCall[] {
  return apiFn.mock.calls.filter(
    ([, opts]) => !method || (opts as { method?: string })?.method === method,
  ) as ApiCall[]
}

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
  apiFn.mockReset()
  apiFn.mockResolvedValue(articleResponse())
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('editor store — draft creation', () => {
  it('creates the row with a single POST after the autosave delay', async () => {
    const store = useEditorStore()
    store.setTitle('My story')
    store.setDoc(doc('Hello'))

    expect(apiFn).not.toHaveBeenCalled() // debounced

    await vi.advanceTimersByTimeAsync(2100)

    const posts = callsWith('POST')
    expect(posts).toHaveLength(1)
    expect(posts[0][0]).toBe('/articles')
    expect(posts[0][1].body).toEqual({
      title: 'My story',
      excerpt: null,
      content: doc('Hello'),
      header_image_position: null,
    })
    expect(store.articleId).toBe(1)
    expect(store.slug).toBe('story-abc123')
    expect(store.dirty).toBe(false)
    expect(store.savedAt).not.toBeNull()
  })

  it('creates the row once even with concurrent flushes, then PATCHes', async () => {
    const store = useEditorStore()
    store.setDoc(doc('a'))
    await Promise.all([store.flush(), store.flush()])

    expect(callsWith('POST')).toHaveLength(1)

    store.setDoc(doc('b'))
    await store.flush()

    const patches = callsWith('PATCH')
    expect(patches).toHaveLength(1)
    expect(patches[0][0]).toBe('/articles/1')
    expect(patches[0][1].body).toMatchObject({ content: doc('b') })
  })

  it('does not create an article when nothing was edited', async () => {
    const store = useEditorStore()
    await store.flush()
    await vi.advanceTimersByTimeAsync(3000)
    expect(apiFn).not.toHaveBeenCalled()
  })

  // KNOWN BUG — currently failing on purpose (it.fails passes while the bug is
  // present and starts failing the moment it's fixed, forcing this back to it()).
  //
  // ensureArticle()'s .then does `const gen = editGen; if (editGen === gen)` —
  // that guard is a synchronous no-op inside the callback, so a successful POST
  // *always* clears `dirty`, even when an edit landed while the POST was in
  // flight. The follow-up autosave then early-returns in persist() (`!dirty`)
  // and that edit never reaches the server (and its `editor_draft:new` recovery
  // key was dropped). Fix: capture `gen = editGen` where createPromise is
  // assigned, before `api(...)` is called — the way doPersist() already does it.
  it.fails('runs a second persist when an edit lands mid-create', async () => {
    let release: (value: unknown) => void = () => {}
    apiFn.mockImplementationOnce(
      () => new Promise((resolve) => { release = resolve }),
    )

    const store = useEditorStore()
    store.setDoc(doc('one'))
    const flushed = store.flush()
    await Promise.resolve()

    store.setDoc(doc('two')) // lands while the POST is in flight
    release(articleResponse())
    await flushed

    await vi.advanceTimersByTimeAsync(2100)
    const bodies = apiFn.mock.calls.map(([, opts]) => (opts as ApiCall[1]).body)
    expect(bodies.some((b) => JSON.stringify(b?.content) === JSON.stringify(doc('two')))).toBe(true)
  })
})

describe('editor store — autosave resilience', () => {
  it('never throws when a save fails, keeps dirty + records the error', async () => {
    apiFn.mockRejectedValue(new Error('network'))
    const store = useEditorStore()
    store.setDoc(doc('x'))

    await expect(vi.advanceTimersByTimeAsync(2100)).resolves.not.toThrow()

    expect(store.dirty).toBe(true)
    expect(store.saveError).toBeTruthy()
  })

  it('writes a localStorage recovery snapshot and drops it once saved', async () => {
    let release: (value: unknown) => void = () => {}
    apiFn.mockImplementationOnce(
      () => new Promise((resolve) => { release = resolve }),
    )

    const store = useEditorStore()
    store.setDoc(doc('recover me'))
    const flushed = store.flush()
    await Promise.resolve()

    expect(localStorage.getItem('editor_draft:new')).not.toBeNull()

    release(articleResponse())
    await flushed

    expect(localStorage.getItem('editor_draft:new')).toBeNull()
  })
})

describe('editor store — publish', () => {
  async function createdStore() {
    const store = useEditorStore()
    store.setDoc(doc('body'))
    await store.flush()
    apiFn.mockClear()
    return store
  }

  it('flushes, then PATCHes with published + topics + excerpt', async () => {
    const store = await createdStore()
    store.setTitle('Ready')
    store.setExcerpt('A subtitle')
    store.setTopics([
      { id: 5, name: 'Existing' },
      { id: null, name: 'Brand new' },
    ])

    await store.publish()

    const patch = callsWith('PATCH').at(-1)
    expect(patch?.[0]).toBe('/articles/1')
    expect(patch?.[1].body).toEqual({
      excerpt: 'A subtitle',
      topic_ids: [5],
      new_topics: ['Brand new'],
      published: true,
    })
  })

  it('sends publish_at (not published) when scheduling', async () => {
    const store = await createdStore()
    store.setTitle('Later')
    store.setTopics([{ id: 1, name: 'T' }])

    await store.publish({ publishAt: '2099-01-01T00:00:00.000Z' })

    const body = callsWith('PATCH').at(-1)?.[1].body
    expect(body).toMatchObject({ publish_at: '2099-01-01T00:00:00.000Z' })
    expect(body).not.toHaveProperty('published')
  })

  it('maps a server validation error onto saveError and rethrows', async () => {
    const store = await createdStore()
    apiFn.mockRejectedValueOnce({
      data: { errors: { title: ['Add a title before publishing.'] } },
    })

    await expect(store.publish()).rejects.toBeDefined()
    expect(store.saveError).toBe('Add a title before publishing.')
  })
})

describe('editor store — recovery buffer', () => {
  it('resumeNewDraft accepts a snapshot with content, rejects an empty one', () => {
    const store = useEditorStore()

    localStorage.setItem('editor_draft:new', JSON.stringify({
      articleId: null,
      title: 'Rescued',
      excerpt: '',
      doc: doc('still here'),
      topics: [],
      headerImagePosition: { x: 50, y: 50 },
      savedAt: Date.now(),
    }))
    expect(store.resumeNewDraft()).toBe(true)
    expect(store.title).toBe('Rescued')
    expect(store.dirty).toBe(true)

    localStorage.setItem('editor_draft:new', JSON.stringify({
      articleId: null,
      title: '',
      excerpt: '',
      doc: { type: 'doc', content: [{ type: 'paragraph' }] },
      topics: [],
      headerImagePosition: { x: 50, y: 50 },
      savedAt: Date.now(),
    }))
    expect(useEditorStore().resumeNewDraft()).toBe(false)
  })

  it('loadArticle lets an unsynced recovery snapshot win over the server copy', async () => {
    apiFn.mockResolvedValue(articleResponse({
      id: 7,
      title: 'Server title',
      content: doc('server body'),
    }))
    localStorage.setItem('editor_draft:7', JSON.stringify({
      articleId: 7,
      title: 'Local unsaved title',
      excerpt: '',
      doc: doc('local body'),
      topics: [],
      headerImagePosition: { x: 50, y: 50 },
      savedAt: Date.now(),
    }))

    const store = useEditorStore()
    await store.loadArticle(7)

    expect(store.title).toBe('Local unsaved title')
    expect(store.dirty).toBe(true)
    expect(store.statusMessage).toBe('Restored unsaved changes')
  })

  it('loadArticle uses the server copy when there is no recovery snapshot', async () => {
    apiFn.mockResolvedValue(articleResponse({
      id: 8,
      title: 'Server title',
      content: doc('server body'),
    }))

    const store = useEditorStore()
    await store.loadArticle(8)

    expect(store.title).toBe('Server title')
    expect(store.dirty).toBe(false)
  })
})
