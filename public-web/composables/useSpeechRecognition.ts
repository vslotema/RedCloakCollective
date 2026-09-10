// Thin wrapper around the browser-native Web Speech API (`SpeechRecognition` /
// `webkitSpeechRecognition`). Client-only, single shared instance — the voice
// controller is the only consumer. Built so the recognition backend can later
// be swapped for a cloud STT service behind the same `onResult` interface.
//
// Support: Chrome / Edge / Chrome-Android, and Safari (webkit-prefixed, with
// quirks — see the restart note below). Firefox has no implementation.

// --- minimal typings (not in every TS lib.dom version) ----------------------

interface SpeechRecognitionAlternative {
  readonly transcript: string
  readonly confidence: number
}

interface SpeechRecognitionResult {
  readonly length: number
  readonly isFinal: boolean
  readonly [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionResultList {
  readonly length: number
  readonly [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionEventLike extends Event {
  readonly resultIndex: number
  readonly results: SpeechRecognitionResultList
}

interface SpeechRecognitionErrorEventLike extends Event {
  readonly error: string
  readonly message: string
}

interface SpeechRecognitionLike extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onstart: (() => void) | null
  onend: (() => void) | null
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
}

// --- implementation ---------------------------------------------------------

export interface SpeechResult {
  transcript: string
  isFinal: boolean
}

type ResultHandler = (result: SpeechResult) => void

const listening = ref(false)
const lastError = ref<string | null>(null)

let recognition: SpeechRecognitionLike | null = null
let handler: ResultHandler | null = null
// The caller's intent. Chrome ends a recognition session after a pause in
// speech, so we restart it from `onend` while this is true — but give up on a
// fatal permission error so we don't spin.
let wantOn = false
let restartTimer: ReturnType<typeof setTimeout> | undefined

function getCtor(): SpeechRecognitionCtor | null {
  if (!import.meta.client) return null
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null
}

function ensureRecognition(): SpeechRecognitionLike | null {
  if (recognition) return recognition

  const Ctor = getCtor()
  if (!Ctor) return null

  const rec = new Ctor()
  rec.lang = 'en-US'
  rec.continuous = true
  rec.interimResults = true
  rec.maxAlternatives = 1

  rec.onstart = () => {
    listening.value = true
  }

  rec.onresult = (event) => {
    // Chrome (continuous mode) can hold several entries in `results` at once —
    // e.g. `results[0]` = "the quick" and `results[1]` = " brown fox", both
    // still interim. Emitting them one-by-one made the consumer see a stream of
    // disjoint fragments; concatenate every new segment into a single transcript
    // instead. Newly-final segments go out as one `isFinal` chunk to commit, the
    // rest as one interim string to preview.
    // Only results at/after `resultIndex` are newly finalised — committing the
    // earlier ones again would duplicate text.
    let final = ''
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i]
      if (result?.isFinal && result[0]) final += result[0].transcript
    }
    // The interim hypothesis is rebuilt in full each event from every
    // not-yet-final segment, so the consumer always gets the whole phrase.
    let interim = ''
    for (let i = 0; i < event.results.length; i++) {
      const result = event.results[i]
      if (result && !result.isFinal && result[0]) interim += result[0].transcript
    }
    final = final.trim()
    interim = interim.trim()
    if (final) handler?.({ transcript: final, isFinal: true })
    if (interim) handler?.({ transcript: interim, isFinal: false })
  }

  rec.onerror = (event) => {
    lastError.value = event.error
    // 'no-speech' / 'aborted' / 'network' are transient — `onend` restarts.
    if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
      wantOn = false
    }
  }

  rec.onend = () => {
    listening.value = false
    if (!wantOn) return
    // Safari may refuse a restart outside a user gesture; that just means
    // listening stops until the user toggles again, which is acceptable.
    clearTimeout(restartTimer)
    restartTimer = setTimeout(() => {
      try {
        rec.start()
      } catch {
        // Already running.
      }
    }, 300)
  }

  recognition = rec
  return rec
}

export function useSpeechRecognition() {
  const supported = computed(() => getCtor() !== null)

  /** Register the (single) result handler. Interim + final results both fire. */
  function onResult(callback: ResultHandler) {
    handler = callback
  }

  /** Begin listening. Call from a user gesture (the toggle button click). */
  function start() {
    lastError.value = null
    const rec = ensureRecognition()
    if (!rec) return
    wantOn = true
    try {
      rec.start()
    } catch {
      // start() throws if a session is already running — fine.
    }
  }

  function stop() {
    wantOn = false
    clearTimeout(restartTimer)
    listening.value = false
    try {
      recognition?.stop()
    } catch {
      // Not running.
    }
  }

  return { supported, listening, lastError, onResult, start, stop }
}
