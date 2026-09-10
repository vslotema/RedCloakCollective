import { h, type VNode } from 'vue'
import type { JSONContent } from '@tiptap/core'
import { lowlight } from './lowlight'

/**
 * Renders stored TipTap / ProseMirror JSON to a Vue vnode tree for the public
 * article page. Pure — no `@tiptap/vue-3`, no ProseMirror, no `window`/
 * `document` — so it runs identically in Nitro SSR and the browser. The node /
 * mark set mirrors the editor's extension list in
 * components/write/RichTextEditor.vue; keep the two in step.
 */

type Child = VNode | string
type Attrs = Record<string, unknown>

interface Mark {
  type: string
  attrs?: Attrs
}

// --- URL safety ------------------------------------------------------------

interface SafeUrlOpts {
  schemes?: string[]
  /** Also accept root-relative (`/…`) and fragment (`#…`) values. */
  relative?: boolean
}

export function safeUrl(
  value: unknown,
  { schemes = ['http', 'https'], relative = false }: SafeUrlOpts = {},
): string | null {
  if (value == null) return null
  const v = String(value).trim()
  if (!v) return null
  if (relative && (v.startsWith('/') || v.startsWith('#'))) return v
  try {
    const u = new URL(v)
    return schemes.includes(u.protocol.replace(/:$/, '')) ? v : null
  } catch {
    return null
  }
}

export function hostOf(href: string): string {
  try {
    return new URL(href).hostname.replace(/^www\./, '')
  } catch {
    return href
  }
}

// --- marks --------------------------------------------------------------

const MARK_TAG: Record<string, string> = {
  bold: 'strong',
  italic: 'em',
  strike: 's',
  underline: 'u',
  code: 'code',
}

function applyMarks(text: string, marks: Mark[] = []): Child {
  // ProseMirror's DOMSerializer nests marks with marks[0] outermost; folding
  // from the innermost (last) mark leaves marks[0] as the final wrapper.
  return marks.reduceRight<Child>((child, mark) => {
    if (mark.type === 'link') {
      const href = safeUrl(mark.attrs?.href, {
        schemes: ['http', 'https', 'mailto', 'tel'],
      })
      if (!href) return child
      return h(
        'a',
        { href, target: '_blank', rel: 'noopener noreferrer nofollow' },
        [child],
      )
    }
    const tag = MARK_TAG[mark.type]
    return tag ? h(tag, null, [child]) : child
  }, text)
}

// --- code blocks ------------------------------------------------------

interface HastNode {
  type: string
  tagName?: string
  value?: string
  properties?: { className?: string | string[] }
  children?: HastNode[]
}

function hastToVNodes(nodes: HastNode[] = []): Child[] {
  const out: Child[] = []
  for (const n of nodes) {
    if (n.type === 'text') {
      out.push(n.value ?? '')
    } else if (n.type === 'element' && n.tagName) {
      out.push(
        h(n.tagName, { class: n.properties?.className }, hastToVNodes(n.children)),
      )
    }
  }
  return out
}

function renderCodeBlock(node: JSONContent): VNode {
  const code = (node.content ?? []).map((c) => c.text ?? '').join('')
  const lang = (node.attrs?.language as string | null) ?? null

  let children: Child[] = [code]
  if (lang && lowlight.registered(lang)) {
    try {
      const tree = lowlight.highlight(lang, code) as unknown as HastNode
      children = hastToVNodes(tree.children)
    } catch {
      children = [code]
    }
  }

  return h('pre', { class: 'code-block' }, [
    h(
      'code',
      { class: ['hljs', lang ? `language-${lang}` : null].filter(Boolean) },
      children,
    ),
  ])
}

// --- link card -------------------------------------------------------

function renderLinkCard(node: JSONContent): VNode | null {
  const a = node.attrs ?? {}
  const href = safeUrl(a.href, { schemes: ['http', 'https'] })
  if (!href) return null

  const host = (a.siteName as string) || hostOf(href)
  const image = a.image
    ? safeUrl(a.image, { schemes: ['http', 'https'], relative: true })
    : null

  const body: Child[] = [
    h('span', { class: 'link-card__title' }, (a.title as string) || host),
  ]
  if (a.description) {
    body.push(h('span', { class: 'link-card__desc' }, a.description as string))
  }
  body.push(h('span', { class: 'link-card__host' }, host))

  const children: Child[] = [h('div', { class: 'link-card__body' }, body)]
  if (image) {
    children.push(
      h('div', { class: 'link-card__media' }, [
        h('img', { src: image, alt: '', loading: 'lazy' }),
      ]),
    )
  }

  return h(
    'a',
    {
      href,
      'data-link-card': '',
      class: 'link-card',
      target: '_blank',
      rel: 'noopener noreferrer nofollow',
    },
    children,
  )
}

// --- video embed ----------------------------------------------------

const VIDEO_EMBED_ORIGINS = new Set([
  'https://www.youtube-nocookie.com',
  'https://youtube-nocookie.com',
  'https://player.vimeo.com',
])

function renderVideoEmbed(node: JSONContent): VNode | null {
  const { src, provider, url } = (node.attrs ?? {}) as {
    src?: string
    provider?: string
    url?: string
  }

  let origin: string | null = null
  try {
    origin = src ? new URL(src).origin : null
  } catch {
    origin = null
  }

  if (!src || !origin || !VIDEO_EMBED_ORIGINS.has(origin)) {
    const link = safeUrl(url, { schemes: ['http', 'https'] })
    return link
      ? h('p', [
          h(
            'a',
            {
              href: link,
              target: '_blank',
              rel: 'noopener noreferrer nofollow',
            },
            link,
          ),
        ])
      : null
  }

  return h('div', { class: 'video-embed' }, [
    h('div', { class: 'video-embed__frame' }, [
      h('iframe', {
        src,
        title: provider === 'vimeo' ? 'Vimeo video' : 'YouTube video',
        frameborder: '0',
        loading: 'lazy',
        allow:
          'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share',
        allowfullscreen: '',
      }),
    ]),
  ])
}

// --- node dispatch --------------------------------------------------

let warnedTypes: Set<string> | null = null

function warnUnknown(type: string) {
  if (!import.meta.dev) return
  ;(warnedTypes ??= new Set())
  if (warnedTypes.has(type)) return
  warnedTypes.add(type)
  console.warn(`[ArticleBody] unhandled node type "${type}" — rendered its children only`)
}

function renderInline(content: JSONContent[] | undefined): Child[] {
  const out: Child[] = []
  for (const child of content ?? []) {
    if (child.type === 'text') {
      out.push(applyMarks(child.text ?? '', child.marks as Mark[] | undefined))
    } else if (child.type === 'hardBreak') {
      out.push(h('br'))
    } else {
      const rendered = renderNode(child)
      if (Array.isArray(rendered)) out.push(...rendered)
      else if (rendered != null) out.push(rendered)
    }
  }
  return out
}

function renderBlocks(content: JSONContent[] | undefined): Child[] {
  const out: Child[] = []
  ;(content ?? []).forEach((child, i) => {
    const rendered = renderNode(child)
    if (Array.isArray(rendered)) {
      out.push(...rendered)
    } else if (rendered != null) {
      if (typeof rendered !== 'string') rendered.key = i
      out.push(rendered)
    }
  })
  return out
}

function renderNode(node: JSONContent): Child | Child[] | null {
  switch (node.type) {
    case 'doc':
      return renderBlocks(node.content)

    case 'paragraph':
      return h('p', renderInline(node.content))

    case 'heading': {
      const level = Math.min(Math.max(Number(node.attrs?.level) || 1, 1), 6)
      return h(`h${level}`, renderInline(node.content))
    }

    case 'text':
      return applyMarks(node.text ?? '', node.marks as Mark[] | undefined)

    case 'hardBreak':
      return h('br')

    case 'horizontalRule':
      return h('hr')

    case 'bulletList':
      return h('ul', renderBlocks(node.content))

    case 'orderedList': {
      const start = Number(node.attrs?.start)
      return h('ol', start > 1 ? { start } : null, renderBlocks(node.content))
    }

    case 'listItem':
      return h('li', renderBlocks(node.content))

    case 'blockquote':
      return h('blockquote', renderBlocks(node.content))

    case 'codeBlock':
      return renderCodeBlock(node)

    case 'image': {
      const src = safeUrl(node.attrs?.src, {
        schemes: ['http', 'https'],
        relative: true,
      })
      if (!src) return null
      return h('img', {
        src,
        alt: (node.attrs?.alt as string) || '',
        title: (node.attrs?.title as string) || undefined,
        loading: 'lazy',
        decoding: 'async',
      })
    }

    case 'linkCard':
      return renderLinkCard(node)

    case 'videoEmbed':
      return renderVideoEmbed(node)

    default:
      if (node.type) warnUnknown(node.type)
      return node.content?.length ? renderBlocks(node.content) : null
  }
}

// --- entry points -------------------------------------------------

function parseDoc(
  doc: JSONContent | string | null | undefined,
): JSONContent | null {
  if (doc == null) return null
  if (typeof doc === 'string') {
    try {
      return JSON.parse(doc) as JSONContent
    } catch {
      return null
    }
  }
  return doc
}

export function renderDoc(
  doc: JSONContent | string | null | undefined,
): Child[] {
  const parsed = parseDoc(doc)
  return parsed ? renderBlocks(parsed.content) : []
}

/** Flattened plain text of the document — for meta descriptions. */
export function articleText(
  doc: JSONContent | string | null | undefined,
  limit = 5000,
): string {
  const parsed = parseDoc(doc)
  if (!parsed) return ''
  const parts: string[] = []
  let total = 0
  const walk = (node: JSONContent | undefined) => {
    if (!node || total >= limit) return
    if (node.type === 'text' && node.text) {
      parts.push(node.text)
      total += node.text.length
    }
    node.content?.forEach(walk)
  }
  parsed.content?.forEach(walk)
  return parts.join(' ').replace(/\s+/g, ' ').trim()
}
