<script setup lang="ts">
import type { RecommendedPerson } from '~/types/recommendation'

const props = defineProps<{
  person: RecommendedPerson
  selected: boolean
}>()

defineEmits<{
  toggle: []
}>()

const initials = computed(() =>
  props.person.name
    .split(/\s+/)
    .map((part) => part[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase(),
)
</script>

<template>
  <div class="follow-item d-flex ga-3">
    <v-avatar size="44" color="secondary">{{ initials }}</v-avatar>
    <div class="follow-item__body">
      <div class="text-ink font-weight-bold text-small">{{ person.name }}</div>
      <p class="follow-item__meta text-x-small">@{{ person.username }}</p>
    </div>
    <v-btn
      variant="outlined"
      rounded="pill"
      size="small"
      color="ink"
      class="follow-item__btn align-self-start"
      @click="$emit('toggle')"
    >
      {{ selected ? 'Following' : 'Follow' }}
    </v-btn>
  </div>
</template>

<style scoped lang="scss">
.follow-item {
  &__body {
    flex: 1 1 auto;
    min-width: 0;
  }

  &__meta {
    margin: var(--space-1) 0 0;
    color: rgb(var(--v-theme-on-surface));
    line-height: 1.35;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__btn {
    flex: 0 0 auto;
  }
}
</style>
