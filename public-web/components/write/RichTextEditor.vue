<script setup lang="ts">
import { useEditor, EditorContent } from "@tiptap/vue-3";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { FloatingMenu, BubbleMenu } from "@tiptap/vue-3/menus";
import type { JSONContent } from "@tiptap/core";
import InsertMenu from "./InsertMenu.vue";
import TextFormattingTools from "./TextFormattingTools.vue";
import { LinkCard } from "./link-card";
import { CodeBlock } from "./code-block";
import { VideoEmbed } from "./video-embed";

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
  ],
  onUpdate: ({ editor }) => {
    content.value = editor.getJSON();
  },
});

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
    <editor-content :editor="editor" class="rich-text-editor__content" />
  </div>
</template>

<style scoped lang="scss">
.rich-text-editor {
  border-radius: 4px;

  &__toolbar {
    position: sticky;
    top: var(--v-layout-top, 64px);
    z-index: 3;
    background: rgb(var(--v-theme-background));
  }

  &__content {
    padding: 16px;
    flex: 1 1 auto;
    min-height: 0;

    .insert-menu {
      transform: translateX(-75px);
    }

    :deep(.ProseMirror) {
      outline: none;

      img {
        max-width: 100%;
        height: auto;
      }

      pre.code-block {
        margin-block: var(--space-4, 1rem);
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
