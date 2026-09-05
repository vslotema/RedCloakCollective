<script setup lang="ts">
// This page's HTML can be shared-cached (swr), so login state must never be
// part of the SSR'd shell — same personalization-island pattern as
// FollowButton.vue: check localStorage client-side, after hydration.
const loggedIn = ref(false)

onMounted(() => {
  loggedIn.value = !!localStorage.getItem('auth_token')
})
</script>

<template>
  <v-app-bar color="background" flat style="border-bottom: thin solid #d5d5d5">
    <NuxtLink to="/" class="logo text-decoration-none px-4">
      <h1 class="text-h6 font-weight-bold mb-0">
        <span class="text-primary">R</span>EDCLOAK COLLECTIVE
      </h1>
    </NuxtLink>

    <v-spacer />

    <ClientOnly>
      <div class="d-flex align-center ga-2 pr-4">
        <template v-if="loggedIn">
          <v-btn icon variant="flat" color="white" size="40" class="border" to="/write">
            <v-icon icon="edit" :size="20" />
          </v-btn>
          <v-btn variant="text" to="/">Home</v-btn>
        </template>
        <template v-else>
          <v-btn variant="text" to="/onboarding">Sign in</v-btn>
          <v-btn color="black" rounded="pill" class="font-weight-bold" to="/onboarding">
            Join the community
          </v-btn>
        </template>
      </div>
    </ClientOnly>
  </v-app-bar>
</template>
