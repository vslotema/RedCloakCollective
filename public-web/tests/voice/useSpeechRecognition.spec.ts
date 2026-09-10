// @vitest-environment nuxt
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// The wrapper (composables/useSpeechRecognition.ts) keeps a module-scoped
// singleton `recognition` with no reset, so each test gets a fresh module via
// vi.resetModules() + a dynamic import. A fake stands in for the browser's
// `webkitSpeechRecognition`.

class FakeRecognition {
  static instances: FakeRecognition[] = []

  lang = ''
  continuous = false
  interimResults = false
  maxAlternatives = 1
  onstart: (() => void) | null = null
  onend: (() => void) | null = null
  onresult: ((event: unknown) => void) | null = null
  onerror: ((event: { error: string; message?: string }) => void) | null = null

  start = vi.fn()
  stop = vi.fn()
  abort = vi.fn()

  constructor() {
    FakeRecognition.instances.push(this)
  }
}

/**
 * `event.results` as the wrapper reads it: `results[i][0].transcript` +
 * `results[i].isFinal`. A plain array of alternative-holders is enough.
 */
function resultsEvent(alts: { transcript: string; isFinal: boolean }[]) {
  return {
    resultIndex: 0,
    results: alts.map((a) => ({
      length: 1,
      isFinal: a.isFinal,
      0: { transcript: a.transcript, confidence: 1 },
    })),
  }
}

const load = () =>
  import('~/composables/useSpeechRecognition').then((m) => m.useSpeechRecognition())

const rec = () => FakeRecognition.instances[0]

beforeEach(() => {
  vi.resetModules()
  FakeRecognition.instances = []
  ;(window as unknown as Record<string, unknown>).webkitSpeechRecognition = FakeRecognition
  delete (window as unknown as Record<string, unknown>).SpeechRecognition
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  delete (window as unknown as Record<string, unknown>).webkitSpeechRecognition
  delete (window as unknown as Record<string, unknown>).SpeechRecognition
})

describe('useSpeechRecognition — support detection', () => {
  it('is supported when a constructor exists', async () => {
    const { supported } = await load()
    expect(supported.value).toBe(true)
  })

  it('is unsupported with no constructor (Firefox)', async () => {
    delete (window as unknown as Record<string, unknown>).webkitSpeechRecognition
    const { supported } = await load()
    expect(supported.value).toBe(false)
  })
})

describe('useSpeechRecognition — lifecycle', () => {
  it('start() opens a session and onstart flips `listening`', async () => {
    const { start, listening } = await load()
    start()
    expect(rec().start).toHaveBeenCalledTimes(1)
    expect(listening.value).toBe(false)
    rec().onstart?.()
    expect(listening.value).toBe(true)
  })

  it('forwards every interim and final result to the handler', async () => {
    const { start, onResult } = await load()
    const heard: { transcript: string; isFinal: boolean }[] = []
    onResult((r) => heard.push(r))
    start()

    rec().onresult?.(
      resultsEvent([
        { transcript: 'hel', isFinal: false },
        { transcript: 'hello', isFinal: true },
      ]),
    )

    expect(heard).toEqual([
      { transcript: 'hel', isFinal: false },
      { transcript: 'hello', isFinal: true },
    ])
  })

  it('auto-restarts ~300ms after the browser ends the session', async () => {
    const { start } = await load()
    start()
    expect(rec().start).toHaveBeenCalledTimes(1)

    rec().onend?.()
    vi.advanceTimersByTime(299)
    expect(rec().start).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(1)
    expect(rec().start).toHaveBeenCalledTimes(2)
  })

  it('does not restart after a fatal permission error', async () => {
    const { start, lastError } = await load()
    start()

    rec().onerror?.({ error: 'not-allowed' })
    expect(lastError.value).toBe('not-allowed')

    rec().onend?.()
    vi.advanceTimersByTime(500)
    expect(rec().start).toHaveBeenCalledTimes(1)
  })

  it('stop() ends the session and prevents the restart loop', async () => {
    const { start, stop, listening } = await load()
    start()
    rec().onstart?.()
    expect(listening.value).toBe(true)

    stop()
    expect(rec().stop).toHaveBeenCalledTimes(1)
    expect(listening.value).toBe(false)

    rec().onend?.()
    vi.advanceTimersByTime(500)
    expect(rec().start).toHaveBeenCalledTimes(1)
  })

  it('swallows the "already running" throw from start()', async () => {
    const { start } = await load()
    start()
    rec().start.mockImplementationOnce(() => {
      throw new DOMException('already started')
    })
    expect(() => start()).not.toThrow()
  })
})
