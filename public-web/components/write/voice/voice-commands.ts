import { BLOCK_KEYS } from '../line-numbers'

// Grammar + parser for the article voice editor. Pure — no Vue, no editor.
// `parseCommand(transcript, mode)` turns one recognised utterance into an
// intent the voice controller dispatches. Keyword tables are plain constants
// (the app has no i18n), matching the BLOCK_KEYS / formatTools style.

export type VoiceMode = 'idle' | 'dictation'

export type DictationSegment =
  | { type: 'text'; value: string }
  | { type: 'newline' }
  | { type: 'paragraph' }

export type ParsedCommand =
  | { kind: 'enterDictation' }
  | { kind: 'exitDictation' }
  | { kind: 'dictate'; segments: DictationSegment[] }
  | { kind: 'goToBlock'; key: string; n: number; where: 'start' | 'end' }
  | { kind: 'selectBlock'; key: string; n: number }
  | { kind: 'deleteBlock'; key: string; n: number }
  | { kind: 'deleteSelection' }
  | { kind: 'format'; name: 'bold' | 'italic' | 'quote' | 'heading1' | 'heading2' }
  | { kind: 'insert'; name: 'codeBlock' | 'image' }
  | { kind: 'history'; dir: 'undo' | 'redo' }
  | { kind: 'blockNumbers' }
  | { kind: 'save' }
  | { kind: 'help' }
  | { kind: 'stopVoice' }
  | null

// --- keyword tables --------------------------------------------------------

const START_WORDS = new Set([
  'type', 'start typing', 'start dictation', 'dictate', 'dictation', 'typing',
  'insert text',
])
const STOP_WORDS = new Set([
  'stop', 'stop typing', 'stop dictation', 'done', 'end dictation',
  'finish typing',
])
const UNDO_WORDS = new Set([
  'undo', 'undo that', 'scratch that', 'delete last word', 'delete that word',
])
const REDO_WORDS = new Set(['redo', 'redo that'])
const HELP_WORDS = new Set([
  'help', 'show commands', 'show help', 'what can i say', 'commands',
])
const STOP_VOICE_WORDS = new Set([
  'turn off voice', 'stop voice', 'disable voice', 'turn voice off', 'exit voice',
])
const SAVE_WORDS = new Set(['save', 'save draft', 'save now'])
const BLOCK_NUMBER_WORDS = new Set([
  'show block numbers', 'hide block numbers', 'toggle block numbers',
  'block numbers', 'show numbers',
])
const DELETE_SELECTION_WORDS = new Set([
  'delete that', 'delete selection', 'delete this',
])

const FORMAT_WORDS: Record<string, 'bold' | 'italic' | 'quote' | 'heading1' | 'heading2'> = {
  bold: 'bold',
  'make bold': 'bold',
  italic: 'italic',
  italics: 'italic',
  'make italic': 'italic',
  quote: 'quote',
  'block quote': 'quote',
  blockquote: 'quote',
  'big title': 'heading1',
  'small title': 'heading2',
  heading: 'heading1',
  subheading: 'heading2',
}

/** Spoken block name → canonical key from BLOCK_KEYS. */
const BLOCK_SYNONYMS: Record<string, string> = {
  paragraph: 'paragraph', para: 'paragraph',
  heading: 'heading', header: 'heading', headline: 'heading', title: 'heading',
  quote: 'quote', blockquote: 'quote',
  list: 'list',
  code: 'code',
  image: 'image', picture: 'image', photo: 'image',
  card: 'card',
  video: 'video',
  divider: 'divider', rule: 'divider',
}

const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8,
  nine: 9, ten: 10, eleven: 11, twelve: 12,
}

// --- helpers -------------------------------------------------------------

function normalize(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[.,!?;:]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseCount(token: string | undefined): number | null {
  if (!token) return null
  if (/^\d+$/.test(token)) return Number.parseInt(token, 10)
  return NUMBER_WORDS[token] ?? null
}

function resolveBlockKey(raw: string): string | null {
  const s = raw.trim()
  const singular = s.replace(/s$/, '')
  if (BLOCK_SYNONYMS[s]) return BLOCK_SYNONYMS[s]
  if (BLOCK_SYNONYMS[singular]) return BLOCK_SYNONYMS[singular]
  if ((BLOCK_KEYS as readonly string[]).includes(singular)) return singular
  return null
}

const PUNCTUATION_RULES: [RegExp, string][] = [
  [/\s*\b(?:period|full stop)\b/gi, '.'],
  [/\s*\bcomma\b/gi, ','],
  [/\s*\bquestion mark\b/gi, '?'],
  [/\s*\b(?:exclamation mark|exclamation point)\b/gi, '!'],
  [/\s*\bcolon\b/gi, ':'],
  [/\s*\bsemicolon\b/gi, ';'],
  [/\s*\bdash\b/gi, ' —'],
  [/\s*\bopen quote\b/gi, ' “'],
  [/\s*\bclose quote\b/gi, '”'],
]

function applyPunctuation(part: string): string {
  let out = part
  for (const [pattern, replacement] of PUNCTUATION_RULES) {
    out = out.replace(pattern, replacement)
  }
  return out.replace(/\s+/g, ' ').trim()
}

/** Break a spoken chunk into text runs and explicit line / paragraph breaks. */
function toDictation(raw: string): DictationSegment[] {
  const parts = raw.split(/\b(new paragraph|new line)\b/i)
  const segments: DictationSegment[] = []
  for (const part of parts) {
    const marker = part.toLowerCase().trim()
    if (marker === 'new paragraph') {
      segments.push({ type: 'paragraph' })
      continue
    }
    if (marker === 'new line') {
      segments.push({ type: 'newline' })
      continue
    }
    const text = applyPunctuation(part)
    if (text) segments.push({ type: 'text', value: text })
  }
  return segments
}

/**
 * Decide the spacing and sentence-start capitalisation for `chunk` given the
 * document text immediately before the caret. Pure so the controller can unit
 * it without an editor.
 */
export function spaceAndCapitalize(preceding: string, chunk: string): string {
  if (!chunk) return ''
  const needsSpace =
    preceding.length > 0 &&
    !/\s$/.test(preceding) &&
    !/^[.,!?;:)\]”’%]/.test(chunk)
  let result = (needsSpace ? ' ' : '') + chunk
  const startsSentence = preceding.trim() === '' || /[.!?]["”)]?\s*$/.test(preceding)
  if (startsSentence) {
    result = result.replace(/^(\s*)([a-z])/, (_all, ws: string, c: string) => ws + c.toUpperCase())
  }
  return result
}

// --- parser -------------------------------------------------------------

export function parseCommand(raw: string, mode: VoiceMode): ParsedCommand {
  const text = normalize(raw)
  if (!text) return null

  if (mode === 'dictation') {
    if (STOP_WORDS.has(text)) return { kind: 'exitDictation' }
    if (UNDO_WORDS.has(text)) return { kind: 'history', dir: 'undo' }
    return { kind: 'dictate', segments: toDictation(raw) }
  }

  // idle mode — bare keywords
  if (START_WORDS.has(text)) return { kind: 'enterDictation' }
  if (HELP_WORDS.has(text)) return { kind: 'help' }
  if (STOP_VOICE_WORDS.has(text)) return { kind: 'stopVoice' }
  if (SAVE_WORDS.has(text)) return { kind: 'save' }
  if (UNDO_WORDS.has(text)) return { kind: 'history', dir: 'undo' }
  if (REDO_WORDS.has(text)) return { kind: 'history', dir: 'redo' }
  if (BLOCK_NUMBER_WORDS.has(text)) return { kind: 'blockNumbers' }
  if (DELETE_SELECTION_WORDS.has(text)) return { kind: 'deleteSelection' }

  const format = FORMAT_WORDS[text]
  if (format) return { kind: 'format', name: format }

  let match = text.match(/^(?:insert|add|new)\s+(.+)$/)
  if (match) {
    const target = match[1].trim()
    if (/^code(?: block)?$/.test(target)) return { kind: 'insert', name: 'codeBlock' }
    if (/^(?:image|picture|photo)$/.test(target)) return { kind: 'insert', name: 'image' }
    if (/^(?:quote|block ?quote)$/.test(target)) return { kind: 'format', name: 'quote' }
    if (/^(?:big title|title|heading)$/.test(target)) return { kind: 'format', name: 'heading1' }
    if (/^(?:small title|subheading)$/.test(target)) return { kind: 'format', name: 'heading2' }
  }

  match = text.match(
    /^(?:go to|goto|move to|jump to)\s+(?:the\s+)?(?:(start|beginning|end|top|bottom)\s+of\s+)?(.+?)\s+(\d+|\w+)$/,
  )
  if (match) {
    const key = resolveBlockKey(match[2])
    const n = parseCount(match[3])
    if (key && n) {
      const where = match[1] === 'end' || match[1] === 'bottom' ? 'end' : 'start'
      return { kind: 'goToBlock', key, n, where }
    }
  }

  match = text.match(/^select\s+(?:the\s+)?(.+?)\s+(\d+|\w+)$/)
  if (match) {
    const key = resolveBlockKey(match[1])
    const n = parseCount(match[2])
    if (key && n) return { kind: 'selectBlock', key, n }
  }

  match = text.match(/^(?:delete|remove)\s+(?:the\s+)?(.+?)\s+(\d+|\w+)$/)
  if (match) {
    const key = resolveBlockKey(match[1])
    const n = parseCount(match[2])
    if (key && n) return { kind: 'deleteBlock', key, n }
  }

  return null
}

// --- help sheet --------------------------------------------------------

export interface CommandGroup {
  title: string
  items: { say: string; does: string }[]
}

export const COMMAND_REFERENCE: CommandGroup[] = [
  {
    title: 'Dictation',
    items: [
      { say: '“type” / “start typing”', does: 'enter dictation mode' },
      { say: '“stop” / “done”', does: 'leave dictation mode' },
      { say: '(while dictating) anything', does: 'inserted as text at the caret' },
      { say: '“new line” / “new paragraph”', does: 'line break / new paragraph' },
      { say: '“period” “comma” “question mark” …', does: 'that punctuation mark' },
      { say: '“scratch that”', does: 'undo the last change' },
    ],
  },
  {
    title: 'Move around',
    items: [
      { say: '“go to paragraph 3”', does: 'put the caret in that block' },
      { say: '“go to end of heading 2”', does: 'caret at the end of that block' },
      { say: '“select paragraph 2”', does: 'select that block' },
      { say: '“show block numbers”', does: 'toggle the numbered gutter' },
    ],
  },
  {
    title: 'Edit',
    items: [
      { say: '“bold” / “italic” / “quote”', does: 'toggle on the selection' },
      { say: '“big title” / “small title”', does: 'toggle a heading' },
      { say: '“insert code”', does: 'insert a code block' },
      { say: '“insert image”', does: 'place the caret and flag the photo button' },
      { say: '“delete paragraph 4” / “delete that”', does: 'remove a block / the selection' },
      { say: '“undo” / “redo”', does: 'history' },
    ],
  },
  {
    title: 'Document',
    items: [
      { say: '“save”', does: 'save the draft now' },
      { say: '“help” / “show commands”', does: 'open this panel' },
      { say: '“turn off voice”', does: 'disable voice commands' },
    ],
  },
]
