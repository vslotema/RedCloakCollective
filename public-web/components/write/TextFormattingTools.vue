<script setup lang="ts">
import type { Editor } from "@tiptap/vue-3";
import { liftTarget } from "@tiptap/pm/transform";

const { editor, color = 'black', background = 'white' } = defineProps<{
  editor: Editor;
  color?: string;
  background?: string
}>();

// Kept in sync with the parent so the BubbleMenu's shouldShow can keep the
// menu open while the URL field has focus (the editor blurs when it does).
const linkEditing = defineModel<boolean>("linkEditing", { default: false });

type Tool = {
  label: string;
  icon?: string;
  glyph?: string;
  emphasis?: "quote";
};

const formatTools: Tool[] = [
  { label: "Bold", icon: "bold" },
  { label: "Italic", icon: "italic" },
  { label: "Link", icon: "link" },
  { label: "Quote", glyph: "“", emphasis: "quote" },
  { label: "Small title", icon: "type" },
  { label: "Big title", icon: "type" },
];

const linkInput = ref("");
const linkFieldRef = useTemplateRef<HTMLInputElement>("linkFieldRef");

function openLinkField() {
  linkInput.value = editor.getAttributes("link").href ?? "";
  linkEditing.value = true;
  nextTick(() => linkFieldRef.value?.focus());
}

function closeLinkField() {
  linkEditing.value = false;
  linkInput.value = "";
  editor.chain().focus().run();
}

// Focus leaving the field for anything outside the menu (e.g. a click back
// into the document) dismisses it; moving to the apply/remove button doesn't.
function onFieldBlur(event: FocusEvent) {
  const next = event.relatedTarget as Node | null;
  const menu = (event.currentTarget as HTMLElement).closest(".format-tools-menu");
  if (next && menu?.contains(next)) return;
  linkEditing.value = false;
  linkInput.value = "";
}

function normalizeHref(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^(https?:\/\/|mailto:|tel:|\/|#)/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function applyLink() {
  const href = normalizeHref(linkInput.value);
  const chain = editor.chain().focus().extendMarkRange("link");
  if (href) {
    chain.setLink({ href }).run();
  } else {
    chain.unsetLink().run();
  }
  linkEditing.value = false;
  linkInput.value = "";
}

function removeLink() {
  editor.chain().focus().extendMarkRange("link").unsetLink().run();
  linkEditing.value = false;
  linkInput.value = "";
}

function selectionHasBlockquote(): boolean {
  const type = editor.schema.nodes.blockquote;
  if (!type) return false;
  const { from, to } = editor.state.selection;
  let found = false;
  editor.state.doc.nodesBetween(from, to, (node) => {
    if (node.type === type) found = true;
  });
  return found;
}

function toggleQuote() {
  if (!selectionHasBlockquote()) {
    editor.chain().focus().wrapIn("blockquote").run();
    return;
  }
  editor
    .chain()
    .focus()
    .command(({ tr, dispatch }) => {
      const type = editor.schema.nodes.blockquote;
      const ranges: { from: number; to: number }[] = [];
      const { from, to } = tr.selection;
      tr.doc.nodesBetween(from, to, (node, pos) => {
        if (node.type === type) ranges.push({ from: pos, to: pos + node.nodeSize });
      });
      if (!ranges.length) return false;
      if (!dispatch) return true;

      ranges.sort((a, b) => b.from - a.from);
      for (const range of ranges) {
        const blockRange = tr.doc
          .resolve(range.from + 1)
          .blockRange(tr.doc.resolve(range.to - 1));
        const depth = blockRange && liftTarget(blockRange);
        if (depth != null) tr.lift(blockRange!, depth);
      }
      return true;
    })
    .run();
}

function toggleTool(label: string) {
  if (label === "Link") {
    openLinkField();
    return;
  }
  if (label === "Bold") editor.chain().focus().toggleBold().run();
  if (label === "Italic") editor.chain().focus().toggleItalic().run();
  if (label === "Quote") toggleQuote();
  if (label === "Small title")
    editor.chain().focus().toggleHeading({ level: 3 }).run();
  if (label === "Big title")
    editor.chain().focus().toggleHeading({ level: 2 }).run();
}

function toolIsActive(label: string): boolean {
  if (label === "Bold") return editor.isActive("bold");
  if (label === "Italic") return editor.isActive("italic");
  if (label === "Link") return editor.isActive("link");
  if (label === "Quote") return selectionHasBlockquote();
  if (label === "Small title") return editor.isActive("heading", { level: 3 });
  if (label === "Big title") return editor.isActive("heading", { level: 2 });
  return false;
}
</script>

<template>
  <div class="format-tools-menu" :style="{color, background}"  >
    <form
      v-if="linkEditing"
      class="format-tools-menu__link"
      @submit.prevent="applyLink"
    >
      <input
        ref="linkFieldRef"
        v-model="linkInput"
        type="url"
        class="format-tools-menu__link-field"
        placeholder="Paste or type a link…"
        aria-label="Link URL"
        @keydown.esc.prevent="closeLinkField"
        @blur="onFieldBlur"
      />
      <v-btn
        type="submit"
        class="write-tools__tool"
        icon
        size="small"
        aria-label="Apply link"
        @mousedown.prevent
      >
        <v-icon icon="check" :size="18" />
      </v-btn>
      <v-btn
        v-if="editor.isActive('link')"
        type="button"
        class="write-tools__tool"
        icon
        size="small"
        aria-label="Remove link"
        @mousedown.prevent
        @click="removeLink"
      >
        <v-icon icon="trash-2" :size="18" />
      </v-btn>
    </form>

    <template v-else>
      <v-btn
        v-for="tool in formatTools"
        :key="tool.label"
        type="button"
        class="write-tools__tool"
        :active="toolIsActive(tool.label)"
        active-color="#4f9cf6"
        base-color="black"
        icon
        size="small"
        @mousedown.prevent
        @click="toggleTool(tool.label)"
      >
        <span aria-hidden="true">
          <v-icon
            v-if="tool.icon"
            :icon="tool.icon"
            :size="tool.label === 'Big title' ? 22 : 18"
          />
          <span v-else class="text-x-large font-weight-500">
            {{ tool.glyph }}
          </span>
        </span>
        <v-tooltip
          activator="parent"
          location="top"
          content-class="navbar-tooltip"
        >
          {{ tool.label }}
        </v-tooltip>
      </v-btn>
    </template>
  </div>
</template>

<style scoped lang="scss">
.format-tools-menu {
  padding: 0.25rem;
  border-radius: 0.25rem;
  display: flex;
  gap: 0.25rem;

  .write-tools__tool {
    border-radius: 0.25rem;
  }

  &__link {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  &__link-field {
    width: 16rem;
    padding: 0.25rem 0.5rem;
    font: inherit;
    color: white;
    background: black;
    border: none;
    outline: none;

    &::placeholder {
      color: rgba(255, 255, 255, 0.5);
    }
  }
}
</style>
