<script setup lang="ts">
import { ref } from 'vue'

const search = ref<string | null>(null)
const foundItems = ref<string[]>([])
</script>

<template>
  <v-autocomplete
    v-model="search"
    :items="foundItems"
    class="searchbar"
    variant="solo"
    density="compact"
    rounded="pill"
    placeholder="Search"
    prepend-inner-icon="search"
    menu-icon=""
    flat
    hide-details
    single-line
    auto-select-first
    item-props
  />
</template>

<style scoped lang="scss">
.searchbar {
  width: 240px;
  flex: 0 0 240px;

  :deep(.v-field) {
    box-shadow: none;
  }

  // Match the 40px height of the topbar icon buttons.
  :deep(.v-field__input) {
    min-height: 40px;
    --v-field-input-padding-top: 0;
    --v-field-input-padding-bottom: 0;
  }
}
</style>
