<template>
  <div class="page accessible-editor">
    <TopbarNavigation :show-menu-toggle="false" :show-search="false" :show-write-button="false" write-actions/>
    <EditorToolbar />
    <v-main class="editor-shell">
      <div class="editor-shell__main">
        <slot />
      </div>
    </v-main>
    <VoiceStatusPill />
  </div>
</template>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.editor-shell {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
  // Vuetify's v-main transitions its layout-driven padding on every side by
  // default. The left rail is permanent (see EditorToolbar.vue) and should
  // never move, so drop it from the transition — the voice-commands drawer
  // toggling on the right should still animate smoothly.
  transition-property: padding-right;

  &__main {
    flex: 1 1 auto;
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
    background: rgb(var(--v-theme-surface));
  }
}
</style>
