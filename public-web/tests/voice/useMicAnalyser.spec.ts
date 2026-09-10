// @vitest-environment nuxt
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// composables/useMicAnalyser.ts keeps module-scoped singleton state, so each
// test loads a fresh module via vi.resetModules() + dynamic import. Fakes stand
// in for getUserMedia + AudioContext.

class FakeTrack {
  stop = vi.fn()
}

class FakeStream {
  tracks = [new FakeTrack(), new FakeTrack()]
  getTracks() {
    return this.tracks
  }
}

class FakeAnalyser {
  fftSize = 2048
  smoothingTimeConstant = 0
  frequencyBinCount = 64
  getByteFrequencyData = vi.fn()
}

class FakeAudioContext {
  static instances: FakeAudioContext[] = []
  state: AudioContextState = 'running'
  analyser = new FakeAnalyser()
  resume = vi.fn(async () => {})
  close = vi.fn(async () => {
    this.state = 'closed'
  })
  createMediaStreamSource = vi.fn(() => ({ connect: vi.fn(), disconnect: vi.fn() }))
  createAnalyser = vi.fn(() => this.analyser)

  constructor() {
    FakeAudioContext.instances.push(this)
  }
}

const load = () =>
  import('~/composables/useMicAnalyser').then((m) => m.useMicAnalyser())

let getUserMedia: ReturnType<typeof vi.fn>
let stream: FakeStream

beforeEach(() => {
  vi.resetModules()
  FakeAudioContext.instances = []
  stream = new FakeStream()
  getUserMedia = vi.fn(async () => stream as unknown as MediaStream)
  ;(navigator as unknown as Record<string, unknown>).mediaDevices = { getUserMedia }
  ;(window as unknown as Record<string, unknown>).AudioContext = FakeAudioContext
})

afterEach(() => {
  delete (window as unknown as Record<string, unknown>).AudioContext
})

describe('useMicAnalyser', () => {
  it('start() opens a stream and exposes an analyser node', async () => {
    const { analyser, start } = await load()
    expect(analyser.value).toBeNull()

    await start()

    expect(getUserMedia).toHaveBeenCalledWith({ audio: true })
    expect(analyser.value).toBeInstanceOf(FakeAnalyser)
  })

  it('start() is idempotent — a second call does not open a second stream', async () => {
    const { start } = await load()
    await start()
    await start()
    expect(getUserMedia).toHaveBeenCalledTimes(1)
  })

  it('stop() stops every track, closes the context and clears the analyser', async () => {
    const { analyser, start, stop } = await load()
    await start()
    const ctx = FakeAudioContext.instances[0]

    await stop()

    expect(stream.tracks.every((t) => t.stop.mock.calls.length === 1)).toBe(true)
    expect(ctx.close).toHaveBeenCalledTimes(1)
    expect(analyser.value).toBeNull()
  })

  it('leaves the analyser null when getUserMedia is denied, without throwing', async () => {
    getUserMedia.mockRejectedValueOnce(new DOMException('denied', 'NotAllowedError'))
    const { analyser, start } = await load()

    await expect(start()).resolves.not.toThrow()
    expect(analyser.value).toBeNull()
  })
})
