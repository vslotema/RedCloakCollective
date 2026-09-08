import { createLowlight, common } from 'lowlight'
import dart from 'highlight.js/lib/languages/dart'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import CodeBlockView from './CodeBlockView.vue'

// `common` covers most of what the picker offers (csharp, css, diff, go,
// graphql, ini/toml, typescript, …) — register anything extra here.
export const lowlight = createLowlight(common)
lowlight.register({ dart })

/** Ids whose default (id-derived) label would read oddly. */
const DISPLAY_NAMES: Record<string, string> = {
  cpp: 'C++',
  csharp: 'C#',
  css: 'CSS',
  graphql: 'GraphQL',
  ini: 'TOML / INI',
  javascript: 'JavaScript',
  json: 'JSON',
  objectivec: 'Objective-C',
  php: 'PHP',
  'php-template': 'PHP Template',
  // The bare "Plain text" entry (id: null, below) is the one users pick for
  // unhighlighted code — give the registered `plaintext` grammar a distinct
  // label so the two don't look like duplicates in the list.
  plaintext: 'Text',
  'python-repl': 'Python (REPL)',
  scss: 'SCSS',
  sql: 'SQL',
  typescript: 'TypeScript',
  vbnet: 'VB.NET',
  wasm: 'WebAssembly',
  xml: 'HTML / XML',
  yaml: 'YAML',
}

function fallbackLabel(id: string): string {
  return id.charAt(0).toUpperCase() + id.slice(1)
}

export interface LanguageOption {
  id: string | null
  label: string
}

export const LANGUAGES: LanguageOption[] = [
  { id: null, label: 'Plain text' },
  ...lowlight
    .listLanguages()
    .map((id) => ({ id, label: DISPLAY_NAMES[id] ?? fallbackLabel(id) }))
    .sort((a, b) => a.label.localeCompare(b.label)),
]

export function languageLabel(id: string | null): string {
  return (
    LANGUAGES.find((lang) => lang.id === id)?.label ??
    (id ? fallbackLabel(id) : 'Plain text')
  )
}

export const CodeBlock = CodeBlockLowlight.extend({
  addNodeView() {
    return VueNodeViewRenderer(CodeBlockView)
  },
}).configure({ lowlight, defaultLanguage: null })
