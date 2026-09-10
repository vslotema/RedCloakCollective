import type { Editor } from '@tiptap/core'
import type { SpeechResult } from '~/composables/useSpeechRecognition'
import * as editorActions from '~/components/write/editor-actions'
import { listBlocks } from '~/components/write/line-numbers'
import {
  COMMAND_REFERENCE,
  consumeDictationStart,
  parseCommand,
  previewDictation,
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
let blockNumbersWatched = false
// True while the block-number gutter is on *because* voice turned it on, so
// disabling voice only reverts our own change, not a deliberate user toggle.
let voiceShowedBlockNumbers = false
let imagePromptTimer: ReturnType<typeof setTimeout> | undefined
let heardClearTimer: ReturnType<typeof setTimeout> | undefined
// Set when dictation was entered from an interim "type"/"start typing" — the
// final for that same utterance still carries the word and must not be typed.
let swallowStartWordFinal = false
let swallowStartTimer: ReturnType<typeof setTimeout> | undefined

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

function clearDictationPreview() {
  currentEditor()?.commands.setDictationPreview?.('')
}

function clearStartWordSwallow() {
  swallowStartWordFinal = false
  clearTimeout(swallowStartTimer)
}

// Voice commands target blocks by number ("go to paragraph 3"), so the
// numbered gutter is shown automatically whenever voice is on and hidden again
// when it goes off. Runs on both `enabled` changes and the editor mounting.
function syncBlockNumbers() {
  const editor = currentEditor()
  if (!editor?.commands?.setLineNumbers) return
  const showing = editor.storage?.lineNumbers?.enabled ?? false
  if (enabled.value && !showing) {
    editor.commands.setLineNumbers(true)
    voiceShowedBlockNumbers = true
  } else if (!enabled.value && showing && voiceShowedBlockNumbers) {
    editor.commands.setLineNumbers(false)
    voiceShowedBlockNumbers = false
  }
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
      // Put the caret in the body so dictated text — and its live preview —
      // has a home even if the user never clicked into the editor.
      editor!.chain().focus().run()
      announce('Dictating — say “stop” to finish')
      return
    case 'exitDictation':
      mode.value = 'idle'
      clearStartWordSwallow()
      clearDictationPreview()
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

  let text = transcript

  // Enter dictation the moment "type" / "start typing" is *heard*, not when it
  // finalises — Chrome is slow and flaky at ending a lone short word, so waiting
  // for isFinal leaves you stuck in command mode. The matching final still
  // carries the word, so swallow it (or strip it if speech ran straight on).
  if (mode.value === 'idle' && !isFinal) {
    if (parseCommand(transcript, 'idle')?.kind === 'enterDictation') {
      dispatch({ kind: 'enterDictation' }, transcript)
      if (mode.value === 'dictation') {
        swallowStartWordFinal = true
        clearTimeout(swallowStartTimer)
        swallowStartTimer = setTimeout(clearStartWordSwallow, 5_000)
      }
      return
    }
  }

  // While the swallow flag is up, every result for this utterance still leads
  // with the start word ("type …") — strip it from the previews and the final
  // alike; drop the flag once that final has been seen.
  if (swallowStartWordFinal && mode.value === 'dictation') {
    const rest = consumeDictationStart(text)
    if (rest !== null) text = rest
    if (isFinal) {
      clearStartWordSwallow()
      if (!text) return // the final was nothing but the start word
    }
  }

  // Live dictation preview: show the interim words as ghost text at the caret,
  // cleared the moment the phrase finalises (the real text is inserted below).
  if (mode.value === 'dictation') {
    currentEditor()?.commands.setDictationPreview?.(
      isFinal ? '' : previewDictation(text),
    )
  }

  if (!isFinal) return

  dispatch(parseCommand(text, mode.value), text)

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
  clearDictationPreview()
  clearStartWordSwallow()
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

  if (import.meta.client && !blockNumbersWatched) {
    blockNumbersWatched = true
    watch([enabled, useEditorInstance().editor], syncBlockNumbers, { immediate: true })
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
