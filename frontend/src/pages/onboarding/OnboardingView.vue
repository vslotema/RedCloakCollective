<script setup lang="ts">
</script>

<template>
  <div class="onboarding-view d-flex flex-column h-screen">
    <div class="header d-flex flex-row align-center justify-space-between px-8 py-6 w-100">
      <div class="logo">
        <h1 class="text-h5 font-weight-bold mb-0"><span class="text-primary">R</span>EDCLOACK COLLECTIVE</h1>
      </div>
      <div class="actions">
        <v-btn class="font-weight-bold" color="black" @click="$router.push('/')">Join the community</v-btn>
      </div>
    </div>
    <v-divider color="black"></v-divider>
    <div class="content d-flex flex-column align-center justify-center flex-grow-1 px-4 py-8">
      <h2 class="text-h2 font-weight-bold mb-4">Discover the Story Behind Every Cloak.</h2>
      <p class="text-subtitle-1 mb-6 text-center">
        Real stories, honest perspectives, and shared experiences from people with special needs, their families, caregivers, and communities.
      </p>
      <v-btn to="/onboarding/step1" class="primary-btn font-weight-bold" color="primary" large>
        Get Started
      </v-btn>
    </div>
  </div>
</template>
