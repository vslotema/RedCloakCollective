<template>
  <div class="page accessible-editor">
    <TopbarNavigation :show-menu-toggle="false" :show-search="false" :show-write-button="false" />
    <v-main class="editor-shell">
      <div class="editor-shell__main">
        <slot />
      </div>
    </v-main>
  </div>
</template>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.editor-shell {
  // flex-basis: auto (not the flex:1 shorthand's 0) so content that outgrows
  // the viewport (e.g. a growing textarea deep inside) can push this — and
  // the page — taller, instead of being capped to .page's current height.
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
  }
}
</style>
