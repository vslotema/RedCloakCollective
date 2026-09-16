<script setup lang="ts">
import { useDisplay } from "vuetify";
import TextFormattingTools from "./TextFormattingTools.vue";
import { toggleBlockNumbers } from "./editor-actions";

const editorStore = useEditorStore();
const { editor } = useEditorInstance();
const voice = useArticleVoice();
const { smAndUp } = useDisplay();
const router = useRouter();

const { enabled, permissionDenied, supported, mode } = voice;

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

// Only the two fatal, non-recovering failure modes get a popup. The other
// SpeechRecognition error codes ('no-speech', 'network', 'aborted', ...) are
// deliberately transient — useSpeechRecognition auto-restarts after them, so
// popping a dialog on every blip would fight that self-healing design.
const voiceErrorReason = ref<"unsupported" | "permission-denied" | null>(null);

const voiceErrorDialog = computed({
  get: () => voiceErrorReason.value !== null,
  set: (v: boolean) => {
    if (!v) voiceErrorReason.value = null;
  },
});

const voiceErrorContent = computed(() =>
  voiceErrorReason.value === "unsupported"
    ? {
        title: "Voice Commands Unavailable",
        message:
          "Your browser doesn't support voice commands. Please switch to Chrome, Edge, or Safari to use this feature.",
      }
    : {
        title: "Microphone Blocked",
        message:
          "Voice commands need microphone access. Please allow microphone access in your browser settings, then try again.",
      },
);

function onMicClick() {
  if (!supported.value) {
    voiceErrorReason.value = "unsupported";
    return;
  }
  voice.toggle();
}

// permissionDenied flips asynchronously (after the browser's own permission
// prompt is answered), not synchronously on click, so it needs its own watch
// rather than a click-time check.
watch(permissionDenied, (denied) => {
  if (denied) voiceErrorReason.value = "permission-denied";
});
</script>

<template>
  <v-navigation-drawer
    permanent
    :location="drawerLocation"
    :width="drawerWidth"
    color="surface"
    class="editor-toolbar"
    :class="{ 'editor-toolbar--bottom': !smAndUp }"
  >
    <TextFormattingTools
      v-if="editor && smAndUp"
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
        icon
        size="small"
        variant="text"
        :color="enabled && !permissionDenied ? 'primary' : undefined"
        :aria-pressed="enabled"
        :aria-label="voiceLabel"
        @click="onMicClick"
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

    <AlertDialog
      v-model="voiceErrorDialog"
      icon="mic-off"
      tone="danger"
      :title="voiceErrorContent.title"
      :message="voiceErrorContent.message"
      confirm-text="Got it"
    />
  </v-navigation-drawer>
</template>

<style scoped lang="scss">
.editor-toolbar {
  color: rgb(var(--v-theme-on-surface));
  border-right: thin solid rgb(var(--v-theme-border-strong));
  // Permanent means always visible — it never opens/closes, so it should
  // never animate. Vuetify's own .v-navigation-drawer CSS unconditionally
  // transitions transform/left/right/top/bottom on every mount, which is
  // what caused the visible "snap to the left" on reload (its computed
  // `location` briefly reads "bottom" before settling to "start").
  transition: none !important;

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
