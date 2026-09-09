<script setup lang="ts">
const voice = useArticleVoice();

const {
  enabled,
  mode,
  heardText,
  lastAction,
  panelOpen,
  permissionDenied,
  supported,
  listening,
  commandReference,
} = voice;

const buttonLabel = computed(() => {
  if (!supported.value) return "Voice commands need Chrome, Edge or Safari";
  if (permissionDenied.value)
    return "Microphone blocked — allow it in your browser settings";
  if (!enabled.value) return "Turn on voice commands";
  return mode.value === "dictation"
    ? "Dictating — say “stop” to finish"
    : "Voice on — say “help” for commands";
});

const icon = computed(() =>
  enabled.value && !permissionDenied.value ? "mic" : "mic-off",
);

const toggleClass = computed(() => ({
  "voice-fab__toggle--listening": enabled.value && listening.value,
  "voice-fab__toggle--dictation": enabled.value && mode.value === "dictation",
}));

function onToggle() {
  if (!supported.value) return;
  voice.toggle();
}

function togglePanel() {
  panelOpen.value = !panelOpen.value;
}
</script>

<template>
  <ClientOnly>
    <div class="voice-fab">
      <v-card
        v-if="panelOpen"
        class="voice-fab__panel"
        role="dialog"
        aria-label="Voice commands"
      >
        <div class="voice-fab__panel-head">
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

        <p class="voice-fab__panel-status" aria-hidden="true">
          <span class="voice-fab__mode">{{
            enabled ? (mode === "dictation" ? "Dictating" : "Listening") : "Off"
          }}</span>
          <span v-if="heardText" class="voice-fab__heard">“{{ heardText }}”</span>
          <span v-else-if="lastAction" class="voice-fab__heard">{{ lastAction }}</span>
        </p>

        <div
          v-for="group in commandReference"
          :key="group.title"
          class="voice-fab__group"
        >
          <h4>{{ group.title }}</h4>
          <dl>
            <div v-for="item in group.items" :key="item.say" class="voice-fab__row">
              <dt>{{ item.say }}</dt>
              <dd>{{ item.does }}</dd>
            </div>
          </dl>
        </div>

        <p class="voice-fab__note">
          Speech is processed by your browser’s provider (Google in Chrome).
        </p>
      </v-card>

      <div class="voice-fab__buttons">
        <v-btn
          v-if="supported"
          class="voice-fab__help"
          icon
          size="small"
          variant="tonal"
          :aria-label="panelOpen ? 'Hide voice commands' : 'Show voice commands'"
          @click="togglePanel"
        >
          <v-icon icon="help-circle" :size="18" />
        </v-btn>

        <v-btn
          class="voice-fab__toggle"
          :class="toggleClass"
          :disabled="!supported"
          icon
          size="large"
          variant="elevated"
          :color="enabled && !permissionDenied ? 'ink' : undefined"
          :aria-pressed="enabled"
          :aria-label="buttonLabel"
          @click="onToggle"
        >
          <v-icon :icon="icon" />
          <v-tooltip
            activator="parent"
            location="start"
            content-class="navbar-tooltip"
          >
            {{ buttonLabel }}
          </v-tooltip>
        </v-btn>
      </div>
    </div>
  </ClientOnly>
</template>

<style scoped lang="scss">
.voice-fab {
  position: fixed;
  right: var(--space-4);
  bottom: var(--space-4);
  z-index: 20;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--space-3);
  pointer-events: none;

  > * {
    pointer-events: auto;
  }
}

.voice-fab__buttons {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.voice-fab__toggle {
  position: relative;

  &--listening::after {
    content: "";
    position: absolute;
    inset: -4px;
    border-radius: 50%;
    border: 2px solid rgb(var(--v-theme-primary));
    animation: voice-fab-pulse 1.8s ease-out infinite;
  }

  &--dictation::after {
    border-color: rgb(var(--v-theme-tertiary));
    animation-duration: 1s;
  }
}

@keyframes voice-fab-pulse {
  0% {
    opacity: 0.9;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(1.35);
  }
}

@media (prefers-reduced-motion: reduce) {
  .voice-fab__toggle::after {
    animation: none;
    opacity: 0.6;
  }
}

.voice-fab__panel {
  width: min(20rem, calc(100vw - 2 * var(--space-4)));
  max-height: min(30rem, calc(100vh - 8rem));
  overflow-y: auto;
  padding: var(--space-4);
  background: rgb(var(--v-theme-background));
  border: 1px solid rgb(var(--v-theme-border-color));

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

.voice-fab__panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: var(--text-md, 1rem);
  color: rgb(var(--v-theme-ink));
}

.voice-fab__panel-status {
  margin: var(--space-2) 0 0;
  font-size: var(--text-sm);
  color: rgb(var(--v-theme-on-surface));
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.voice-fab__mode {
  font-weight: 600;
  color: rgb(var(--v-theme-ink));
}

.voice-fab__heard {
  font-style: italic;
}

.voice-fab__row {
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

.voice-fab__note {
  margin: var(--space-4) 0 0;
  font-size: var(--text-xs, 0.75rem);
  color: rgb(var(--v-theme-on-surface));
}
</style>
