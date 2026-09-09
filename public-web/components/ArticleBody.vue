<script lang="ts">
import { defineComponent, h, type PropType } from 'vue'
import type { JSONContent } from '@tiptap/core'
import { renderDoc } from '~/lib/article-render'

/**
 * Renders a published article's stored TipTap JSON. SSR-safe render function —
 * see lib/article-render.ts. Styling is the global `.article-content` sheet
 * (assets/styles/article-content.scss), shared with the editor.
 */
export default defineComponent({
  name: 'ArticleBody',
  props: {
    doc: {
      type: [Object, String] as PropType<JSONContent | string | null>,
      default: null,
    },
  },
  render() {
    return h('div', { class: 'article-content' }, renderDoc(this.doc))
  },
})
</script>
