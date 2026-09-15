<script setup lang="ts">
import VoiceWaveform from "./VoiceWaveform.vue";

const voice = useArticleVoice();

const {
  enabled,
  mode,
  heardText,
  lastAction,
  panelOpen,
  commandReference,
} = voice;

onBeforeUnmount(() => {
  if (enabled.value) voice.disable();
});
</script>

<template>
  <ClientOnly>
    <div class="voice-status">
      <v-card
        v-if="panelOpen"
        class="voice-status__panel"
        role="dialog"
        aria-label="Voice commands"
      >
        <div class="voice-status__panel-head">
          <strong>Voice commands</strong>
          <v-btn
            icon
            size="x-small"
            variant="text"
            aria-label="Close"
            @click="panelOpen = false"
          >
            <v-icon icon="x" :size="16" />
          </v-btn>
        </div>

        <p class="voice-status__panel-status" aria-hidden="true">
          <span class="voice-status__mode">{{
            enabled ? (mode === "dictation" ? "Dictating" : "Listening") : "Off"
          }}</span>
          <span v-if="heardText" class="voice-status__heard">“{{ heardText }}”</span>
          <span v-else-if="lastAction" class="voice-status__heard">{{ lastAction }}</span>
        </p>

        <div
          v-for="group in commandReference"
          :key="group.title"
          class="voice-status__group"
        >
          <h4>{{ group.title }}</h4>
          <dl>
            <div v-for="item in group.items" :key="item.say" class="voice-status__row">
              <dt>{{ item.say }}</dt>
              <dd>{{ item.does }}</dd>
            </div>
          </dl>
        </div>

        <p class="voice-status__note">
          Speech is processed by your browser’s provider (Google in Chrome).
        </p>
      </v-card>

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

.voice-status__panel {
  position: fixed;
  left: 50%;
  bottom: var(--space-4);
  transform: translateX(-50%);
  z-index: 21;
  width: min(22rem, calc(100vw - 2 * var(--space-4)));
  max-height: min(30rem, calc(100vh - 8rem));
  overflow-y: auto;
  padding: var(--space-4);
  background: rgb(var(--v-theme-background));
  border: 1px solid rgb(var(--v-theme-border-color));

  @media (max-width: 599px) {
    bottom: calc(56px + var(--space-3));
  }

  h4 {
    margin: var(--space-3) 0 var(--space-1);
    font-size: var(--text-sm);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: rgb(var(--v-theme-on-surface));
  }

  dl {
    margin: 0;
  }
}

.voice-status__panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: var(--text-md, 1rem);
  color: rgb(var(--v-theme-ink));
}

.voice-status__panel-status {
  margin: var(--space-2) 0 0;
  font-size: var(--text-sm);
  color: rgb(var(--v-theme-on-surface));
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.voice-status__mode {
  font-weight: 600;
  color: rgb(var(--v-theme-ink));
}

.voice-status__row {
  display: grid;
  grid-template-columns: 1fr;
  gap: 2px;
  padding: var(--space-1) 0;
  border-top: 1px solid rgb(var(--v-theme-surface));

  dt {
    font-weight: 600;
    color: rgb(var(--v-theme-ink));
  }

  dd {
    margin: 0;
    font-size: var(--text-sm);
    color: rgb(var(--v-theme-on-surface));
  }
}

.voice-status__note {
  margin: var(--space-4) 0 0;
  font-size: var(--text-xs, 0.75rem);
  color: rgb(var(--v-theme-on-surface));
}
</style>
