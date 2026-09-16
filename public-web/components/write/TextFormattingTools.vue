<script setup lang="ts">
import type { Editor } from "@tiptap/vue-3";
import {
  selectionHasBlockquote,
  toggleBold,
  toggleHeading,
  toggleItalic,
  toggleQuote,
} from "./editor-actions";

const {
  editor,
  color = 'black',
  background = 'white',
  orientation = 'horizontal',
  toolVariant,
  baseColor,
  activeColor = '#4f9cf6',
} = defineProps<{
  editor: Editor;
  color?: string;
  background?: string;
  orientation?: 'horizontal' | 'vertical';
  toolVariant?: 'elevated' | 'text';
  baseColor?: string;
  activeColor?: string;
}>();

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

// The sidebar rail is far from the text — anchor the link field to the caret
// instead of the toolbar. The floating (bubble menu) instance already sits
// next to the selection, so it keeps opening in place.
const isSidebar = computed(() => orientation === "vertical");
const linkFieldStyle = ref<{ position: string; top: string; left: string } | undefined>(undefined);

function caretPositionStyle() {
  const { view } = editor;
  const coords = view.coordsAtPos(view.state.selection.to);
  return {
    position: "fixed",
    top: `${coords.bottom + 8}px`,
    left: `${coords.left}px`,
  };
}

function openLinkField() {
  linkInput.value = editor.getAttributes("link").href ?? "";
  linkFieldStyle.value = isSidebar.value ? caretPositionStyle() : undefined;
  linkEditing.value = true;
  nextTick(() => linkFieldRef.value?.focus());
}

function closeLinkField() {
  linkEditing.value = false;
  linkInput.value = "";
  editor.chain().focus().run();
}

function onFieldBlur(event: FocusEvent) {
  const next = event.relatedTarget as Node | null;
  const menu = (event.currentTarget as HTMLElement).closest(".format-tools-menu__link");
  if (next && menu?.contains(next)) return;
  linkEditing.value = false;
  linkInput.value = "";
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

function toggleTool(label: string) {
  if (label === "Link") {
    openLinkField();
    return;
  }
  if (label === "Bold") toggleBold(editor);
  if (label === "Italic") toggleItalic(editor);
  if (label === "Quote") toggleQuote(editor);
  if (label === "Small title") toggleHeading(editor, 1);
  if (label === "Big title") toggleHeading(editor, 2);
}

function toolIsActive(label: string): boolean {
  if (label === "Bold") return editor.isActive("bold");
  if (label === "Italic") return editor.isActive("italic");
  if (label === "Link") return editor.isActive("link");
  if (label === "Quote") return selectionHasBlockquote(editor);
  if (label === "Small title") return editor.isActive("heading", { level: 1 });
  if (label === "Big title") return editor.isActive("heading", { level: 2 });
  return false;
}
</script>

<template>
  <div
    class="format-tools-menu"
    :class="`format-tools-menu--${orientation}`"
    :style="{ color, background }"
  >
    <Teleport to="body" :disabled="!isSidebar">
      <form
        v-if="linkEditing"
        class="format-tools-menu__link"
        :class="{ 'format-tools-menu__link--floating': isSidebar }"
        :style="linkFieldStyle"
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
          :variant="toolVariant"
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
          :variant="toolVariant"
          aria-label="Remove link"
          @mousedown.prevent
          @click="removeLink"
        >
          <v-icon icon="trash-2" :size="18" />
        </v-btn>
      </form>
    </Teleport>

    <template v-if="!linkEditing || isSidebar">
      <v-btn
        v-for="tool in formatTools"
        :key="tool.label"
        type="button"
        class="write-tools__tool"
        :active="toolIsActive(tool.label)"
        :active-color="activeColor"
        :base-color="baseColor"
        :variant="toolVariant"
        icon
        size="small"
        :ripple="false"
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

  &--vertical {
    flex-direction: column;
    position: relative;
  }

  .write-tools__tool {
    border-radius: 0.25rem;
  }

  &__link {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  // Sidebar rail: the field is teleported to <body> and anchored to the
  // caret instead of the rail, so it needs its own chrome.
  &__link--floating {
    z-index: 20;
    padding: 0.25rem;
    background: black;
    border-radius: 0.25rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
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
