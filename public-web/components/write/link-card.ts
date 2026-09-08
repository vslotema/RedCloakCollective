import { Node, mergeAttributes } from '@tiptap/core'
import { Plugin } from '@tiptap/pm/state'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import LinkCardView from './LinkCardView.vue'

export interface LinkCardMeta {
  title?: string | null
  description?: string | null
  image?: string | null
  siteName?: string | null
}

/** Response shape of `GET /link-preview` (see server/routes/link-preview.get.ts). */
interface LinkPreview extends Required<LinkCardMeta> {
  url: string
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    linkCard: {
      /** Insert an empty link-card block — the NodeView prompts for the URL. */
      insertLinkCard: () => ReturnType
    }
  }
}

/** Ask the Nitro route for a URL's Open Graph / title metadata. Never throws. */
export function fetchPreview(href: string): Promise<LinkCardMeta> {
  return $fetch<LinkPreview>('/link-preview', { params: { url: href } })
    .then(({ title, description, image, siteName }) => ({
      title,
      description,
      image,
      siteName,
    }))
    .catch(() => ({}))
}

export function hostOf(href: string): string {
  try {
    return new URL(href).hostname.replace(/^www\./, '')
  } catch {
    return href
  }
}

const dataAttr = (name: string) => ({
  default: null as string | null,
  parseHTML: (el: HTMLElement) => el.getAttribute(`data-${name}`) || null,
  renderHTML: (attrs: Record<string, unknown>) =>
    attrs[name] ? { [`data-${name}`]: attrs[name] } : {},
})

export const LinkCard = Node.create({
  name: 'linkCard',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      href: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute('href'),
        renderHTML: (attrs: Record<string, unknown>) =>
          attrs.href ? { href: attrs.href } : {},
      },
      title: dataAttr('title'),
      description: dataAttr('description'),
      image: dataAttr('image'),
      siteName: dataAttr('siteName'),
      loading: { default: false, rendered: false },
    }
  },

  parseHTML() {
    return [{ tag: 'a[data-link-card]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    const { href, title, description, image, siteName } = node.attrs
    const host = siteName || hostOf(href)

    const body: (string | Record<string, unknown> | unknown[])[] = [
      'div',
      { class: 'link-card__body' },
      ['span', { class: 'link-card__title' }, title || host],
    ]
    if (description) {
      body.push(['span', { class: 'link-card__desc' }, description])
    }
    body.push(['span', { class: 'link-card__host' }, host])

    const children: unknown[] = [body]
    if (image) {
      children.push([
        'div',
        { class: 'link-card__media' },
        ['img', { src: image, alt: '', loading: 'lazy' }],
      ])
    }

    return [
      'a',
      mergeAttributes(HTMLAttributes, {
        'data-link-card': '',
        class: 'link-card',
        target: '_blank',
        rel: 'noopener noreferrer nofollow',
      }),
      ...children,
    ]
  },

  addNodeView() {
    return VueNodeViewRenderer(LinkCardView)
  },

  addCommands() {
    return {
      insertLinkCard:
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

            // Only take over a paste that lands on its own empty line — a URL
            // dropped mid-sentence should still paste as text / an inline link.
            const { $from, empty } = view.state.selection
            if (
              !empty ||
              $from.parent.type.spec.code ||
              $from.parent.content.size > 0 ||
              $from.depth !== 1
            ) {
              return false
            }

            editor
              .chain()
              .focus()
              .insertContent({ type, attrs: { href: text, loading: true } })
              .run()
            return true
          },
        },
      }),
    ]
  },
})
