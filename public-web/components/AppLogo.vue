<script setup lang="ts">
import { useTheme } from 'vuetify'
import logoLight from '~/assets/logo/RedCloak-Logo-Light.svg'
import logoDark from '~/assets/logo/RedCloak-Logo-Dark.png'

withDefaults(defineProps<{ height?: number | string }>(), { height: 24 })

const theme = useTheme()
const src = computed(() => theme.global.current.value.dark ? logoDark : logoLight)
</script>

<template>
  <img
    :src="src"
    alt="RedCloak Collective"
    class="app-logo"
    :style="{ height: typeof height === 'number' ? `${height}px` : height }"
  >
</template>

<style scoped>
.app-logo {
  display: block;
  width: auto;
}
</style>
