<template>
  <div class="page accessible-editor">
    <TopbarNavigation
      :show-menu-toggle="false"
      :show-search="false"
      :show-write-button="false"
      :write-actions="true"
    />
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
  }
}
</style>
