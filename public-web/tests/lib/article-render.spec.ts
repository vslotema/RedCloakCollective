// @vitest-environment nuxt
import { describe, expect, it } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import type { JSONContent } from '@tiptap/core'
import ArticleBody from '~/components/ArticleBody.vue'
import { articleText, safeUrl } from '~/lib/article-render'

// Server render — matches how the article page (SSR'd, `swr: 3600`) emits the
// body, and produces compact HTML without the test-utils pretty-printer.
function html(doc: JSONContent | string | null) {
  return renderToString(createSSRApp({ render: () => h(ArticleBody, { doc }) }))
}

const doc: JSONContent = {
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Title' }] },
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Section' }] },
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Plain ' },
        { type: 'text', marks: [{ type: 'bold' }], text: 'bold' },
        { type: 'text', text: ' ' },
        {
          type: 'text',
          marks: [{ type: 'italic' }, { type: 'link', attrs: { href: 'https://example.com' } }],
          text: 'italic link',
        },
        { type: 'text', marks: [{ type: 'code' }], text: 'code' },
        { type: 'text', marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }], text: 'EVIL' },
      ],
    },
    {
      type: 'bulletList',
      content: [
        { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'one' }] }] },
      ],
    },
    {
      type: 'orderedList',
      attrs: { start: 3 },
      content: [
        { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'third' }] }] },
      ],
    },
    { type: 'blockquote', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'quote' }] }] },
    {
      type: 'codeBlock',
      attrs: { language: 'typescript' },
      content: [{ type: 'text', text: 'const x: number = 1' }],
    },
    { type: 'codeBlock', attrs: { language: null }, content: [{ type: 'text', text: 'plain <b>x</b>' }] },
    { type: 'horizontalRule' },
    { type: 'image', attrs: { src: '/storage/article-body/x.webp', alt: 'alt' } },
    { type: 'image', attrs: { src: 'javascript:evil', alt: 'skip' } },
    {
      type: 'linkCard',
      attrs: {
        href: 'https://blog.example.com/p',
        title: 'Card title',
        description: 'Card desc',
        siteName: 'Example Blog',
        image: 'https://img.example.com/a.png',
      },
    },
    {
      type: 'videoEmbed',
      attrs: {
        src: 'https://www.youtube-nocookie.com/embed/abc123DEFxy',
        provider: 'youtube',
        url: 'https://youtu.be/abc123DEFxy',
      },
    },
    {
      type: 'videoEmbed',
      attrs: { src: 'https://evil.example.com/embed/x', provider: 'youtube', url: 'https://evil.example.com/x' },
    },
    { type: 'unknownFutureNode', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'fallback' }] }] },
  ],
}

const out = await html(doc)

describe('ArticleBody / renderDoc', () => {
  it('wraps in .article-content', () => {
    expect(out).toMatch(/^<div class="article-content">/)
  })

  it('renders headings, lists, blockquote', () => {
    expect(out).toContain('<h1>Title</h1>')
    expect(out).toContain('<h2>Section</h2>')
    expect(out).toContain('<ul><li><p>one</p></li></ul>')
    expect(out).toContain('<ol start="3">')
    expect(out).toContain('<blockquote><p>quote</p></blockquote>')
    expect(out).toContain('<hr>')
  })

  it('nests marks with marks[0] outermost (italic > link)', () => {
    expect(out).toContain(
      '<em><a href="https://example.com" target="_blank" rel="noopener noreferrer nofollow">italic link</a></em>',
    )
    expect(out).toContain('<strong>bold</strong>')
    expect(out).toContain('<code>code</code>')
  })

  it('drops an unsafe link scheme but keeps its text', () => {
    expect(out).toContain('EVIL')
    expect(out).not.toContain('javascript:alert')
  })

  it('highlights code with a known language and escapes plain blocks', () => {
    expect(out).toContain('<pre class="code-block"><code class="hljs language-typescript">')
    expect(out).toContain('hljs-keyword')
    expect(out).toContain('plain &lt;b&gt;x&lt;/b&gt;')
  })

  it('renders images and skips unsafe src', () => {
    expect(out).toContain('src="/storage/article-body/x.webp"')
    expect(out).toContain('alt="alt"')
    expect(out).not.toContain('javascript:evil')
  })

  it('renders a link card matching the editor structure', () => {
    expect(out).toContain('data-link-card')
    expect(out).toContain('class="link-card"')
    expect(out).toContain('<span class="link-card__title">Card title</span>')
    expect(out).toContain('<span class="link-card__host">Example Blog</span>')
    expect(out).toContain('<img src="https://img.example.com/a.png"')
  })

  it('builds an iframe only for allowlisted video origins', () => {
    expect(out).toContain('<iframe src="https://www.youtube-nocookie.com/embed/abc123DEFxy"')
    expect(out).not.toContain('evil.example.com/embed')
    expect(out).toContain('href="https://evil.example.com/x"')
  })

  it('renders children of an unknown node type', () => {
    expect(out).toContain('fallback')
  })

  it('survives an empty / malformed doc', async () => {
    expect(await html(null)).toBe('<div class="article-content"></div>')
    expect(await html({ type: 'doc' })).toBe('<div class="article-content"></div>')
    expect(await html('not json')).toBe('<div class="article-content"></div>')
  })
})

describe('articleText', () => {
  it('flattens text nodes and collapses whitespace', () => {
    expect(articleText(doc)).toContain('Title Section Plain bold italic link')
  })

  it('handles a JSON string', () => {
    expect(articleText(JSON.stringify(doc))).toContain('Title Section')
  })
})

describe('safeUrl', () => {
  it('allows configured schemes only', () => {
    expect(safeUrl('https://x.com')).toBe('https://x.com')
    expect(safeUrl('javascript:alert(1)')).toBeNull()
    expect(safeUrl('mailto:a@b.com')).toBeNull()
    expect(safeUrl('mailto:a@b.com', { schemes: ['mailto'] })).toBe('mailto:a@b.com')
  })

  it('allows relative refs only when asked', () => {
    expect(safeUrl('/storage/x.png')).toBeNull()
    expect(safeUrl('/storage/x.png', { relative: true })).toBe('/storage/x.png')
  })
})
