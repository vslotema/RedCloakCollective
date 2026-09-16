<script setup lang="ts">
import type { CommandGroup, VoiceMode } from './voice-commands'

withDefaults(
  defineProps<{
    enabled: boolean
    mode: VoiceMode
    heardText: string
    lastAction: string
    commandReference: CommandGroup[]
    showPopout?: boolean
    showClose?: boolean
  }>(),
  {
    showPopout: false,
    showClose: false,
  },
)

defineEmits<{
  popout: []
  close: []
}>()
</script>

<template>
  <div class="voice-panel">
    <div class="voice-panel__head">
      <div class="voice-panel__title">
        <strong>Voice Commands</strong>
      </div>
      <div class="voice-panel__head-actions">
        <v-btn
          v-if="showPopout"
          icon
          size="x-small"
          variant="text"
          aria-label="Open in a new window"
          @click="$emit('popout')"
        >
          <v-icon icon="external-link" :size="16" />
        </v-btn>
        <v-btn
          v-if="showClose"
          icon
          size="x-small"
          variant="text"
          aria-label="Close"
          @click="$emit('close')"
        >
          <v-icon icon="x" :size="16" />
        </v-btn>
      </div>
    </div>

    <div
      class="voice-panel__status"
      :class="{ 'voice-panel__status--live': enabled }"
    >
      <span class="voice-panel__status-dot" aria-hidden="true" />
      <span class="voice-panel__status-mode">
        {{ enabled ? (mode === 'dictation' ? 'Dictating' : 'Listening') : 'Off' }}
      </span>
      <template v-if="heardText || lastAction">
        <span class="voice-panel__status-sep" aria-hidden="true">·</span>
        <span class="voice-panel__status-heard">
          {{ heardText ? `“${heardText}”` : lastAction }}
        </span>
      </template>
    </div>

    <v-divider class="voice-panel__divider" />

    <div
      v-for="group in commandReference"
      :key="group.title"
      class="voice-panel__group"
    >
      <h4>{{ group.title }}</h4>
      <div class="voice-panel__cards">
        <div v-for="item in group.items" :key="item.say" class="voice-panel__card">
          <p class="voice-panel__card-say">{{ item.say }}</p>
          <p class="voice-panel__card-does">{{ item.does }}</p>
        </div>
      </div>
    </div>

    <p class="voice-panel__note">
      Speech is processed by your browser’s provider (Google in Chrome).
    </p>
  </div>
</template>

<style scoped lang="scss">
.voice-panel {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  padding: var(--space-4);
  overflow-y: auto;
  background: rgb(var(--v-theme-surface));
  font-family: inherit;
}

.voice-panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.voice-panel__title {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-md, 1rem);
  color: rgb(var(--v-theme-ink));
}

.voice-panel__head-actions {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.voice-panel__status {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: fit-content;
  max-width: 100%;
  margin-top: var(--space-4);
  padding: var(--space-1) var(--space-3);
  font-size: var(--text-sm);
  color: rgb(var(--v-theme-on-surface));
  background: rgb(var(--v-theme-surface-variant));
  border-radius: 999px;

  &--live {
    color: rgb(var(--v-theme-tertiary-darken-1));
    background: color-mix(in srgb, rgb(var(--v-theme-tertiary)) 12%, transparent);
  }
}

.voice-panel__status-dot {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgb(var(--v-theme-on-surface));

  .voice-panel__status--live & {
    background: rgb(var(--v-theme-tertiary));
  }
}

.voice-panel__status-mode {
  flex-shrink: 0;
  font-weight: 600;
}

.voice-panel__status-sep {
  flex-shrink: 0;
}

.voice-panel__status-heard {
  overflow: hidden;
  font-style: italic;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.voice-panel__divider {
  margin: var(--space-4) 0;
  flex-shrink: 0;
}

.voice-panel__group {
  flex-shrink: 0;

  & + & {
    margin-top: var(--space-4);
  }

  h4 {
    margin: 0 0 var(--space-2);
    font-size: var(--text-xs, 0.75rem);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: rgb(var(--v-theme-on-surface));
  }
}

.voice-panel__cards {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.voice-panel__card {
  padding: var(--space-3);
  background: rgb(var(--v-theme-surface-variant));
  border-radius: 0.5rem;
}

.voice-panel__card-say {
  margin: 0;
  font-weight: 700;
  font-size: var(--text-sm);
  color: rgb(var(--v-theme-ink));
}

.voice-panel__card-does {
  margin: 2px 0 0;
  font-size: var(--text-sm);
  color: rgb(var(--v-theme-on-surface));
}

.voice-panel__note {
  flex-shrink: 0;
  margin: var(--space-4) 0 0;
  font-size: var(--text-xs, 0.75rem);
  color: rgb(var(--v-theme-on-surface));
}
</style>
