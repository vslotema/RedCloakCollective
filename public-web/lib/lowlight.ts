import { createLowlight, common } from 'lowlight'
import dart from 'highlight.js/lib/languages/dart'

// Shared syntax-highlighting instance. Used by the editor's code block
// (components/write/code-block.ts) AND the published-article renderer
// (lib/article-render.ts), so the reader route doesn't pull in the editor to
// get highlighting. `common` covers the bulk of the language picker; register
// anything extra here so both sides stay in sync.
export const lowlight = createLowlight(common)
lowlight.register({ dart })
