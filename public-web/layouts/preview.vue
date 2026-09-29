<template>
  <div class="page">
    <!-- Same chrome as the public layout, but non-interactive — this is the
         author-only article preview (pages/write/[id]/preview.vue). Search,
         sign in/up, and the logo must not navigate anywhere; the page's own
         "Back to editor" button is the only way out. The theme toggle still
         works. -->
    <PublicHeader :interactive="false" />
    <v-main class="content">
      <slot />
    </v-main>
  </div>
</template>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.content {
  flex: 1;
}
</style>
