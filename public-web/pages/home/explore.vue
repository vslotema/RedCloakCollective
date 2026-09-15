<script setup lang="ts">
definePageMeta({ layout: 'home', middleware: 'auth' })

useSeoMeta({ title: 'Explore' })
</script>

<template>
  <div class="mt-8">
    <ExploreContent />
  </div>
</template>
