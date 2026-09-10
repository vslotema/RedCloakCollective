// @vitest-environment nuxt
import { describe, expect, it } from 'vitest'
import {
  parseCommand,
  spaceAndCapitalize,
} from '~/components/write/voice/voice-commands'
import type { ParsedCommand } from '~/components/write/voice/voice-commands'

// The grammar is pure — no Vue, no editor. These lock down every command shape
// the voice controller (composables/useArticleVoice.ts) dispatches on.

const idle = (raw: string) => parseCommand(raw, 'idle')
const dictating = (raw: string) => parseCommand(raw, 'dictation')

describe('parseCommand — idle keywords', () => {
  const cases: [string, ParsedCommand][] = [
    ['type', { kind: 'enterDictation' }],
    ['start typing', { kind: 'enterDictation' }],
    ['dictation', { kind: 'enterDictation' }],
    ['help', { kind: 'help' }],
    ['show commands', { kind: 'help' }],
    ['what can i say', { kind: 'help' }],
    ['turn off voice', { kind: 'stopVoice' }],
    ['stop voice', { kind: 'stopVoice' }],
    ['save', { kind: 'save' }],
    ['save draft', { kind: 'save' }],
    ['undo', { kind: 'history', dir: 'undo' }],
    ['scratch that', { kind: 'history', dir: 'undo' }],
    ['delete last word', { kind: 'history', dir: 'undo' }],
    ['redo', { kind: 'history', dir: 'redo' }],
    ['redo that', { kind: 'history', dir: 'redo' }],
    ['show block numbers', { kind: 'blockNumbers' }],
    ['toggle block numbers', { kind: 'blockNumbers' }],
    ['delete that', { kind: 'deleteSelection' }],
    ['delete selection', { kind: 'deleteSelection' }],
  ]

  it.each(cases)('%j → %j', (raw, expected) => {
    expect(idle(raw)).toEqual(expected)
  })

  it('is case-insensitive and trims surrounding whitespace', () => {
    expect(idle('  HELP  ')).toEqual({ kind: 'help' })
    expect(idle('Save')).toEqual({ kind: 'save' })
  })

  it('strips a trailing punctuation mark (when it is the last character)', () => {
    // `normalize()` strips `[.,!?;:]+$` before it trims — so a mark followed by
    // a space is left in place. Speech transcripts don't have trailing spaces.
    expect(idle('bold.')).toEqual({ kind: 'format', name: 'bold' })
    expect(idle('help?')).toEqual({ kind: 'help' })
  })
})

describe('parseCommand — formatting', () => {
  const cases: [string, ParsedCommand][] = [
    ['bold', { kind: 'format', name: 'bold' }],
    ['make bold', { kind: 'format', name: 'bold' }],
    ['italic', { kind: 'format', name: 'italic' }],
    ['italics', { kind: 'format', name: 'italic' }],
    ['make italic', { kind: 'format', name: 'italic' }],
    ['quote', { kind: 'format', name: 'quote' }],
    ['block quote', { kind: 'format', name: 'quote' }],
    ['blockquote', { kind: 'format', name: 'quote' }],
    ['big title', { kind: 'format', name: 'heading1' }],
    ['heading', { kind: 'format', name: 'heading1' }],
    ['small title', { kind: 'format', name: 'heading2' }],
    ['subheading', { kind: 'format', name: 'heading2' }],
  ]

  it.each(cases)('%j → %j', (raw, expected) => {
    expect(idle(raw)).toEqual(expected)
  })
})

describe('parseCommand — insert / add / new', () => {
  const cases: [string, ParsedCommand][] = [
    ['insert code', { kind: 'insert', name: 'codeBlock' }],
    ['add code block', { kind: 'insert', name: 'codeBlock' }],
    ['new code', { kind: 'insert', name: 'codeBlock' }],
    ['insert image', { kind: 'insert', name: 'image' }],
    ['insert photo', { kind: 'insert', name: 'image' }],
    ['add picture', { kind: 'insert', name: 'image' }],
    ['insert quote', { kind: 'format', name: 'quote' }],
    ['new block quote', { kind: 'format', name: 'quote' }],
    ['insert big title', { kind: 'format', name: 'heading1' }],
    ['add heading', { kind: 'format', name: 'heading1' }],
    ['insert subheading', { kind: 'format', name: 'heading2' }],
  ]

  it.each(cases)('%j → %j', (raw, expected) => {
    expect(idle(raw)).toEqual(expected)
  })

  it('rejects an unknown insert target', () => {
    expect(idle('insert banana')).toBeNull()
  })
})

describe('parseCommand — block navigation', () => {
  it('go to <block> <n>', () => {
    expect(idle('go to paragraph 3')).toEqual({
      kind: 'goToBlock',
      key: 'paragraph',
      n: 3,
      where: 'start',
    })
  })

  it('honours "end of" / "bottom of"', () => {
    expect(idle('go to end of heading two')).toEqual({
      kind: 'goToBlock',
      key: 'heading',
      n: 2,
      where: 'end',
    })
    expect(idle('jump to bottom of code 1')).toEqual({
      kind: 'goToBlock',
      key: 'code',
      n: 1,
      where: 'end',
    })
  })

  it('resolves spoken block synonyms and plurals', () => {
    expect(idle('go to photo 1')).toMatchObject({ key: 'image' })
    expect(idle('go to para 2')).toMatchObject({ key: 'paragraph' })
    expect(idle('go to header 1')).toMatchObject({ key: 'heading' })
    expect(idle('go to paragraphs 4')).toMatchObject({ key: 'paragraph', n: 4 })
  })

  it('accepts number words and digits', () => {
    expect(idle('go to paragraph seven')).toMatchObject({ n: 7 })
    expect(idle('go to paragraph 12')).toMatchObject({ n: 12 })
  })

  it('select / delete a block', () => {
    expect(idle('select paragraph 2')).toEqual({
      kind: 'selectBlock',
      key: 'paragraph',
      n: 2,
    })
    expect(idle('delete the video 1')).toEqual({
      kind: 'deleteBlock',
      key: 'video',
      n: 1,
    })
    expect(idle('remove card 3')).toEqual({
      kind: 'deleteBlock',
      key: 'card',
      n: 3,
    })
  })

  it('returns null for an unknown block or a missing number', () => {
    expect(idle('go to banana 2')).toBeNull()
    expect(idle('go to paragraph nope')).toBeNull()
  })
})

describe('parseCommand — misc', () => {
  it('empty / whitespace / gibberish → null', () => {
    expect(idle('')).toBeNull()
    expect(idle('   ')).toBeNull()
    expect(idle('flibbertigibbet')).toBeNull()
  })
})

describe('parseCommand — dictation mode', () => {
  it('"stop" / "done" leave dictation', () => {
    expect(dictating('stop')).toEqual({ kind: 'exitDictation' })
    expect(dictating('done')).toEqual({ kind: 'exitDictation' })
  })

  it('"undo" / "scratch that" still work while dictating', () => {
    expect(dictating('undo')).toEqual({ kind: 'history', dir: 'undo' })
    expect(dictating('scratch that')).toEqual({ kind: 'history', dir: 'undo' })
  })

  it('plain speech becomes a text segment', () => {
    expect(dictating('the quick brown fox')).toEqual({
      kind: 'dictate',
      segments: [{ type: 'text', value: 'the quick brown fox' }],
    })
  })

  it('spoken punctuation becomes the mark', () => {
    expect(dictating('hello period')).toEqual({
      kind: 'dictate',
      segments: [{ type: 'text', value: 'hello.' }],
    })
    expect(dictating('wait comma then go')).toEqual({
      kind: 'dictate',
      segments: [{ type: 'text', value: 'wait, then go' }],
    })
    expect(dictating('really question mark')).toEqual({
      kind: 'dictate',
      segments: [{ type: 'text', value: 'really?' }],
    })
  })

  it('"new line" / "new paragraph" split into break segments', () => {
    expect(dictating('one new line two')).toEqual({
      kind: 'dictate',
      segments: [
        { type: 'text', value: 'one' },
        { type: 'newline' },
        { type: 'text', value: 'two' },
      ],
    })
    expect(dictating('a new paragraph b')).toEqual({
      kind: 'dictate',
      segments: [
        { type: 'text', value: 'a' },
        { type: 'paragraph' },
        { type: 'text', value: 'b' },
      ],
    })
  })

  it('a bare command like "bold" is dictated, not executed', () => {
    expect(dictating('bold')).toEqual({
      kind: 'dictate',
      segments: [{ type: 'text', value: 'bold' }],
    })
  })
})

describe('spaceAndCapitalize', () => {
  it('capitalises the first word of a fresh document', () => {
    expect(spaceAndCapitalize('', 'hello there')).toBe('Hello there')
  })

  it('capitalises after a sentence terminator', () => {
    expect(spaceAndCapitalize('Done.', 'new sentence')).toBe(' New sentence')
    expect(spaceAndCapitalize('Really?', 'yes')).toBe(' Yes')
  })

  it('adds a joining space mid-sentence, no capital', () => {
    expect(spaceAndCapitalize('some', 'more')).toBe(' more')
  })

  it('does not double the space when preceding text already ends in one', () => {
    expect(spaceAndCapitalize('some ', 'more')).toBe('more')
  })

  it('does not put a space before punctuation', () => {
    expect(spaceAndCapitalize('word', ', tail')).toBe(', tail')
  })

  it('empty chunk → empty string', () => {
    expect(spaceAndCapitalize('anything', '')).toBe('')
  })
})
