<script setup lang="ts">
import { useEditor, EditorContent } from "@tiptap/vue-3";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { FloatingMenu, BubbleMenu } from "@tiptap/vue-3/menus";
import type { JSONContent } from "@tiptap/core";
import type { EditorSelection } from "~/stores/editor";
import InsertMenu from "./InsertMenu.vue";
import TextFormattingTools from "./TextFormattingTools.vue";
import { LinkCard } from "./link-card";
import { CodeBlock } from "./code-block";
import { VideoEmbed } from "./video-embed";
import { LineNumbers } from "./line-numbers";

const editorStore = useEditorStore();

const content = defineModel<JSONContent>({
  default: () => ({
    type: "doc",
    content: [
      {
        type: "paragraph",
      },
    ],
  }),
});


// Cursor / selection position, mirrored up to the editor store. Write-only
// from here — the store never pushes a selection back down.
const selection = defineModel<EditorSelection | null>("selection", {
  default: null,
});

const linkEditing = ref(false);

const editor = useEditor({
  content: content.value,
  extensions: [
    StarterKit.configure({
      link: { openOnClick: false },
      codeBlock: false,
    }),
    Image,
    // Before LinkCard so a pasted YouTube/Vimeo URL becomes a video, not a card.
    VideoEmbed,
    LinkCard,
    CodeBlock,
    LineNumbers,
  ],
  onUpdate: ({ editor }) => {
    content.value = editor.getJSON();
  },
  onSelectionUpdate: ({ editor }) => {
    const { from, to, empty } = editor.state.selection;
    selection.value = { from, to, empty };
  },
});

const lineNumbersOn = computed(
  () => editor.value?.storage.lineNumbers?.enabled ?? false,
);

function toggleLineNumbers() {
  editor.value?.chain().focus().toggleLineNumbers().run();
  editorStore.statusMessage = `Block numbers ${lineNumbersOn.value ? "on" : "off"}`;
}

if (import.meta.dev) {
  watchEffect(() => {
    if (editor.value) (window as unknown as Record<string, unknown>).__editor = editor.value;
  });
}

function bubbleShouldShow({ editor, state, view, from, to }: any) {
  if (linkEditing.value) return true;
  if (!editor.isEditable || !view.hasFocus()) return false;
  if (state.selection.empty) return false;
  return state.doc.textBetween(from, to).length > 0;
}

watch(content, (value) => {
  if (!editor.value) return;
  const isSame =
    JSON.stringify(editor.value.getJSON()) === JSON.stringify(value);
  if (!isSame) {
    editor.value.commands.setContent(value, { emitUpdate: false });
  }
});

onBeforeUnmount(() => {
  editor.value?.destroy();
});
</script>

<template>
  <div v-if="editor" class="rich-text-editor">
    <v-toolbar
      density="compact"
      color="background"
      class="rich-text-editor__toolbar"
    >
      <TextFormattingTools :editor="editor" />
      <v-spacer />
      <v-btn
        icon
        size="small"
        :active="lineNumbersOn"
        active-color="#4f9cf6"
        :aria-pressed="lineNumbersOn"
        aria-label="Toggle block numbers"
        @click="toggleLineNumbers"
      >
        <v-icon icon="hash" :size="18" />
        <v-tooltip activator="parent" location="bottom" content-class="navbar-tooltip">
          Block numbers
        </v-tooltip>
      </v-btn>
    </v-toolbar>
  
    <FloatingMenu
      :editor="editor"
      :tippy-options="{
        duration: 100,
      }"
      style="z-index: 20"
    >
      <InsertMenu class="insert-menu" :editor="editor" />
    </FloatingMenu>
    <BubbleMenu
      :editor="editor"
      :should-show="bubbleShouldShow"
      :tippy-options="{
        duration: 100,
      }"
      style="z-index: 20"
    >
      <TextFormattingTools v-model:link-editing="linkEditing" :editor="editor" color="white" background="black" />
    </BubbleMenu>
    <editor-content
      :editor="editor"
      class="rich-text-editor__content"
      :class="{ 'rich-text-editor__content--numbered': lineNumbersOn }"
    />
    <p class="rich-text-editor__sr-status" aria-live="polite">
      {{ editorStore.statusMessage }}
    </p>
  </div>
</template>

<style scoped lang="scss">
.rich-text-editor {
  border-radius: 4px;

  &__sr-status {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    padding: 0;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
    border: 0;
  }

  &__toolbar {
    position: sticky;
    top: var(--v-layout-top, 64px);
    z-index: 3;
    border-radius: .25rem;
    background: rgb(var(--v-theme-background));
    border-bottom: 1px solid rgb(var(--v-theme-surface));
  }

  // Block-number gutter — see ./line-numbers.ts. Off by default; toggled by the
  // toolbar "#" button which adds this modifier.
  //
  // Default (wide): labels live in the page's left margin, right-aligned to the
  // text column's left edge, so the text stays put and aligned with the toolbar.
  &__content--numbered {
    --ln-label-width: 6rem;
    --ln-gap: 1.5rem;

    :deep(.ProseMirror) {
      position: relative;
    }

    :deep(.line-label) {
      position: absolute;
      right: calc(100% + var(--ln-gap));
      width: var(--ln-label-width);
      text-align: right;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-size: 0.8125rem;
      // Match the body's first-line box (font-size × line-height) so the label
      // sits level with where the block's text starts.
      line-height: calc(var(--text-lg) * 1.7);
      font-variant-numeric: tabular-nums;
      color: rgb(var(--v-theme-on-surface));
      opacity: 0.8;
      user-select: none;
      pointer-events: none;
    }

    // Keep the "+" menu clear of the label column.
    .insert-menu {
      transform: translateX(
        calc(-1 * (var(--ln-label-width) + var(--ln-gap) + 3.25rem))
      );
    }

    // Not enough left margin for a margin gutter → reserve an inset gutter
    // instead (labels move inside, text shifts right).
    @media (max-width: 1099px) {
      --ln-inset: 7.5rem;

      :deep(.ProseMirror) {
        padding-left: var(--ln-inset);
      }

      :deep(.line-label) {
        right: auto;
        left: 0;
        width: calc(var(--ln-inset) - var(--ln-gap));
      }

      .insert-menu {
        transform: translateX(calc(-1 * var(--ln-inset)));
      }
    }

    // No room at all — hide the labels (the mode can still read "on").
    @media (max-width: 599px) {
      :deep(.ProseMirror) {
        padding-left: 0;
      }

      :deep(.line-label) {
        display: none;
      }

      .insert-menu {
        transform: translateX(-75px);
      }
    }
  }

  &__content {
    padding: 16px;
    flex: 1 1 auto;
    min-height: 0;
    background: rgb(var(--v-theme-background));
    border-radius: .25rem;

    .insert-menu {
      transform: translateX(-75px);
    }

    :deep(.ProseMirror) {
      outline: none;

      // Article typography — kept in step with the published article view
      // (pages/articles/[slug].vue): large default body text, and the "Header"
      // (h2 / "Big title") at the global .text-h2 display size. The heading
      // font/weight/colour already come from the bare-`h2` rule in style.scss.
      font-size: var(--text-lg);
      line-height: 1.7;

      h2 {
        font-size: 3.75rem; // = global .text-h2
        line-height: 1.15;
      }

      img {
        max-width: 100%;
        height: auto;
      }

      pre.code-block {
        padding: var(--space-3, 0.75rem) var(--space-4, 1rem);
        background: rgb(var(--v-theme-surface));
        border: 1px solid rgb(var(--v-theme-border-color));
        border-radius: var(--radius-sm, 4px);
        overflow-x: auto;

        &.ProseMirror-selectednode {
          outline: 2px solid rgb(var(--v-theme-primary));
          outline-offset: 2px;
        }

        .code-block__bar {
          display: flex;
          align-items: center;
          padding-bottom: var(--space-2, 0.5rem);
        }

        .code-block__lang {
          display: inline-flex;
          align-items: center;
          gap: var(--space-1, 0.25rem);
          padding: 2px var(--space-2, 0.5rem);
          font-size: var(--text-sm, 0.875rem);
          color: rgb(var(--v-theme-on-surface));
          background: none;
          border: none;
          border-radius: var(--radius-sm, 4px);
          cursor: pointer;
          transition: color 0.12s ease;

          &:hover {
            color: rgb(var(--v-theme-ink));
          }
        }

        code {
          display: block;
          font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace);
          font-size: var(--text-sm, 0.875rem);
          line-height: 1.5;
          color: rgb(var(--v-theme-on-surface));
          background: none;
          white-space: pre;
        }

        // Compact highlight.js token palette — hand-picked to match the
        // theme rather than importing a highlight.js stylesheet.
        .hljs-keyword,
        .hljs-literal,
        .hljs-name,
        .hljs-tag {
          color: #b8002f;
        }

        .hljs-string {
          color: #268332;
        }

        .hljs-number {
          color: #a3651f;
        }

        .hljs-comment {
          color: #8a8a8a;
          font-style: italic;
        }

        .hljs-title,
        .hljs-title.function_,
        .hljs-attr,
        .hljs-attribute {
          color: #3642a0;
        }

        .hljs-built_in,
        .hljs-type {
          color: #5b7596;
        }

        .hljs-meta {
          color: #8a8a8a;
        }
      }
    }

    // Dark-theme token palette for code blocks — a sibling rule (not nested
    // inside :deep(.ProseMirror) above) so :global() doesn't have to combine
    // with SCSS `&`. Vuetify applies `.v-theme--dark` on an ancestor when the
    // dark theme is active.
    :deep(.v-theme--dark .code-block) {
      .hljs-keyword,
      .hljs-literal,
      .hljs-name,
      .hljs-tag {
        color: #ef5c7d;
      }

      .hljs-string {
        color: #78cf83;
      }

      .hljs-number {
        color: #d99a5b;
      }

      .hljs-comment {
        color: #a89c8a;
      }

      .hljs-title,
      .hljs-title.function_,
      .hljs-attr,
      .hljs-attribute {
        color: #9aa3e8;
      }

      .hljs-built_in,
      .hljs-type {
        color: #8fb3d1;
      }

      .hljs-meta {
        color: #a89c8a;
      }
    }

    :deep(.ProseMirror) {

      // Block spacing lives on the *bottom* of each block (not the top) so the
      // block-number labels stay aligned: a `.line-label` widget is rendered
      // in flow just before its block, and with no `top` set it sits at its
      // static position — which must be the block's first text line, not above
      // a top margin.
      > *:not(.line-label) {
        margin-block: 0 var(--space-4, 1.1rem);
      }

      > *:not(.line-label):last-child {
        margin-bottom: 0;
      }

      blockquote {
        border-left: 2px solid rgb(var(--v-theme-ink));
        padding-left: var(--space-4, 1rem);
        margin-inline: 0;
        color: rgb(var(--v-theme-on-surface));
      }
    }
  }
}
</style>
