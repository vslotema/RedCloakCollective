<script setup lang="ts">
const props = defineProps<{
  title: string
  shareUrl: string
  listenText: string
  interactive: boolean
}>()

const isListening = ref(false)
const linkCopiedSnackbar = ref(false)
const canListen = ref(false)

onMounted(() => {
  canListen.value = 'speechSynthesis' in window
})

onBeforeUnmount(() => {
  if (isListening.value) window.speechSynthesis.cancel()
})

async function shareArticle() {
  if (navigator.share) {
    try {
      await navigator.share({ title: props.title, url: props.shareUrl })
    } catch {
      return
    }
    return
  }
  await navigator.clipboard.writeText(props.shareUrl)
  linkCopiedSnackbar.value = true
}

function toggleListening() {
  if (isListening.value) {
    window.speechSynthesis.cancel()
    isListening.value = false
    return
  }
  const utterance = new SpeechSynthesisUtterance(`${props.title}. ${props.listenText}`)
  utterance.onend = () => (isListening.value = false)
  utterance.onerror = () => (isListening.value = false)
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(utterance)
  isListening.value = true
}
</script>

<template>
  <div class="action-bar d-flex align-center justify-end ga-2">
    <v-btn
      icon="share-2"
      variant="text"
      size="small"
      aria-label="Share"
      :disabled="!interactive"
      @click="shareArticle"
    />
    <v-btn
      v-if="canListen"
      :icon="isListening ? 'volume-x' : 'volume-2'"
      :color="isListening ? 'primary' : undefined"
      variant="text"
      size="small"
      :aria-label="isListening ? 'Stop listening' : 'Listen to article'"
      @click="toggleListening"
    />
    <v-snackbar v-model="linkCopiedSnackbar" timeout="2000">Link copied</v-snackbar>
  </div>
</template>

<style scoped lang="scss">
.action-bar {
  border-top: thin solid rgb(var(--v-theme-border-color));
  border-bottom: thin solid rgb(var(--v-theme-border-color));
}
</style>
