<template>
  <div class="page accessible-editor">
    <TopbarNavigation show-go-back-button :show-menu-toggle="false" :show-search="false" :show-write-button="false" write-actions/>
    <v-main class="editor-shell">
      <div class="editor-shell__main">
        <slot />
      </div>
    </v-main>
    <EditorToolbar />
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

  &__main {
    flex: 1 1 auto;
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
    background: rgb(var(--v-theme-surface));

    // Clear the fixed left rail (44px + margins) so the centred editor column
    // never sits under it on narrower screens.
    @include respond-to('sm') {
      padding-left: calc(44px + var(--space-2) * 2 + 0.5rem);
    }

    // Clear the fixed bottom footer that the rail becomes on phones.
    @media (max-width: 599px) {
      padding-bottom: calc(44px + var(--space-2) * 2 + 0.5rem);
    }
  }
}
</style>
