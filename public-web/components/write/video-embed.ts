import { Node, mergeAttributes } from '@tiptap/core'
import { Plugin } from '@tiptap/pm/state'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import VideoEmbedView from './VideoEmbedView.vue'

export type VideoProvider = 'youtube' | 'vimeo'

export interface ParsedVideo {
  provider: VideoProvider
  /** Provider embed URL for the <iframe>. */
  src: string
  /** The original link the writer pasted. */
  url: string
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    videoEmbed: {
      /** Insert an empty video-embed block — the NodeView prompts for the URL. */
      insertVideoEmbed: () => ReturnType
    }
  }
}

const dataAttr = (name: string) => ({
  default: null as string | null,
  parseHTML: (el: HTMLElement) => el.getAttribute(`data-${name}`) || null,
  renderHTML: (attrs: Record<string, unknown>) =>
    attrs[name] ? { [`data-${name}`]: attrs[name] } : {},
})

const YOUTUBE_ID = /^[\w-]{11}$/

/**
 * Recognise a YouTube or Vimeo link and turn it into an embeddable src.
 * Returns `null` for anything else (client-only — no oEmbed/proxy this pass).
 */
export function parseVideoUrl(input: string): ParsedVideo | null {
  const url = input.trim()
  if (!url) return null

  let u: URL
  try {
    u = new URL(url)
  } catch {
    return null
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null

  const host = u.hostname.replace(/^www\./, '').toLowerCase()

  // --- YouTube ---
  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
    let id = u.searchParams.get('v') ?? ''
    if (!id) {
      const m = u.pathname.match(/^\/(?:embed|shorts|v|live)\/([\w-]{11})/)
      if (m) id = m[1]
    }
    return YOUTUBE_ID.test(id)
      ? { provider: 'youtube', src: `https://www.youtube-nocookie.com/embed/${id}`, url }
      : null
  }
  if (host === 'youtu.be') {
    const id = u.pathname.slice(1).split('/')[0] ?? ''
    return YOUTUBE_ID.test(id)
      ? { provider: 'youtube', src: `https://www.youtube-nocookie.com/embed/${id}`, url }
      : null
  }

  // --- Vimeo ---
  if (host === 'vimeo.com') {
    const m = u.pathname.match(/\/(\d+)/)
    return m
      ? { provider: 'vimeo', src: `https://player.vimeo.com/video/${m[1]}`, url }
      : null
  }
  if (host === 'player.vimeo.com') {
    const m = u.pathname.match(/\/video\/(\d+)/)
    return m
      ? { provider: 'vimeo', src: `https://player.vimeo.com/video/${m[1]}`, url }
      : null
  }

  return null
}

export const VideoEmbed = Node.create({
  name: 'videoEmbed',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      src: dataAttr('src'),
      provider: dataAttr('provider'),
      url: dataAttr('url'),
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-video-embed]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-video-embed': '' })]
  },

  addNodeView() {
    return VueNodeViewRenderer(VideoEmbedView)
  },

  addCommands() {
    return {
      insertVideoEmbed:
        () =>
        ({ commands }) =>
          commands.insertContent({ type: this.name }),
    }
  },

  addProseMirrorPlugins() {
    const editor = this.editor
    const type = this.name

    return [
      new Plugin({
        props: {
          handlePaste: (view, event) => {
            const text = event.clipboardData?.getData('text/plain')?.trim()
            if (!text || !/^https?:\/\/\S+$/i.test(text)) return false

            const parsed = parseVideoUrl(text)
            if (!parsed) return false

            // Only take over a paste on its own empty top-level line.
            const { $from, empty } = view.state.selection
            if (
              !empty ||
              $from.parent.type.spec.code ||
              $from.parent.content.size > 0 ||
              $from.depth !== 1
            ) {
              return false
            }

            editor.chain().focus().insertContent({ type, attrs: parsed }).run()
            return true
          },
        },
      }),
    ]
  },
})
