// A Web Audio tap on the microphone, used only to drive the voice-status
// waveform. The Web Speech API (`useSpeechRecognition`) does not expose its
// audio stream, so this opens its own `getUserMedia` stream — the mic grant
// from turning voice on is remembered for the origin, so this does not prompt
// again in practice. Module-scoped singleton, client-only.

type AudioContextCtor = typeof AudioContext

const analyser = ref<AnalyserNode | null>(null)

let stream: MediaStream | null = null
let context: AudioContext | null = null
let source: MediaStreamAudioSourceNode | null = null
let starting: Promise<void> | null = null

function getContextCtor(): AudioContextCtor | null {
  if (!import.meta.client) return null
  return (
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: AudioContextCtor })
      .webkitAudioContext ??
    null
  )
}

async function start() {
  if (analyser.value || starting) return starting ?? undefined
  const Ctor = getContextCtor()
  if (!Ctor || !navigator.mediaDevices?.getUserMedia) return

  starting = (async () => {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      context = new Ctor()
      // Autoplay policy can leave a fresh context suspended.
      if (context.state === 'suspended') await context.resume()
      source = context.createMediaStreamSource(stream)
      const node = context.createAnalyser()
      node.fftSize = 128
      node.smoothingTimeConstant = 0.8
      source.connect(node)
      analyser.value = node
    } catch {
      // Permission denied / no device — the waveform falls back to its
      // resting state. Not fatal.
      await stop()
    } finally {
      starting = null
    }
  })()

  return starting
}

async function stop() {
  analyser.value = null
  source?.disconnect()
  source = null
  stream?.getTracks().forEach((track) => track.stop())
  stream = null
  if (context && context.state !== 'closed') {
    try {
      await context.close()
    } catch {
      // already closing
    }
  }
  context = null
}

export function useMicAnalyser() {
  return { analyser, start, stop }
}
