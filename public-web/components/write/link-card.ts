import { Node, mergeAttributes } from '@tiptap/core'
import { Plugin } from '@tiptap/pm/state'
import type { Editor } from '@tiptap/core'

export interface LinkCardMeta {
  title?: string | null
  description?: string | null
  image?: string | null
  siteName?: string | null
}

export interface LinkCardAttrs extends LinkCardMeta {
  href: string
  uid?: string | null
  loading?: boolean
}

/** Response shape of `GET /link-preview` (see server/routes/link-preview.get.ts). */
interface LinkPreview extends Required<LinkCardMeta> {
  url: string
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    linkCard: {
      /** Insert a link-card block for the given href (metadata filled in later). */
      setLinkCard: (attrs: LinkCardAttrs) => ReturnType
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

/**
 * Fill a previously-inserted card (matched by uid) with fetched metadata. A
 * no-op if the node has since been deleted or the editor is gone.
 */
export function hydrateLinkCard(
  editor: Editor,
  uid: string,
  meta: LinkCardMeta,
): void {
  if (!editor || editor.isDestroyed) return
  editor.commands.command(({ tr, state }) => {
    let changed = false
    state.doc.descendants((node, pos) => {
      if (node.type.name === 'linkCard' && node.attrs.uid === uid) {
        tr.setNodeMarkup(pos, undefined, {
          ...node.attrs,
          ...meta,
          loading: false,
        })
        changed = true
      }
    })
    return changed
  })
}

function hostOf(href: string): string {
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
      uid: dataAttr('uid'),
      loading: { default: false, rendered: false },
    }
  },

  parseHTML() {
    return [{ tag: 'a[data-link-card]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    const { href, title, description, image, siteName, loading } = node.attrs
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
        class: `link-card${loading ? ' link-card--loading' : ''}`,
        target: '_blank',
        rel: 'noopener noreferrer nofollow',
      }),
      ...children,
    ]
  },

  addCommands() {
    return {
      setLinkCard:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: {
              title: null,
              description: null,
              image: null,
              siteName: null,
              loading: true,
              ...attrs,
              uid:
                attrs.uid ||
                globalThis.crypto?.randomUUID?.() ||
                String(Date.now()),
            },
          }),
    }
  },

  addProseMirrorPlugins() {
    const editor = this.editor

    return [
      new Plugin({
        props: {
          handlePaste: (view, event) => {
            const text = event.clipboardData?.getData('text/plain')?.trim()
            if (!text || !/^https?:\/\/\S+$/i.test(text)) return false

            const { selection } = view.state
            const { $from, empty } = selection
            // Only take over a paste that lands on its own empty line — a URL
            // dropped mid-sentence should still paste as text / an inline link.
            if (
              !empty ||
              $from.parent.type.spec.code ||
              $from.parent.content.size > 0 ||
              $from.depth !== 1
            ) {
              return false
            }

            const uid =
              globalThis.crypto?.randomUUID?.() ?? String(Date.now())
            editor.chain().focus().setLinkCard({ href: text, uid }).run()
            fetchPreview(text).then((meta) =>
              hydrateLinkCard(editor, uid, meta),
            )
            return true
          },
        },
      }),
    ]
  },
})
