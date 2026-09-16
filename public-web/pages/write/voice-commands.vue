<script setup lang="ts">
import VoiceCommandsPanel from "~/components/write/voice/VoiceCommandsPanel.vue";

// Standalone popout window opened from the write page's voice sidebar (see
// VoiceStatusPill.vue) — mirrors the live status over a BroadcastChannel
// rather than touching the microphone itself. No app chrome: this window is
// meant to sit on its own, next to the editor.
definePageMeta({ layout: false, middleware: "auth" });

const { enabled, mode, heardText, lastAction, commandReference } = useVoiceStatusListener();

useHead({ title: "Voice Commands" });
</script>

<template>
  <VoiceCommandsPanel
    :enabled="enabled"
    :mode="mode"
    :heard-text="heardText"
    :last-action="lastAction"
    :command-reference="commandReference"
  />
</template>

<style>
html,
body,
#__nuxt {
  height: 100%;
}
</style>
