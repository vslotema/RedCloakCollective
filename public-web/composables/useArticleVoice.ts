import type { Editor } from '@tiptap/core'
import type { SpeechResult } from '~/composables/useSpeechRecognition'
import * as editorActions from '~/components/write/editor-actions'
import { listBlocks } from '~/components/write/line-numbers'
import {
  COMMAND_REFERENCE,
  parseCommand,
  spaceAndCapitalize,
} from '~/components/write/voice/voice-commands'
import type {
  DictationSegment,
  ParsedCommand,
  VoiceMode,
} from '~/components/write/voice/voice-commands'

// The article voice controller: owns the feature state and routes each
// recognised utterance to an editor action or the editor store. Singleton —
// module-scoped refs, wired to the speech wrapper once.

const STORAGE_KEY = 'voice_commands_enabled'
const IMAGE_PROMPT_MS = 15_000
const HEARD_CLEAR_MS = 5_000

const enabled = ref(false)
const mode = ref<VoiceMode>('idle')
const heardText = ref('')
const lastAction = ref('')
const permissionDenied = ref(false)
// Set true by the "insert image" command — the InsertMenu photo button reads
// this to pulse, since a voice event can't open the file picker itself.
const imagePrompt = ref(false)
const panelOpen = ref(false)

let wired = false
let restoreAttempted = false
let imagePromptTimer: ReturnType<typeof setTimeout> | undefined
let heardClearTimer: ReturnType<typeof setTimeout> | undefined

function persist(value: boolean) {
  if (!import.meta.client) return
  try {
    if (value) localStorage.setItem(STORAGE_KEY, '1')
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // private mode / quota — the preference is best-effort
  }
}

function announce(message: string) {
  lastAction.value = message
  useEditorStore().statusMessage = message
}

function currentEditor(): Editor | null {
  return useEditorInstance().editor.value
}

function clearImagePrompt() {
  imagePrompt.value = false
  clearTimeout(imagePromptTimer)
}

// --- dictation -----------------------------------------------------------

function insertSegments(editor: Editor, segments: DictationSegment[]) {
  for (const segment of segments) {
    if (segment.type === 'newline') {
      editor.chain().focus().setHardBreak().run()
      continue
    }
    if (segment.type === 'paragraph') {
      editor.chain().focus().splitBlock().run()
      continue
    }
    const { from } = editor.state.selection
    const preceding = editor.state.doc.textBetween(Math.max(1, from - 60), from, ' ', ' ')
    const value = spaceAndCapitalize(preceding, segment.value)
    editor.chain().focus().insertContent(value).run()
  }
}

// --- block targeting ----------------------------------------------------

function findBlock(editor: Editor, key: string, n: number) {
  return listBlocks(editor).find((block) => block.key === key && block.index === n) ?? null
}

function selectBlock(editor: Editor, key: string, n: number): boolean {
  const entry = findBlock(editor, key, n)
  if (!entry) return false
  if (entry.node.isAtom && !entry.node.isText) {
    editor.chain().focus().setNodeSelection(entry.pos).run()
  } else {
    editor
      .chain()
      .focus()
      .setTextSelection({ from: entry.pos + 1, to: entry.pos + entry.nodeSize - 1 })
      .run()
  }
  return true
}

function deleteBlock(editor: Editor, key: string, n: number): boolean {
  const entry = findBlock(editor, key, n)
  if (!entry) return false
  editor
    .chain()
    .focus()
    .deleteRange({ from: entry.pos, to: entry.pos + entry.nodeSize })
    .run()
  return true
}

// --- dispatch ----------------------------------------------------------

function dispatch(command: ParsedCommand, raw: string) {
  if (!command) {
    const said = raw.trim()
    if (said) announce(`Didn't catch “${said}”`)
    return
  }

  const editor = currentEditor()
  const needsEditor = command.kind !== 'help' && command.kind !== 'stopVoice'
  if (needsEditor && !editor) {
    announce('Editor not ready')
    return
  }

  switch (command.kind) {
    case 'enterDictation':
      mode.value = 'dictation'
      announce('Dictating — say “stop” to finish')
      return
    case 'exitDictation':
      mode.value = 'idle'
      announce('Stopped dictating')
      return
    case 'dictate':
      insertSegments(editor!, command.segments)
      return
    case 'goToBlock': {
      const ok = editor!.chain().focus().goToBlock(command.key, command.n, command.where).run()
      announce(ok ? `Moved to ${command.key} ${command.n}` : `No ${command.key} ${command.n}`)
      return
    }
    case 'selectBlock': {
      const ok = selectBlock(editor!, command.key, command.n)
      announce(ok ? `Selected ${command.key} ${command.n}` : `No ${command.key} ${command.n}`)
      return
    }
    case 'deleteBlock': {
      const ok = deleteBlock(editor!, command.key, command.n)
      announce(ok ? `Deleted ${command.key} ${command.n}` : `No ${command.key} ${command.n}`)
      return
    }
    case 'deleteSelection':
      editor!.chain().focus().deleteSelection().run()
      announce('Deleted selection')
      return
    case 'format': {
      const map: Record<typeof command.name, () => void> = {
        bold: () => editorActions.toggleBold(editor!),
        italic: () => editorActions.toggleItalic(editor!),
        quote: () => editorActions.toggleQuote(editor!),
        heading1: () => editorActions.toggleHeading(editor!, 1),
        heading2: () => editorActions.toggleHeading(editor!, 2),
      }
      map[command.name]()
      announce(`Voice: ${command.name}`)
      return
    }
    case 'insert':
      if (command.name === 'codeBlock') {
        editorActions.insertCodeBlock(editor!)
        announce('Code block added')
        return
      }
      // image — a voice event can't open the OS file picker, so make sure the
      // caret sits on an empty paragraph (that's where the "+" insert menu
      // appears) and flag its photo button to pulse for a tap.
      {
        const { $from } = editor!.state.selection
        const onEmptyParagraph =
          $from.parent.type.name === 'paragraph' && $from.parent.content.size === 0
        if (onEmptyParagraph) editor!.chain().focus().run()
        else editor!.chain().focus().createParagraphNear().run()
      }
      imagePrompt.value = true
      clearTimeout(imagePromptTimer)
      imagePromptTimer = setTimeout(clearImagePrompt, IMAGE_PROMPT_MS)
      announce('Tap the glowing photo button to choose an image')
      return
    case 'history':
      if (command.dir === 'undo') editorActions.undo(editor!)
      else editorActions.redo(editor!)
      announce(command.dir === 'undo' ? 'Undo' : 'Redo')
      return
    case 'blockNumbers':
      editorActions.toggleBlockNumbers(editor!)
      announce('Toggled block numbers')
      return
    case 'save':
      announce('Saving…')
      void useEditorStore().flush()
      return
    case 'help':
      panelOpen.value = true
      announce('Command list open')
      return
    case 'stopVoice':
      disable()
      return
  }
}

// --- speech wiring ----------------------------------------------------

function handleResult({ transcript, isFinal }: SpeechResult) {
  heardText.value = transcript.trim()
  clearTimeout(heardClearTimer)
  if (!isFinal) return

  dispatch(parseCommand(transcript, mode.value), transcript)

  heardClearTimer = setTimeout(() => {
    heardText.value = ''
  }, HEARD_CLEAR_MS)
}

function wire() {
  if (wired) return
  wired = true
  const speech = useSpeechRecognition()
  speech.onResult(handleResult)
  watch(speech.lastError, (error) => {
    if (error === 'not-allowed' || error === 'service-not-allowed') {
      permissionDenied.value = true
      enabled.value = false
      mode.value = 'idle'
      persist(false)
      announce('Microphone access is blocked')
    }
  })
}

// --- public API ------------------------------------------------------

function enable() {
  const speech = useSpeechRecognition()
  if (!speech.supported.value) return
  wire()
  permissionDenied.value = false
  enabled.value = true
  persist(true)
  speech.start()
  announce('Voice on')
}

function disable() {
  clearImagePrompt()
  enabled.value = false
  mode.value = 'idle'
  persist(false)
  useSpeechRecognition().stop()
  announce('Voice off')
}

function toggle() {
  if (enabled.value) disable()
  else enable()
}

export function useArticleVoice() {
  const speech = useSpeechRecognition()

  if (import.meta.client && !restoreAttempted && !wired) {
    restoreAttempted = true
    // Restore the preference, but wait for a user gesture before starting the
    // mic (browsers require one, and a mic that turns itself on at page load
    // is hostile). Users who never enabled it are unaffected.
    let resume = false
    try {
      resume = localStorage.getItem(STORAGE_KEY) === '1'
    } catch {
      resume = false
    }
    if (resume && speech.supported.value) {
      enabled.value = true
      const kick = () => {
        window.removeEventListener('pointerdown', kick)
        window.removeEventListener('keydown', kick)
        if (enabled.value) enable()
      }
      window.addEventListener('pointerdown', kick, { once: true })
      window.addEventListener('keydown', kick, { once: true })
    }
  }

  if (import.meta.dev && import.meta.client) {
    ;(window as unknown as Record<string, unknown>).__voice = {
      say: (phrase: string) => handleResult({ transcript: phrase, isFinal: true }),
      interim: (phrase: string) => handleResult({ transcript: phrase, isFinal: false }),
      state: () => ({ enabled: enabled.value, mode: mode.value, last: lastAction.value }),
    }
  }

  return {
    enabled,
    mode,
    heardText,
    lastAction,
    imagePrompt,
    panelOpen,
    permissionDenied,
    supported: speech.supported,
    listening: speech.listening,
    commandReference: COMMAND_REFERENCE,
    toggle,
    enable,
    disable,
    clearImagePrompt,
  }
}
