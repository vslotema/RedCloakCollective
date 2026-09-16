import type { Editor } from '@tiptap/core'
import type { SpeechResult } from '~/composables/useSpeechRecognition'
import * as editorActions from '~/components/write/editor-actions'
import { listBlocks } from '~/components/write/line-numbers'
import {
  COMMAND_REFERENCE,
  consumeDictationStart,
  locateTextUnit,
  parseCommand,
  previewDictation,
  spaceAndCapitalize,
} from '~/components/write/voice/voice-commands'
import type {
  DictationSegment,
  ParsedCommand,
  TextUnit,
  UnitRef,
  VoiceMode,
} from '~/components/write/voice/voice-commands'


const STORAGE_KEY = 'voice_commands_enabled'
const IMAGE_PROMPT_MS = 15_000
const HEARD_CLEAR_MS = 5_000
const NEXT_WORD_HOLD_MS = 700
const VOICE_STATUS_CHANNEL = 'redcloak-voice-status'

const enabled = ref(false)
const mode = ref<VoiceMode>('idle')
const heardText = ref('')
const lastAction = ref('')
const permissionDenied = ref(false)
const imagePrompt = ref(false)
const panelOpen = ref(false)

let wired = false
let restoreAttempted = false
let blockNumbersWatched = false
let panelClosesWithVoiceWatched = false
let broadcastWatched = false
let statusChannel: BroadcastChannel | undefined
let voiceShowedBlockNumbers = false
let imagePromptTimer: ReturnType<typeof setTimeout> | undefined
let heardClearTimer: ReturnType<typeof setTimeout> | undefined
let swallowStartWordFinal = false
let swallowStartTimer: ReturnType<typeof setTimeout> | undefined
let pendingNextWord = false
let pendingNextWordTimer: ReturnType<typeof setTimeout> | undefined

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

function clearPendingNextWord() {
  pendingNextWord = false
  clearTimeout(pendingNextWordTimer)
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
    // A code block's content model is plain text only (no hardBreak/paragraph
    // nodes), so the normal prose commands below are schema-invalid there and
    // silently no-op — checked fresh each iteration since an exitCode() can
    // move the caret out of the code block partway through a segment list.
    const inCodeBlock = editor.state.selection.$from.parent.type.name === 'codeBlock'

    if (segment.type === 'newline') {
      if (inCodeBlock) editor.chain().focus().insertContent('\n').run()
      else editor.chain().focus().setHardBreak().run()
      continue
    }
    if (segment.type === 'paragraph') {
      // Mirrors the keyboard convention (Mod-Enter/triple-Enter): leave the
      // code block for a fresh paragraph after it, rather than a blank line
      // within it — that's what "next line" is for.
      if (inCodeBlock) editor.chain().focus().exitCode().run()
      else editor.chain().focus().splitBlock().run()
      continue
    }
    const { from } = editor.state.selection
    const preceding = editor.state.doc.textBetween(Math.max(1, from - 60), from, ' ', ' ')
    // Sentence-start capitalization is a prose convention that would mangle
    // identifiers/keywords, so it's skipped inside a code block.
    const value = spaceAndCapitalize(preceding, segment.value, !inCodeBlock)
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

// --- word / sentence targeting ----------------------------------------

/** Human-readable name for a word/sentence command, for the status line. */
function unitLabel(unit: TextUnit, ref: UnitRef, n: number | null): string {
  if (ref === 'nth') return `${unit} ${n}`
  if (ref === 'last') return `last ${unit}`
  return unit
}

/**
 * Select (or delete) the Nth / current / last word or sentence of the block the
 * caret is in. Text offsets from `locateTextUnit` map 1:1 to document positions
 * because `textBetween` is asked to render every inline leaf as a single char.
 */
function selectTextUnit(
  editor: Editor,
  unit: TextUnit,
  ref: UnitRef,
  n: number | null,
  remove: boolean,
): boolean {
  const { $from } = editor.state.selection
  if (!$from.parent.isTextblock) return false

  const blockStart = $from.start()
  const blockEnd = $from.end()
  const text = editor.state.doc.textBetween(blockStart, blockEnd, '\n', '\n')

  const range = locateTextUnit(text, $from.parentOffset, unit, ref, n)
  if (!range) return false

  const from = blockStart + range.start
  const to = blockStart + range.end
  if (remove) {
    editor.chain().focus().deleteRange({ from, to }).run()
  } else {
    editor.chain().focus().setTextSelection({ from, to }).scrollIntoView().run()
  }
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
      editor!.chain().focus().run()
      announce('Dictating — say “stop” to finish')
      return
    case 'exitDictation':
      mode.value = 'idle'
      clearStartWordSwallow()
      clearPendingNextWord()
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
    case 'selectText': {
      const label = unitLabel(command.unit, command.ref, command.n)
      const ok = selectTextUnit(editor!, command.unit, command.ref, command.n, false)
      announce(ok ? `Selected ${label}` : `No ${label}`)
      return
    }
    case 'deleteText': {
      const label = unitLabel(command.unit, command.ref, command.n)
      const ok = selectTextUnit(editor!, command.unit, command.ref, command.n, true)
      announce(ok ? `Deleted ${label}` : `No ${label}`)
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

  // Chrome's continuous recognizer doesn't guarantee "next line"/"next
  // paragraph" finalize together — it commonly finalizes "next" alone first,
  // with "line"/"paragraph" arriving as a separate final chunk moments
  // later. toDictation() only ever sees one chunk at a time, so a lone "next"
  // would otherwise get typed as literal text before it can ever recombine.
  // Hold it briefly to see whether the next final chunk completes the phrase.
  if (mode.value === 'dictation') {
    const normalized = text.trim().toLowerCase()

    if (pendingNextWord) {
      clearTimeout(pendingNextWordTimer)
      pendingNextWord = false
      const continuesPhrase =
        normalized === 'line' || normalized.startsWith('line ') ||
        normalized === 'paragraph' || normalized.startsWith('paragraph ')
      if (continuesPhrase) {
        text = `next ${text}`
      } else {
        dispatch(parseCommand('next', mode.value), 'next')
        // falls through to also process *this* chunk normally below
      }
    } else if (normalized === 'next') {
      pendingNextWord = true
      currentEditor()?.commands.setDictationPreview?.('next')
      pendingNextWordTimer = setTimeout(() => {
        pendingNextWord = false
        currentEditor()?.commands.setDictationPreview?.('')
        dispatch(parseCommand('next', mode.value), 'next')
      }, NEXT_WORD_HOLD_MS)
      return
    }
  }

  dispatch(parseCommand(text, mode.value), text)

  heardClearTimer = setTimeout(() => {
    heardText.value = ''
  }, HEARD_CLEAR_MS)
}

function ensureStatusBroadcast() {
  if (broadcastWatched || !import.meta.client || typeof BroadcastChannel === 'undefined') return
  broadcastWatched = true
  statusChannel = new BroadcastChannel(VOICE_STATUS_CHANNEL)
  watch(
    [enabled, mode, heardText, lastAction],
    ([e, m, h, l]) => {
      statusChannel?.postMessage({ enabled: e, mode: m, heardText: h, lastAction: l })
    },
    { immediate: true },
  )
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
  clearPendingNextWord()
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

/**
 * Torn down when the write page is left via an in-app navigation (not a
 * reload — see VoiceStatusPill's onBeforeUnmount). Unlike `disable()`, this
 * isn't a user action: it turns the mic off without a "Voice off"
 * announcement to a page that's going away, closes the sidebar, and — the
 * actual point — clears the persisted preference so the *next* visit to
 * /write doesn't silently resume listening on its own.
 */
function leaveEditor() {
  if (enabled.value) {
    clearImagePrompt()
    clearDictationPreview()
    clearStartWordSwallow()
    clearPendingNextWord()
    enabled.value = false
    mode.value = 'idle'
    useSpeechRecognition().stop()
  }
  panelOpen.value = false
  persist(false)
}

export function useArticleVoice() {
  const speech = useSpeechRecognition()

  // Resume immediately on reload if voice was on before — the mic
  // permission was already granted last time (otherwise it would've been
  // auto-disabled by the permission-denied handler below), so there's
  // nothing gating a fresh SpeechRecognition session on a user gesture here.
  if (import.meta.client && !restoreAttempted && !wired) {
    restoreAttempted = true
    let resume = false
    try {
      resume = localStorage.getItem(STORAGE_KEY) === '1'
    } catch {
      resume = false
    }
    if (resume && speech.supported.value) enable()
  }

  if (import.meta.client && !blockNumbersWatched) {
    blockNumbersWatched = true
    watch([enabled, useEditorInstance().editor], syncBlockNumbers, { immediate: true })
  }

  // The commands sidebar only makes sense while voice is on — close it the
  // moment voice turns off. The drawer itself is also only mounted while
  // `enabled` (see VoiceStatusPill's v-if), so there's nothing that can flip
  // panelOpen true while voice is off in the first place — no need to guard
  // against that here too.
  if (import.meta.client && !panelClosesWithVoiceWatched) {
    panelClosesWithVoiceWatched = true
    watch(enabled, (isEnabled) => {
      if (!isEnabled) panelOpen.value = false
    }, { immediate: true })
  }

  ensureStatusBroadcast()

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
    leaveEditor,
    clearImagePrompt,
  }
}

/**
 * Read-only mirror of the live voice status for the popped-out voice-commands
 * window — that window is a separate tab with its own module graph, so it
 * can't see the refs above directly, and it never touches the microphone
 * itself. The static command reference needs no such mirroring.
 */
export function useVoiceStatusListener() {
  const remoteEnabled = ref(false)
  const remoteMode = ref<VoiceMode>('idle')
  const remoteHeardText = ref('')
  const remoteLastAction = ref('')

  if (import.meta.client && typeof BroadcastChannel !== 'undefined') {
    const channel = new BroadcastChannel(VOICE_STATUS_CHANNEL)
    channel.onmessage = (event) => {
      const data = event.data as {
        enabled: boolean
        mode: VoiceMode
        heardText: string
        lastAction: string
      }
      remoteEnabled.value = data.enabled
      remoteMode.value = data.mode
      remoteHeardText.value = data.heardText
      remoteLastAction.value = data.lastAction
    }
    onBeforeUnmount(() => channel.close())
  }

  return {
    enabled: remoteEnabled,
    mode: remoteMode,
    heardText: remoteHeardText,
    lastAction: remoteLastAction,
    commandReference: COMMAND_REFERENCE,
  }
}
