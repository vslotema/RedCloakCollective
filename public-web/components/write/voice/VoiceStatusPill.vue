<script setup lang="ts">
import VoiceWaveform from "./VoiceWaveform.vue";
import VoiceCommandsPanel from "./VoiceCommandsPanel.vue";

const voice = useArticleVoice();

const {
  enabled,
  mode,
  heardText,
  lastAction,
  panelOpen,
  commandReference,
} = voice;

// `panelOpen` is module-scoped state, so it survives SPA navigations away
// from and back to /write. Force it closed on every fresh mount — before the
// first render, so there's no open-then-slide-shut flash — rather than only
// on disable, which doesn't catch "still enabled from last visit, panel was
// left open last visit" too.
panelOpen.value = false;

function openPopout() {
  window.open(
    "/write/voice-commands",
    "voice-commands",
    "width=380,height=760,noopener",
  );
}
onBeforeUnmount(() => {
  voice.leaveEditor();
});
</script>

<template>
  <ClientOnly>
    <v-navigation-drawer
      v-if="enabled"
      v-model="panelOpen"
      location="end"
      width="325"
      color="background"
      class="voice-status__drawer"
      aria-label="Voice commands"
    >
      <VoiceCommandsPanel
        :enabled="enabled"
        :mode="mode"
        :heard-text="heardText"
        :last-action="lastAction"
        :command-reference="commandReference"
        show-popout
        show-close
        @popout="openPopout"
        @close="panelOpen = false"
      />
    </v-navigation-drawer>

    <div class="voice-status">
      <div v-if="enabled" class="voice-status__stack">
        <div v-if="heardText" class="voice-status__heard-bubble">
          “{{ heardText }}”
        </div>

        <div class="voice-status__pill" role="status" aria-live="polite">
          <span class="sr-only">
            {{ mode === "dictation" ? "Dictating" : "Listening" }}
          </span>
          <button
            type="button"
            class="voice-status__mic"
            :class="{ 'voice-status__mic--dictating': mode === 'dictation' }"
            aria-label="Turn off voice commands"
            @click="voice.disable()"
          >
            <v-icon icon="mic" :size="14" color="white" />
          </button>
          <VoiceWaveform class="voice-status__wave" />
          <span class="voice-status__divider" aria-hidden="true" />
          <button
            type="button"
            class="voice-status__commands-link"
            :aria-expanded="panelOpen"
            aria-label="Voice commands"
            @click="panelOpen = !panelOpen"
          >
            Voice Commands
          </button>
        </div>
      </div>
    </div>
  </ClientOnly>
</template>

<style scoped lang="scss">
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.voice-status__stack {
  position: fixed;
  left: 50%;
  bottom: var(--space-4);
  transform: translateX(-50%);
  z-index: 20;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  max-width: min(90vw, 30rem);

  @media (max-width: 599px) {
    // Clear the fixed toolbar footer.
    bottom: calc(56px + var(--space-3));
  }
}

.voice-status__heard-bubble {
  max-width: 100%;
  padding: var(--space-1) var(--space-3);
  font-size: var(--text-sm);
  font-style: italic;
  color: rgb(var(--v-theme-ink));
  background: rgb(var(--v-theme-background));
  border: 1px solid rgb(var(--v-theme-border-color));
  border-radius: 999px;
  box-shadow: 0 2px 12px rgb(0 0 0 / 0.12);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.voice-status__pill {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  max-width: 100%;
  padding: var(--space-2) var(--space-4);
  background: rgb(var(--v-theme-background));
  border: 1px solid rgb(var(--v-theme-border-color));
  border-radius: 999px;
  box-shadow: 0 2px 12px rgb(0 0 0 / 0.12);
}

.voice-status__mic {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: rgb(var(--v-theme-primary));
  cursor: pointer;

  &:hover,
  &:focus-visible {
    background: rgb(var(--v-theme-primary-darken-1));
  }

  &--dictating {
    background: rgb(var(--v-theme-tertiary));

    &:hover,
    &:focus-visible {
      background: rgb(var(--v-theme-tertiary-darken-1));
    }
  }
}

.voice-status__wave {
  flex-shrink: 0;
}

.voice-status__divider {
  align-self: stretch;
  width: 1px;
  flex-shrink: 0;
  background: rgb(var(--v-theme-border-color));
}

.voice-status__commands-link {
  flex-shrink: 0;
  padding: 0;
  font: inherit;
  font-size: var(--text-sm);
  font-weight: 700;
  color: rgb(var(--v-theme-primary));
  white-space: nowrap;
  text-decoration: underline;
  background: none;
  border: none;
  cursor: pointer;

  &:hover,
  &:focus-visible {
    color: rgb(var(--v-theme-primary-darken-1));
  }
}

.voice-status__heard {
  font-weight: 400;
  font-style: italic;
  color: rgb(var(--v-theme-on-surface));
}

// A real layout drawer (not an overlay) — it reserves its own width so
// v-main narrows the editor to make room instead of floating on top of it.
// Vuetify positions and animates it (slide + push) automatically.
.voice-status__drawer {
  border-left: 1px solid rgb(var(--v-theme-border-color));
}
</style>
