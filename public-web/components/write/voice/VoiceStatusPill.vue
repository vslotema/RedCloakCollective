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

// Voice is a /write-only feature and this component is mounted only on that
// page, so leaving it must stop the mic. Full disable (not a pause): the saved
// preference is cleared too, so returning to /write starts with voice off.
// A hard reload doesn't run this hook, so resume-on-reload still works.
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

      <div
        v-if="enabled"
        class="voice-status__pill"
        role="status"
        aria-live="polite"
      >
        <VoiceWaveform class="voice-status__wave" />
        <span class="voice-status__label">
          {{ mode === "dictation" ? "Dictating" : "Listening" }}
          <span v-if="heardText" class="voice-status__heard">“{{ heardText }}”</span>
        </span>
      </div>
    </div>
  </ClientOnly>
</template>

<style scoped lang="scss">
.voice-status__pill {
  position: fixed;
  left: 50%;
  bottom: var(--space-4);
  transform: translateX(-50%);
  z-index: 20;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  max-width: min(90vw, 30rem);
  padding: var(--space-2) var(--space-4);
  background: rgb(var(--v-theme-background));
  border: 1px solid rgb(var(--v-theme-border-color));
  border-radius: 999px;
  box-shadow: 0 2px 12px rgb(0 0 0 / 0.12);

  @media (max-width: 599px) {
    // Clear the fixed toolbar footer.
    bottom: calc(56px + var(--space-3));
  }
}

.voice-status__wave {
  flex-shrink: 0;
}

.voice-status__label {
  font-size: var(--text-sm);
  font-weight: 600;
  color: rgb(var(--v-theme-ink));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
