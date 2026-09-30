<script setup lang="ts">
// Only ever rendered for a signed-out visitor, or (non-interactive) as the
// article preview's chrome — layouts/public.vue decides whether to mount this
// or the default layout's chrome based on login state.
withDefaults(defineProps<{ interactive?: boolean }>(), { interactive: true })

const { isOpen: authDialog, mode: authMode, open: openAuth } = useAuthDialog()
</script>

<template>
  <v-app-bar color="surface" flat style="border-bottom: thin solid rgb(var(--v-theme-border-color))">
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
        rounded="pill"
        variant="flat"
        size="small"
        class="font-weight-bold text-uppercase"
        style="border-radius: 0.5rem"
      >
        Preview
      </v-chip>
      <v-btn variant="text" :disabled="!interactive" @click="openAuth('signin')">Sign in</v-btn>
      <v-btn
        color="primary"
        rounded="pill"
        class="font-weight-bold"
        variant="outlined"
        :disabled="!interactive"
        @click="openAuth('signup')"
      >
        Sign up
      </v-btn>
      <ThemeToggleButton />
    </div>

    <AuthDialog v-if="interactive" v-model="authDialog" v-model:mode="authMode" />
  </v-app-bar>
</template>
