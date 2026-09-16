<script setup lang="ts">
import { useTheme } from "vuetify";

const theme = useTheme();
const isDark = computed(() => theme.global.name.value === "dark");

function toggleTheme() {
  const next = isDark.value ? "light" : "dark";
  theme.global.name.value = next;
  if (import.meta.client) localStorage.setItem("theme", next);
}
</script>

<template>
  <v-btn
    icon
    size="small"
    color="ink"
    :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
    @click="toggleTheme"
  >
    <v-icon :icon="isDark ? 'sun' : 'moon'" :size="20" />
    <v-tooltip
      activator="parent"
      location="bottom"
      content-class="navbar-tooltip"
      :text="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
    />
  </v-btn>
</template>
