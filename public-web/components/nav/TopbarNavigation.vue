<script setup lang="ts">
withDefaults(
  defineProps<{
    showMenuToggle?: boolean
    showSearch?: boolean
    showWriteButton?: boolean
  }>(),
  {
    showMenuToggle: true,
    showSearch: true,
    showWriteButton: true,
  },
)

defineEmits<{
  toggleNavigation: []
}>()
</script>

<template>
  <v-app-bar class="pl-2 pr-4" color="background" flat style="border-bottom: thin solid #d5d5d5">
    <div class="d-flex align-center">
      <v-btn
        class="menu-btn"
        :class="{ 'menu-btn--hidden': !showMenuToggle }"
        icon="menu"
        size="small"
        color="ink"
        @click="$emit('toggleNavigation')"
      >
      </v-btn>
      <div class="logo">
        <h1 class="text-h6 font-weight-bold mb-0">
          <span class="text-primary">R</span>EDCLOAK COLLECTIVE
        </h1>
      </div>
      <SearchBar v-if="showSearch" class="ml-6" />
    </div>

    <v-spacer />

    <div class="d-flex align-center ga-2">
      <v-btn
        v-if="showWriteButton"
        icon
        variant="flat"
        color="white"
        size="40"
        class="action-btn border"
        to="/write"
      >
        <v-icon icon="edit" :size="20" />
        <v-tooltip
          activator="parent"
          location="bottom"
          content-class="navbar-tooltip"
          text="Write"
        />
      </v-btn>
      <v-btn icon variant="flat" color="white" size="40" class="action-btn border">
        <v-icon icon="bell" :size="20" />
        <v-tooltip
          activator="parent"
          location="bottom"
          content-class="navbar-tooltip"
          text="Notifications"
        />
      </v-btn>
      <v-avatar size="40" image="https://randomuser.me/api/portraits/women/44.jpg" />
    </div>
  </v-app-bar>
</template>

<style scoped lang="scss">
.menu-btn {
  margin-right: 0.375rem;

  // Keeps the space reserved (rather than v-if removing it) so the logo
  // stays in the same spot whether or not the toggle is shown.
  &--hidden {
    visibility: hidden;
    pointer-events: none;
  }
}

// Icon uses the same color as a non-active navigation item's text
// (Vuetify's theme "on-surface" token), while the label stays high-emphasis.
.action-btn :deep(.v-icon) {
  color: rgb(var(--v-theme-on-surface));
}
</style>
