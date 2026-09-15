<script setup lang="ts">
import { useDisplay } from "vuetify";
import TextFormattingTools from "./TextFormattingTools.vue";
import { toggleBlockNumbers } from "./editor-actions";

// A v-navigation-drawer rail attached to the left edge of the /write page,
// flush under the topbar — same treatment as SidebarNavigation. Text
// formatting at the top, block-numbers / help / voice pinned to the bottom.
// Rendered by the `write` layout; it reads the live editor from
// `useEditorInstance` (published by RichTextEditor) rather than a prop, and
// shows nothing until the editor is mounted. Below `sm` it becomes a bottom
// bar holding just the utility trio.

const editorStore = useEditorStore();
const { editor } = useEditorInstance();
const voice = useArticleVoice();
const { smAndUp } = useDisplay();
const router = useRouter();

const { enabled, permissionDenied, supported, mode, panelOpen } = voice;

const drawerLocation = computed(() => (smAndUp.value ? "start" : "bottom"));
const drawerWidth = computed(() => (smAndUp.value ? 44 : 56));
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

function goBack() {
  if (window.history.length > 1) {
    router.back();
  } else {
    router.push("/");
  }
}
</script>

<template>
  <v-navigation-drawer
    v-if="editor"
    permanent
    :location="drawerLocation"
    :width="drawerWidth"
    color="surface"
    class="editor-toolbar"
    :class="{ 'editor-toolbar--bottom': !smAndUp }"
  >
    <TextFormattingTools
      v-if="smAndUp"
      :editor="editor"
      class="editor-toolbar__format"
      orientation="vertical"
      color="rgb(var(--v-theme-on-surface))"
      background="transparent"
      tool-variant="text"
      active-color="primary"
    />

    <div class="editor-toolbar__utility">
      <v-btn
        icon
        size="small"
        variant="text"
        :active="lineNumbersOn"
        active-color="primary"
        :aria-pressed="lineNumbersOn"
        aria-label="Toggle block numbers"
        :ripple="false"
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
        variant="text"
        :active="panelOpen"
        active-color="primary"
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
        variant="text"
        :disabled="!supported"
        :color="enabled && !permissionDenied ? 'primary' : undefined"
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

      <v-btn
        icon
        size="small"
        variant="text"
        aria-label="Go back"
        @click="goBack"
      >
        <v-icon icon="arrow-left" :size="18" />
        <v-tooltip
          activator="parent"
          :location="tooltipLocation"
          content-class="navbar-tooltip"
        >
          Go back
        </v-tooltip>
      </v-btn>
    </div>
  </v-navigation-drawer>
</template>

<style scoped lang="scss">
.editor-toolbar {
  color: rgb(var(--v-theme-on-surface));
  border-right: thin solid rgb(var(--v-theme-border-strong));

  :deep(.v-navigation-drawer__content) {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0;
    overflow-y: auto;
  }

  &__utility {
    margin-top: auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
  }

  // Active tools should only recolor the icon, never paint a background.
  :deep(.v-btn--active .v-btn__overlay) {
    opacity: 0;
  }

  // Phone: an attached bar under the content, flush against its bottom edge.
  &--bottom {
    border-right: none;
    border-top: thin solid rgb(var(--v-theme-border-strong));

    :deep(.v-navigation-drawer__content) {
      flex-direction: row;
      justify-content: center;
      padding: 0 0.25rem;
    }

    .editor-toolbar__utility {
      margin-top: 0;
      flex-direction: row;
      gap: 0.5rem;
    }
  }
}
</style>
