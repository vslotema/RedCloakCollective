<script setup lang="ts">
import { useDisplay } from "vuetify";
import TextFormattingTools from "./TextFormattingTools.vue";
import { toggleBlockNumbers } from "./editor-actions";

// A detached vertical rail down the left side of the /write page: text
// formatting at the top, block-numbers / help / voice pinned to the bottom.
// Rendered by the `write` layout; it reads the live editor from
// `useEditorInstance` (published by RichTextEditor) rather than a prop, and
// shows nothing until the editor is mounted. Below `sm` it becomes a bottom
// footer holding just the utility trio.

const editorStore = useEditorStore();
const { editor } = useEditorInstance();
const voice = useArticleVoice();
const { smAndUp } = useDisplay();

const { enabled, permissionDenied, supported, mode, panelOpen } = voice;

const tooltipLocation = computed(() => (smAndUp.value ? "end" : "top"));

const lineNumbersOn = computed(
  () => editor.value?.storage.lineNumbers?.enabled ?? false,
);

function toggleLineNumbers() {
  if (!editor.value) return;
  toggleBlockNumbers(editor.value);
  editorStore.statusMessage = `Block numbers ${lineNumbersOn.value ? "on" : "off"}`;
}

const voiceIcon = computed(() =>
  enabled.value && !permissionDenied.value ? "mic" : "mic-off",
);

const voiceLabel = computed(() => {
  if (!supported.value) return "Voice commands need Chrome, Edge or Safari";
  if (permissionDenied.value)
    return "Microphone blocked — allow it in your browser settings";
  if (!enabled.value) return "Turn on voice commands";
  return mode.value === "dictation"
    ? "Dictating — say “stop” to finish"
    : "Voice on — say “help” for commands";
});
</script>

<template>
  <div v-if="editor" class="editor-toolbar">
    <TextFormattingTools
      :editor="editor"
      class="editor-toolbar__format"
      orientation="vertical"
    />

    <div class="editor-toolbar__utility">
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
        <v-tooltip
          activator="parent"
          :location="tooltipLocation"
          content-class="navbar-tooltip"
        >
          Block numbers
        </v-tooltip>
      </v-btn>

      <v-btn
        v-if="supported"
        icon
        size="small"
        variant="tonal"
        :aria-label="panelOpen ? 'Hide voice commands' : 'Show voice commands'"
        @click="panelOpen = !panelOpen"
      >
        <v-icon icon="help-circle" :size="18" />
        <v-tooltip
          activator="parent"
          :location="tooltipLocation"
          content-class="navbar-tooltip"
        >
          Voice commands
        </v-tooltip>
      </v-btn>

      <v-btn
        icon
        size="small"
        :disabled="!supported"
        :color="enabled && !permissionDenied ? 'ink' : undefined"
        :aria-pressed="enabled"
        :aria-label="voiceLabel"
        @click="voice.toggle()"
      >
        <v-icon :icon="voiceIcon" :size="18" />
        <v-tooltip
          activator="parent"
          :location="tooltipLocation"
          content-class="navbar-tooltip"
        >
          {{ voiceLabel }}
        </v-tooltip>
      </v-btn>
    </div>
  </div>
</template>

<style scoped lang="scss">
.editor-toolbar {
  position: fixed;
  left: var(--space-2);
  top: calc(var(--v-layout-top, 64px) + var(--space-2));
  bottom: var(--space-2);
  z-index: 6;
  width: 44px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0;
  overflow-y: auto;
  background: rgb(var(--v-theme-background));
  border: 1px solid rgb(var(--v-theme-surface));
  border-radius: 0.5rem;
  box-shadow: 0 1px 8px rgb(0 0 0 / 0.08);

  &__utility {
    margin-top: auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
  }

  // Phone: a detached footer with only the utility trio.
  @media (max-width: 599px) {
    inset: auto var(--space-2) var(--space-2) var(--space-2);
    top: auto;
    width: auto;
    flex-direction: row;
    justify-content: center;
    overflow: visible;

    .editor-toolbar__format {
      display: none;
    }

    .editor-toolbar__utility {
      margin-top: 0;
      flex-direction: row;
      gap: 0.5rem;
    }
  }
}
</style>
