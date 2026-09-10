// @vitest-environment nuxt
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

// The voice controller (composables/useArticleVoice.ts) is a module singleton
// that routes a recognised transcript to an editor action / the editor store.
// Strategy: real speech wrapper driven by a fake `webkitSpeechRecognition`;
// `editor-actions` + `line-numbers.listBlocks` mocked to spies; a fake editor
// records the `chain()` calls; the pinia editor store is real. `vi.resetModules`
// per test resets every singleton.

mockNuxtImport('useApi', () => () => vi.fn())

const blocksStub = vi.hoisted(() => ({ value: [] as unknown[] }))

vi.mock('~/components/write/editor-actions', () => ({
  toggleBold: vi.fn(),
  toggleItalic: vi.fn(),
  toggleQuote: vi.fn(),
  toggleHeading: vi.fn(),
  insertCodeBlock: vi.fn(),
  toggleBlockNumbers: vi.fn(),
  undo: vi.fn(),
  redo: vi.fn(),
  selectionHasBlockquote: vi.fn(() => false),
}))

vi.mock('~/components/write/line-numbers', () => ({
  BLOCK_KEYS: [
    'paragraph', 'heading', 'quote', 'list', 'code', 'image', 'card', 'video', 'divider',
  ],
  listBlocks: vi.fn(() => blocksStub.value),
}))

// --- fake speech recognition ---------------------------------------------

class FakeRecognition {
  static instances: FakeRecognition[] = []
  lang = ''
  continuous = false
  interimResults = false
  maxAlternatives = 1
  onstart: (() => void) | null = null
  onend: (() => void) | null = null
  onresult: ((event: unknown) => void) | null = null
  onerror: ((event: { error: string }) => void) | null = null
  start = vi.fn()
  stop = vi.fn()
  abort = vi.fn()
  constructor() {
    FakeRecognition.instances.push(this)
  }
}

function resultsEvent(transcript: string, isFinal: boolean) {
  return {
    resultIndex: 0,
    results: [{ length: 1, isFinal, 0: { transcript, confidence: 1 } }],
  }
}

// --- fake editor --------------------------------------------------------

interface Recorded { name: string; args: unknown[] }

function makeEditor(
  opts: { runResult?: boolean; parentType?: string; parentSize?: number; preceding?: string } = {},
) {
  const { runResult = true, parentType = 'paragraph', parentSize = 0, preceding = '' } = opts
  const chains: Recorded[][] = []
  let cur: Recorded[] = []
  const proxy: unknown = new Proxy(
    {},
    {
      get: (_t, p: string) => (...args: unknown[]) => {
        if (p === 'run') {
          chains.push(cur)
          cur = []
          return runResult
        }
        cur.push({ name: p, args })
        return proxy
      },
    },
  )
  return {
    chains,
    calls: () => chains.flat(),
    called: (name: string) => chains.flat().some((c) => c.name === name),
    argsOf: (name: string) => chains.flat().find((c) => c.name === name)?.args,
    chain: () => {
      cur = []
      return proxy
    },
    state: {
      selection: {
        from: 1,
        to: 1,
        $from: { parent: { type: { name: parentType }, content: { size: parentSize } } },
      },
      doc: { textBetween: () => preceding },
    },
    schema: { nodes: {} },
  }
}
type FakeEditor = ReturnType<typeof makeEditor>

// --- harness -----------------------------------------------------------

let voice: Awaited<ReturnType<typeof loadVoice>>['voice']
let editorActions: typeof import('~/components/write/editor-actions')
let store: { statusMessage: string; flush: ReturnType<typeof vi.fn> }
let editor: FakeEditor
let say: (transcript: string, isFinal?: boolean) => void

async function loadVoice() {
  const { useArticleVoice } = await import('~/composables/useArticleVoice')
  const { useEditorInstance } = await import('~/composables/useEditorInstance')
  const { useEditorStore } = await import('~/stores/editor')
  return { useArticleVoice, useEditorInstance, useEditorStore }
}

async function setup(editorOpts: Parameters<typeof makeEditor>[0] = {}) {
  const { useArticleVoice, useEditorInstance, useEditorStore } = await loadVoice()
  editorActions = await import('~/components/write/editor-actions')

  store = useEditorStore() as unknown as typeof store
  vi.spyOn(store, 'flush').mockResolvedValue(undefined)

  editor = makeEditor(editorOpts)
  useEditorInstance().setEditor(editor as never)

  voice = useArticleVoice()
  voice.enable() // wires speech.onResult + creates the FakeRecognition instance

  say = (transcript, isFinal = true) =>
    FakeRecognition.instances[0].onresult?.(resultsEvent(transcript, isFinal))
}

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  blocksStub.value = []
  FakeRecognition.instances = []
  ;(window as unknown as Record<string, unknown>).webkitSpeechRecognition = FakeRecognition
  delete (window as unknown as Record<string, unknown>).SpeechRecognition
  vi.useFakeTimers()
  setActivePinia(createPinia())
  localStorage.clear()
})

afterEach(() => {
  vi.useRealTimers()
  delete (window as unknown as Record<string, unknown>).webkitSpeechRecognition
})

// --- tests -----------------------------------------------------------

describe('useArticleVoice — enable / disable', () => {
  it('enable() starts recognition and persists the preference', async () => {
    await setup()
    expect(FakeRecognition.instances[0].start).toHaveBeenCalled()
    expect(voice.enabled.value).toBe(true)
    expect(localStorage.getItem('voice_commands_enabled')).toBe('1')
  })

  it('disable() stops recognition and clears the preference', async () => {
    await setup()
    voice.disable()
    expect(FakeRecognition.instances[0].stop).toHaveBeenCalled()
    expect(voice.enabled.value).toBe(false)
    expect(localStorage.getItem('voice_commands_enabled')).toBeNull()
  })

  it('a fatal permission error disables voice', async () => {
    await setup()
    FakeRecognition.instances[0].onerror?.({ error: 'not-allowed' })
    await nextTick()
    expect(voice.permissionDenied.value).toBe(true)
    expect(voice.enabled.value).toBe(false)
    expect(localStorage.getItem('voice_commands_enabled')).toBeNull()
  })
})

describe('useArticleVoice — dictation', () => {
  it('"type" enters dictation mode', async () => {
    await setup()
    say('type')
    expect(voice.mode.value).toBe('dictation')
    expect(store.statusMessage).toMatch(/Dictating/)
  })

  it('inserts spoken text with sentence casing + punctuation', async () => {
    await setup()
    say('type')
    say('hello world period')
    expect(editor.argsOf('insertContent')?.[0]).toBe('Hello world.')
  })

  it('"new paragraph" / "new line" become block splits', async () => {
    await setup()
    say('type')
    say('one new paragraph two')
    expect(editor.called('splitBlock')).toBe(true)
    say('three new line four')
    expect(editor.called('setHardBreak')).toBe(true)
  })

  it('"stop" leaves dictation mode', async () => {
    await setup()
    say('type')
    say('stop')
    expect(voice.mode.value).toBe('idle')
  })

  it('an interim result is shown but not dispatched', async () => {
    await setup()
    say('bold', false)
    expect(voice.heardText.value).toBe('bold')
    expect(editorActions.toggleBold).not.toHaveBeenCalled()
  })
})

describe('useArticleVoice — formatting & history', () => {
  it.each([
    ['bold', 'toggleBold'],
    ['italic', 'toggleItalic'],
    ['quote', 'toggleQuote'],
    ['undo', 'undo'],
    ['redo', 'redo'],
    ['show block numbers', 'toggleBlockNumbers'],
    ['insert code', 'insertCodeBlock'],
  ] as const)('"%s" runs editorActions.%s(editor)', async (phrase, action) => {
    await setup()
    say(phrase)
    expect(editorActions[action]).toHaveBeenCalledWith(editor)
  })

  it('"big title" toggles heading level 1', async () => {
    await setup()
    say('big title')
    expect(editorActions.toggleHeading).toHaveBeenCalledWith(editor, 1)
  })
})

describe('useArticleVoice — block targeting', () => {
  it('"go to paragraph two" chains goToBlock and announces success', async () => {
    await setup({ runResult: true })
    say('go to paragraph two')
    expect(editor.argsOf('goToBlock')).toEqual(['paragraph', 2, 'start'])
    expect(store.statusMessage).toBe('Moved to paragraph 2')
  })

  it('announces failure when the block is missing', async () => {
    await setup({ runResult: false })
    say('go to paragraph nine')
    expect(store.statusMessage).toBe('No paragraph 9')
  })

  it('"select paragraph 1" selects the block from listBlocks', async () => {
    blocksStub.value = [
      { key: 'paragraph', index: 1, pos: 0, nodeSize: 4, node: { isAtom: false, isText: false } },
    ]
    await setup()
    say('select paragraph 1')
    expect(editor.called('setTextSelection')).toBe(true)
    expect(store.statusMessage).toBe('Selected paragraph 1')
  })

  it('announces failure when the target block is not found', async () => {
    await setup()
    say('delete paragraph 5')
    expect(store.statusMessage).toBe('No paragraph 5')
  })
})

describe('useArticleVoice — document & meta commands', () => {
  it('"save" flushes the draft', async () => {
    await setup()
    say('save')
    expect(store.flush).toHaveBeenCalled()
    expect(store.statusMessage).toBe('Saving…')
  })

  it('"help" opens the command panel', async () => {
    await setup()
    say('help')
    expect(voice.panelOpen.value).toBe(true)
  })

  it('"turn off voice" disables the feature', async () => {
    await setup()
    say('turn off voice')
    expect(voice.enabled.value).toBe(false)
    expect(FakeRecognition.instances[0].stop).toHaveBeenCalled()
  })

  it('an unrecognised phrase is reported, not executed', async () => {
    await setup()
    say('make me a sandwich')
    expect(store.statusMessage).toMatch(/Didn.t catch/)
    expect(editorActions.toggleBold).not.toHaveBeenCalled()
  })
})

describe('useArticleVoice — editor not ready', () => {
  it('an editor command with no live editor is a no-op with feedback', async () => {
    const { useEditorInstance } = await loadVoice()
    await setup()
    useEditorInstance().setEditor(null)
    say('bold')
    expect(store.statusMessage).toBe('Editor not ready')
    expect(editorActions.toggleBold).not.toHaveBeenCalled()
  })
})

describe('useArticleVoice — insert image', () => {
  it('flags the photo button and clears the flag after the timeout', async () => {
    await setup({ parentSize: 3 })
    say('insert image')
    expect(voice.imagePrompt.value).toBe(true)
    expect(editor.called('createParagraphNear')).toBe(true)

    vi.advanceTimersByTime(15_000)
    expect(voice.imagePrompt.value).toBe(false)
  })
})
