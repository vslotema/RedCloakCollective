<script setup lang="ts">
import type { RecommendedPerson } from '~/types/recommendation'

const props = defineProps<{
  person: RecommendedPerson
  selected: boolean
}>()

defineEmits<{
  toggle: []
}>()

// The API doesn't return an avatar or bio for recommended people, so these
// are deterministic mock fill-ins (keyed off the real id) until it does.
const mockBios = [
  'Pediatric OT & disability advocate',
  'Physical therapist for kids with CP',
  'AAC specialist & SLP for complex needs',
  'Special education coordinator',
  'Caregiver & parent advocate',
]

const avatar = computed(() => `https://i.pravatar.cc/150?u=${props.person.id}`)
const bio = computed(() => mockBios[props.person.id % mockBios.length])
</script>

<template>
  <div class="follower-card d-flex align-center ga-3">
    <v-avatar size="56" :image="avatar" />
    <div class="follower-card__body">
      <div class="follower-card__name">{{ person.name }}</div>
      <p class="follower-card__meta">{{ bio }}</p>
    </div>
    <v-btn
      :ripple="false"
      variant="outlined"
      rounded="pill"
      color="ink"
      class="follower-card__btn"
      @click="$emit('toggle')"
    >
      {{ selected ? 'Following' : 'Follow' }}
    </v-btn>
  </div>
</template>

<style scoped lang="scss">
.follower-card {
  padding-block: var(--space-4);
  border-bottom: 1px solid rgb(var(--v-theme-border-color));

  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }

  &:first-child {
    padding-top: 0;
  }

  &__body {
    flex: 1 1 auto;
    min-width: 0;
  }

  &__name {
    color: rgb(var(--v-theme-ink));
    font-weight: 700;
    font-size: 1.125rem;
  }

  &__meta {
    margin: var(--space-1) 0 0;
    color: rgb(var(--v-theme-on-background));
  }

  &__btn {
    flex: 0 0 auto;
  }
}
</style>
