<script setup lang="ts">
// Only ever rendered for a signed-out visitor, or (non-interactive) as the
// article preview's chrome — layouts/public.vue decides whether to mount this
// or the default layout's chrome based on login state.
withDefaults(defineProps<{ interactive?: boolean }>(), { interactive: true })
</script>

<template>
  <v-app-bar color="background" flat style="border-bottom: thin solid rgb(var(--v-theme-border-color))">
    <div class="d-flex align-center ga-8 ml-4">
      <NuxtLink
        v-if="interactive"
        to="/"
        class="d-flex align-center text-decoration-none"
      >
        <AppLogo height="35" />
      </NuxtLink>
      <span v-else class="d-flex align-center">
        <AppLogo height="35" />
      </span>
      <SearchBar :disabled="!interactive" />
    </div>

    <v-spacer />

    <div class="d-flex align-center ga-2 pr-4">
      <v-chip
        v-if="!interactive"
        color="secondary"
        variant="flat"
        size="small"
        class="font-weight-bold text-uppercase"
        style="border-radius: 0.5rem"
      >
        Preview
      </v-chip>
      <v-btn variant="text" to="/onboarding" :disabled="!interactive">Sign in</v-btn>
      <v-btn
        color="black"
        rounded="pill"
        class="font-weight-bold"
        to="/onboarding"
        :disabled="!interactive"
      >
        Sign up
      </v-btn>
      <ThemeToggleButton />
    </div>
  </v-app-bar>
</template>
