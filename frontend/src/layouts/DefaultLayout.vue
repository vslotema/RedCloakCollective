<script setup lang="ts">
</script>

<template>
  <v-app-bar color="primary" flat>
    <v-app-bar-title>
      <router-link to="/" class="text-white text-decoration-none">
        RedCloak Collective
      </router-link>
    </v-app-bar-title>
  </v-app-bar>

  <v-main>
    <router-view />
  </v-main>
</template>
