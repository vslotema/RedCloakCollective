// @vitest-environment nuxt
import { describe, expect, it } from 'vitest'
import {
  consumeDictationStart,
  locateTextUnit,
  parseCommand,
  previewDictation,
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

describe('parseCommand — word / sentence targeting', () => {
  const cases: [string, ParsedCommand][] = [
    ['select word 3', { kind: 'selectText', unit: 'word', ref: 'nth', n: 3 }],
    ['select word number three', { kind: 'selectText', unit: 'word', ref: 'nth', n: 3 }],
    ['select the third word', { kind: 'selectText', unit: 'word', ref: 'nth', n: 3 }],
    ['select sentence two', { kind: 'selectText', unit: 'sentence', ref: 'nth', n: 2 }],
    ['select this word', { kind: 'selectText', unit: 'word', ref: 'caret', n: null }],
    ['select the current sentence', { kind: 'selectText', unit: 'sentence', ref: 'caret', n: null }],
    ['select word', { kind: 'selectText', unit: 'word', ref: 'caret', n: null }],
    ['select last word', { kind: 'selectText', unit: 'word', ref: 'last', n: null }],
    ['select the final sentence', { kind: 'selectText', unit: 'sentence', ref: 'last', n: null }],
    ['delete word 2', { kind: 'deleteText', unit: 'word', ref: 'nth', n: 2 }],
    ['delete this word', { kind: 'deleteText', unit: 'word', ref: 'caret', n: null }],
    ['delete the last sentence', { kind: 'deleteText', unit: 'sentence', ref: 'last', n: null }],
    ['remove sentence 1', { kind: 'deleteText', unit: 'sentence', ref: 'nth', n: 1 }],
  ]

  it.each(cases)('%j → %j', (raw, expected) => {
    expect(idle(raw)).toEqual(expected)
  })

  it('does not shadow block select/delete', () => {
    expect(idle('select paragraph 2')).toMatchObject({ kind: 'selectBlock' })
    expect(idle('delete paragraph 4')).toMatchObject({ kind: 'deleteBlock' })
  })

  it('"delete this" is still the whole-selection command', () => {
    expect(idle('delete this')).toEqual({ kind: 'deleteSelection' })
  })

  it('the "delete last word" undo alias still wins over word targeting', () => {
    expect(idle('delete last word')).toEqual({ kind: 'history', dir: 'undo' })
  })
})

describe('locateTextUnit', () => {
  const text = 'The quick brown fox. It jumps over the lazy dog.'
  //            0123456789...          ^ sentence 1 ends at 19

  it('finds the nth word', () => {
    expect(locateTextUnit(text, 0, 'word', 'nth', 3)).toEqual({ start: 10, end: 15 }) // "brown"
    expect(text.slice(10, 15)).toBe('brown')
  })

  it('keeps an internal apostrophe/hyphen but drops trailing punctuation', () => {
    const t = "It's a well-known fact."
    const w1 = locateTextUnit(t, 0, 'word', 'nth', 1)!
    const w3 = locateTextUnit(t, 0, 'word', 'nth', 3)!
    expect(t.slice(w1.start, w1.end)).toBe("It's")
    expect(t.slice(w3.start, w3.end)).toBe('well-known')
  })

  it('finds the nth sentence, trimming the space and keeping the stop', () => {
    const s1 = locateTextUnit(text, 0, 'sentence', 'nth', 1)!
    expect(text.slice(s1.start, s1.end)).toBe('The quick brown fox.')
    const s2 = locateTextUnit(text, 0, 'sentence', 'nth', 2)!
    expect(text.slice(s2.start, s2.end)).toBe('It jumps over the lazy dog.')
  })

  it('a block with no terminator is one sentence', () => {
    const t = 'just a fragment'
    const s = locateTextUnit(t, 0, 'sentence', 'nth', 1)!
    expect(t.slice(s.start, s.end)).toBe('just a fragment')
  })

  it('"this word" is the word the caret sits in', () => {
    // caret at offset 12 → inside "brown" (10..15)
    expect(locateTextUnit(text, 12, 'word', 'caret', null)).toEqual({ start: 10, end: 15 })
  })

  it('"last word" is the word ending at or before the caret', () => {
    // caret at 15 (end of "brown") → "brown"
    expect(locateTextUnit(text, 15, 'word', 'last', null)).toEqual({ start: 10, end: 15 })
  })

  it('out-of-range n and empty text return null', () => {
    expect(locateTextUnit(text, 0, 'word', 'nth', 99)).toBeNull()
    expect(locateTextUnit('   ', 0, 'word', 'caret', null)).toBeNull()
    expect(locateTextUnit('', 0, 'sentence', 'nth', 1)).toBeNull()
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

describe('consumeDictationStart', () => {
  it('returns "" when the text is nothing but a start phrase', () => {
    expect(consumeDictationStart('type')).toBe('')
    expect(consumeDictationStart('Start typing.')).toBe('')
    expect(consumeDictationStart('dictation')).toBe('')
  })

  it('returns the remainder when speech ran straight on', () => {
    expect(consumeDictationStart('type hello world')).toBe('hello world')
    expect(consumeDictationStart('start typing the quick brown fox')).toBe('the quick brown fox')
  })

  it('returns null when no start phrase leads the text', () => {
    expect(consumeDictationStart('the quick brown fox')).toBeNull()
    expect(consumeDictationStart('typescript is great')).toBeNull()
  })
})

describe('previewDictation', () => {
  it('resolves punctuation words the same way dictation does', () => {
    expect(previewDictation('hello world period')).toBe('hello world.')
    expect(previewDictation('wait comma what question mark')).toBe('wait, what?')
  })

  it('shows block-break markers as a glyph instead of acting on them', () => {
    expect(previewDictation('one new paragraph two')).toBe('one ⏎ two')
    expect(previewDictation('a new line b')).toBe('a ⏎ b')
  })

  it('empty transcript → empty string', () => {
    expect(previewDictation('')).toBe('')
  })
})
