<script setup lang="ts">
interface Props {
  variant?: 'centered' | 'wide'
}

const { variant = 'centered' } = defineProps<Props>()
</script>

<template>
  <div class="page-container">
    <v-container :fluid="variant === 'wide'">
      <v-row v-if="variant === 'centered'" justify="center">
        <v-col cols="12" lg="10" xl="8">
          <slot />
        </v-col>
      </v-row>
      <slot v-else />
    </v-container>
  </div>
</template>

<style scoped lang="scss">
.page-container {
  padding: var(--space-2) 0;
  :deep(.v-col-12) {
    padding: 0;
  }
}
</style>
