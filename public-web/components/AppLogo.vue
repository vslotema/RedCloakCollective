<script setup lang="ts">
import { useTheme } from 'vuetify'
import logoLight from '~/assets/logo/RedCloak-Logo-Light.svg'
import logoDark from '~/assets/logo/RedCloak-Logo-Dark.png'

const props = withDefaults(defineProps<{ height?: number | string }>(), { height: 24 })

const theme = useTheme()
const src = computed(() => theme.global.current.value.dark ? logoDark : logoLight)
// `height` may arrive as a plain HTML attribute (e.g. `height="35"`), which is
// always a string — only append `px` when it's a bare number, so CSS lengths
// like "2rem" still pass through untouched.
const height = computed(() => /^\d+(\.\d+)?$/.test(String(props.height)) ? `${props.height}px` : props.height)
</script>

<template>
  <img
    :src="src"
    alt="RedCloak Collective"
    class="app-logo"
    :style="{ height }"
  >
</template>

<style scoped>
.app-logo {
  display: block;
  width: auto;
}
</style>
