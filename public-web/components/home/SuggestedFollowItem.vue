<script setup lang="ts">
import type { SuggestedFollow } from '~/types/recommendation'

defineProps<{
  person: SuggestedFollow
}>()

const following = ref(false)
</script>

<template>
  <div class="follow-item d-flex ga-3">
    <v-avatar size="44" :image="person.avatar" />
    <div class="follow-item__body">
      <div class="text-ink font-weight-bold text-small">{{ person.name }}</div>
      <p class="follow-item__bio text-x-small">{{ person.bio }}</p>
    </div>
    <v-btn
      variant="outlined"
      rounded="pill"
      size="small"
      color="ink"
      class="follow-item__btn align-self-start"
      @click="following = !following"
    >
      {{ following ? 'Following' : 'Follow' }}
    </v-btn>
  </div>
</template>

<style scoped lang="scss">
.follow-item {
  &__body {
    flex: 1 1 auto;
    min-width: 0;
  }

  &__bio {
    margin: var(--space-1) 0 0;
    color: rgb(var(--v-theme-on-surface));
    line-height: 1.35;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  &__btn {
    flex: 0 0 auto;
  }
}
</style>
