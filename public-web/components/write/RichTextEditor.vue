<script setup lang="ts">
import { useEditor, EditorContent } from "@tiptap/vue-3";
import StarterKit from "@tiptap/starter-kit";
import { FloatingMenu, BubbleMenu } from "@tiptap/vue-3/menus";
import type { JSONContent } from "@tiptap/core";
import InsertMenu from "./InsertMenu.vue";
import TextFormattingTools from "./TextFormattingTools.vue";

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

const editor = useEditor({
  content: content.value,
  extensions: [
    StarterKit.configure({
      // Don't navigate away when a link is clicked mid-edit; the bubble menu
      // handles editing/removing instead.
      link: { openOnClick: false },
    }),
  ],
  onUpdate: ({ editor }) => {
    content.value = editor.getJSON();
  },
});

// While the link URL field has focus the editor is blurred, which would
// normally collapse the bubble menu — keep it up until the field closes.
const linkEditing = ref(false);

function bubbleShouldShow({ editor, state, view, from, to }: any) {
  // Field has focus, so the editor is blurred — hold the menu open regardless.
  if (linkEditing.value) return true;
  if (!editor.isEditable || !view.hasFocus()) return false;
  if (state.selection.empty) return false;
  return state.doc.textBetween(from, to).length > 0;
}

watch(content, (value) => {
  if (!editor.value) return;
  // onUpdate writes the editor's own JSON back into `content`, which re-triggers
  // this watch. Bail on that echo — calling setContent again would rebuild the
  // doc and collapse the selection mid-edit. Only react to genuine outside
  // changes (a different value than what the editor already holds).
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
    <!-- style z-index: floating-ui positions these absolutely with no stacking
         order of their own, so they'd render behind the sticky toolbar
         (z-index 3) whenever they overlap it. Keep them above it. -->
    <FloatingMenu
      :editor="editor"
      :tippy-options="{
        duration: 100,
      }"
      style="z-index: 20"
    >
      <InsertMenu class="insert-menu" />
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
    // Pin the formatting bar just below the fixed app bar so it stays reachable
    // through a long article, not just on the first screen. --v-layout-top is
    // set by Vuetify to the app-bar height (64px fallback matches the default).
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
    }
  }
}
</style>
